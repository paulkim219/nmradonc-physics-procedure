from curses import set_escdelay
from flask import Flask, redirect, url_for, render_template, request, jsonify, send_from_directory, session
import os
from datetime import datetime
import boto3
from authlib.integrations.flask_client import OAuth
import chatbot
import uuid
import psql


app = Flask(__name__)
app.secret_key = os.urandom(24)
oauth = OAuth(app)

oauth.register(
  name='oidc',
  authority='https://cognito-idp.us-east-2.amazonaws.com/us-east-2_55FsHMpIz',
  client_id='6d2v8us275tvdsfku0tkk4ejps',
  client_secret=os.getenv('CLIENT_SECRET'),
  server_metadata_url='https://cognito-idp.us-east-2.amazonaws.com/us-east-2_55FsHMpIz/.well-known/openid-configuration',
  client_kwargs={'scope': 'email openid phone'}
)

# Simple chatbot logic - you can replace this with OpenAI API, AWS Bedrock, etc.
def get_chatbot_response(user_message, session_id=None):
    """
    Simple chatbot response function.
    Replace this with your actual chatbot implementation (OpenAI, AWS Bedrock, etc.)
    """
    
    if session.get('user') is None:
        # return session_id
        return "Please login to use the chatbot.", None

    
    agent_id = os.getenv('PHYSICS_PROCEDURE_AGENT_ID')


    # user_id = "TEST"
    user_id = session.get('user')['sub']
    # Create a new session id
    
    if session_id is None:
        session_id = str(uuid.uuid4())

    return chatbot.answerQuestions(user_id, agent_id, user_message, session_id)
        

# Main routes
@app.route('/')
def index():
    """Render the main landing page"""
    return render_template('index.html')

@app.route('/login')
def login():
    # Alternate option to redirect to /authorize
    # redirect_uri = url_for('authorize', _external=True)
    # return oauth.oidc.authorize_redirect(redirect_uri)
    return oauth.oidc.authorize_redirect('https://nmradonc.org')

@app.route('/authorize')
def authorize():
    token = oauth.oidc.authorize_access_token()
    user = token['userinfo']
    session['user'] = user
    return redirect(url_for('index'))

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))

@app.route('/physicsprocedure')
def physicsprocedure():
    """Render the physics procedure page"""
    if session.get('user') is None:
        return render_template('physicsprocedure.html')
    else:
        return render_template('physicsprocedure.html', user=session.get('user'))

@app.route('/aimodel')
def aimodel():
    """Render the AI model page"""
    return render_template('aimodel.html')

@app.route('/aboutus')
def aboutus():
    """Render the about us page"""
    return render_template('aboutus.html')

@app.route('/ourstory')
def ourstory():
    """Render the our story page"""
    return render_template('ourstory.html')

# Component route for AngularJS ng-include
@app.route('/components/<filename>')
def component(filename):
    """Serve component templates for AngularJS ng-include"""
    return send_from_directory('templates/components', filename)

# API routes
@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages (legacy endpoint)"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Get chatbot response
        bot_response = get_chatbot_response(user_message)
        
        return jsonify({
            'response': bot_response,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/physicsprocedure/chat', methods=['POST'])
def physicsprocedure_chat():
    """Handle chat messages (API endpoint for frontend)"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        session_id = data.get('session_id', None)
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Get chatbot response
        bot_response, session_id = get_chatbot_response(user_message, session_id)
        
        return jsonify({
            'response': bot_response,
            'session_id': session_id
        })
    
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/physicsprocedure/rating', methods=['POST'])
def physicsprocedure_rating():
    """Handle physics procedure rating"""
    try:
        data = request.get_json()
        qa_history = data.get('qa_history', [])
        rating = int(data.get('rating', ''))
        comment = data.get('comment', '').strip()

        # Get all the messages that the user sent
        user_messages = [msg for msg in qa_history if msg['role'] == 'user']
        # We want to separate the messages with a triple caret
        user_messages = '^^^'.join([msg['message'] for msg in user_messages])

        agent_messages = [msg for msg in qa_history if msg['role'] != 'user']
        agent_messages = '^^^'.join([msg['message'] for msg in agent_messages])

        psql.add_entry(user_messages, agent_messages, rating, comment)

        return jsonify({'message': 'Rating saved successfully'}), 200
        # Save rating to database
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3000)


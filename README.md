# nmradonc-physics-procedure
Python Flask App with ChatGPT-like Chatbot Interface

## Features

- Modern ChatGPT-like user interface
- Real-time chat functionality
- Responsive design for mobile and desktop
- Clean, gradient-based UI design
- Typing indicators for better UX

## Setup Instructions

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Flask application:**
   ```bash
   python app.py
   ```

3. **Access the application:**
   Open your browser and navigate to `http://localhost:5000`

## Project Structure

```
.
├── app.py                 # Flask application with chatbot endpoints
├── templates/
│   └── index.html        # Main chat interface HTML
├── static/
│   ├── style.css         # ChatGPT-like styling
│   └── script.js         # Frontend JavaScript for chat functionality
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Customization

The chatbot currently uses simple rule-based responses. To integrate with AWS Bedrock, OpenAI, or other AI services:

1. Update the `get_chatbot_response()` function in `app.py`
2. Add the necessary API client libraries to `requirements.txt`
3. Configure your API keys (use environment variables for security)

## Example: Integrating with OpenAI

```python
import openai

def get_chatbot_response(user_message):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": user_message}]
    )
    return response.choices[0].message.content
```

## Example: Integrating with AWS Bedrock

```python
import boto3

bedrock = boto3.client('bedrock-runtime')

def get_chatbot_response(user_message):
    # Add your Bedrock integration code here
    pass
```

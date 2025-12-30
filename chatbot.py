import boto3
import os
import json
import uuid
import asyncio


async def invoke_bedrock_agent(agent_id, agent_alias_id, session_id, prompt):
    """
    Invokes Amazon Bedrock Agent with a prompt.
    """

    session = boto3.Session(
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    # 1. Create the client for the Agent Runtime
    client = boto3.client('bedrock-agent-runtime', region_name='us-east-2')

    print(f"Invoking agent with session_id: {session_id}")

    try:
        # 2. Invoke the agent
        response = client.invoke_agent(
            agentId=agent_id,
            agentAliasId=agent_alias_id,
            sessionId=session_id,
            inputText=prompt,
            enableTrace=True
        )

        # 3. Handle the streaming response
        # The response is an EventStream, so we iterate through it
        completion = ""
        for event in response.get('completion'):
            # Look for the 'chunk' event which contains the actual text
            if 'chunk' in event:
                chunk = event['chunk']
                if 'bytes' in chunk:
                    text_chunk = chunk['bytes'].decode('utf-8')
                    print(text_chunk, end='', flush=True)
                    completion += text_chunk

            # if 'trace' in event:
            #     trace = event['trace']
            #     print(f"\n[Trace Event]: {trace}")
                
        return completion, session_id

    except Exception as e:
        print(f"Error invoking agent: {e}")
        return None


## TODO: We want to save a user's session id and their question and answer history to a database
## This will allow us to track the user's progress and provide a more personalized experience
def answerQuestions(user_id, agent_id, prompt, session_id):
    AGENT_ALIAS_ID = "TSTALIASID"

    PROMPT = f"{prompt}"
    # answer = invoke_bedrock_agent(agent_id, AGENT_ALIAS_ID, session_id, PROMPT)
    answer, session_id = asyncio.run(invoke_bedrock_agent(agent_id, AGENT_ALIAS_ID, session_id, PROMPT))


    return answer.strip(), session_id

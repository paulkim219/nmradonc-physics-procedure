import psycopg2
import os

DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')

def connect_to_database():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    return conn


def add_entry(user_messages, agent_messages, rating, comment):
    conn = connect_to_database()
    cursor = conn.cursor()

    query = """
    INSERT INTO question_answers (user_messages, agent_messages, rating, comment)
    VALUES (%s, %s, %s, %s)
    """
    cursor.execute(query, (user_messages, agent_messages, rating, comment))
    conn.commit()
    cursor.close()
    conn.close()


    return cursor.rowcount

    

def get_entries():
    conn = connect_to_database()
    cursor = conn.cursor()  
    query = """
    SELECT * FROM question_answers
    """
    cursor.execute(query)
    entries = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return entries
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

if not MONGODB_URL:
    raise ValueError("MONGODB_URL is not configured")

client = MongoClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=5000
)

database = client["ai_research_assistant"]

chat_collection = database["chats"]
document_collection = database["documents"]
user_collection = database["users"]

try:
    client.admin.command("ping")
    print("MongoDB Atlas connected successfully")
except Exception as error:
    print("MongoDB connection failed")
    print(error)
# db.py
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database()  # uses DB from URI
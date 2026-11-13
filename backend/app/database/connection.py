from pymongo import MongoClient
from pymongo.errors import PyMongoError

from app.core.config import MONGODB_URI, DATABASE_NAME


client = None
db = None


def connect_to_database():

    global client, db

    if not MONGODB_URI:
        raise ValueError("MongoDB URI is missing")

    try:

        client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )

        client.admin.command("ping")

        db = client[DATABASE_NAME]
        db.users.create_index(
            "email",
            unique=True
        )
        db.companies.create_index(
            "created_by"
        )
        db.job_drives.create_index(
            "created_by"
        )
        db.job_drives.create_index(
            "company_id"
        )
        db.candidates.create_index("created_by")
        db.candidates.create_index("job_drive_id")
        db.candidates.create_index([
            ("job_drive_id", 1),
            ("email", 1)
        ])
        db.resume_analyses.create_index("created_by")

        db.resume_analyses.create_index(
            [
                ("candidate_id", 1),
                ("created_at", -1)
            ]
        )
        print("MongoDB connected successfully!")

    except PyMongoError as error:

        print("MongoDB connection failed:", error)

        raise


def close_database_connection():

    global client

    if client:
        client.close()
        print("MongoDB connection closed")


def get_database():

    if db is None:
        raise RuntimeError("Database is not connected")

    return db
import bcrypt
import os
import jwt

from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

from app.services.database_service import user_collection

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

def create_user(name, email, password):

    email = email.lower().strip()

    existing_user = user_collection.find_one({
        "email": email
    })

    if existing_user:
        return None

    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )

    result = user_collection.insert_one({
        "name": name.strip(),
        "email": email,
        "password": hashed_password
    })

    return {
        "id": str(result.inserted_id),
        "name": name.strip(),
        "email": email
    }


def authenticate_user(email, password):

    email = email.lower().strip()

    user = user_collection.find_one({
        "email": email
    })

    if not user:
        return None

    password_valid = bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"]
    )

    if not password_valid:
        return None

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"]
    }
def create_access_token(user):

    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }

    token = jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

    return token

def verify_access_token(token):

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        return {
            "user_id": payload["user_id"],
            "email": payload["email"]
        }

    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None
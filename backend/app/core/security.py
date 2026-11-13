from pwdlib import PasswordHash
from datetime import datetime, timedelta, timezone
import jwt

from app.core.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)


# Create password hashing object
password_hasher = PasswordHash.recommended()


# Hash a password
def hash_password(password: str):

    return password_hasher.hash(password)


# Verify a password
def verify_password(
    plain_password: str,
    hashed_password: str
):

    return password_hasher.verify(
        plain_password,
        hashed_password
    )


# Generate JWT access token
def create_access_token(user_id: str):

    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not configured")

    expiration_time = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": user_id,
        "exp": expiration_time
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token
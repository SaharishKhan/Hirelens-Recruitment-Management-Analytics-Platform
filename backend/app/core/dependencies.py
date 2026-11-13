from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from bson import ObjectId
from bson.errors import InvalidId

import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import SECRET_KEY, ALGORITHM
from app.database.connection import get_database


# Extract Bearer token from request header
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    # Check whether token was provided
    if credentials is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    try:

        # Decode and verify JWT
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        # Get user ID from token
        user_id = payload.get("sub")

        if not user_id:
            raise InvalidTokenError("Missing subject")

    except InvalidTokenError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Convert string ID into MongoDB ObjectId
    try:

        object_id = ObjectId(user_id)

    except (InvalidId, TypeError):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user information"
        )

    # Find user in MongoDB
    db = get_database()

    user = db["users"].find_one({
        "_id": object_id
    })

    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # Return authenticated user
    return user
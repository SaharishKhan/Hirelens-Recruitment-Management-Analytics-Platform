from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timezone
from app.core.dependencies import get_current_user

from app.database.connection import get_database

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    TokenResponse
)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# -------------------------------
# HR REGISTRATION
# -------------------------------

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(data: RegisterRequest):

    db = get_database()

    users_collection = db["users"]

    email = str(data.email).lower()

    # Check if email already exists
    existing_user = users_collection.find_one({
        "email": email
    })

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = hash_password(data.password)

    # Create user document
    user = {
        "name": data.name.strip(),
        "email": email,
        "password_hash": hashed_password,
        "created_at": datetime.now(timezone.utc)
    }

    try:

        result = users_collection.insert_one(user)

    except DuplicateKeyError:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Return safe user information
    return {
        "id": str(result.inserted_id),
        "name": user["name"],
        "email": user["email"]
    }


# -------------------------------
# HR LOGIN
# -------------------------------

@router.post(
    "/login",
    response_model=TokenResponse
)
def login_user(data: LoginRequest):

    db = get_database()

    users_collection = db["users"]

    email = str(data.email).lower()

    # Find user by email
    user = users_collection.find_one({
        "email": email
    })

    # Check whether user exists
    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify entered password
    password_is_valid = verify_password(
        data.password,
        user["password_hash"]
    )

    if not password_is_valid:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Generate JWT token
    access_token = create_access_token(
        str(user["_id"])
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
# -------------------------------
# GET CURRENT LOGGED-IN USER
# -------------------------------

@router.get("/me", response_model=UserResponse)
def get_logged_in_user(
    current_user: dict = Depends(get_current_user)
):

    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"]
    }
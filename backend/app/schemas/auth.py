from pydantic import BaseModel, EmailStr, Field


# Registration request
class RegisterRequest(BaseModel):

    name: str = Field(min_length=2, max_length=80)

    email: EmailStr

    password: str = Field(min_length=8, max_length=128)


# Login request
class LoginRequest(BaseModel):

    email: EmailStr

    password: str


# User information returned to frontend
class UserResponse(BaseModel):

    id: str

    name: str

    email: EmailStr


# JWT response
class TokenResponse(BaseModel):

    access_token: str

    token_type: str
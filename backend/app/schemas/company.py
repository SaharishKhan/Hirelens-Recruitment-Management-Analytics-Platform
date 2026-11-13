from pydantic import BaseModel, Field, EmailStr
from typing import Optional


# Data required when creating a company
class CompanyCreate(BaseModel):

    name: str = Field(min_length=2, max_length=100)

    industry: Optional[str] = None

    website: Optional[str] = None

    location: Optional[str] = None

    contact_person: Optional[str] = None

    contact_email: Optional[EmailStr] = None

    contact_phone: Optional[str] = None

    description: Optional[str] = None


# Data allowed when updating a company
class CompanyUpdate(BaseModel):

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    industry: Optional[str] = None

    website: Optional[str] = None

    location: Optional[str] = None

    contact_person: Optional[str] = None

    contact_email: Optional[EmailStr] = None

    contact_phone: Optional[str] = None

    description: Optional[str] = None
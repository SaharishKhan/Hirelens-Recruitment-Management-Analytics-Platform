from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal


class CandidateUpdate(BaseModel):

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    email: Optional[EmailStr] = None

    phone: Optional[str] = None

    status: Optional[Literal[
        "Applied",
        "Shortlisted",
        "Rejected",
        "Selected"
    ]] = None
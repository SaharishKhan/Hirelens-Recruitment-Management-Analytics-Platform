from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class JobDriveCreate(BaseModel):
    company_id: str

    job_title: str = Field(min_length=2, max_length=150)
    job_description: str = Field(min_length=20)
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: Optional[list[str]] = Field(default_factory=list)

    experience_min: int = Field(default=0, ge=0)
    experience_max: Optional[int] = Field(default=None, ge=0)

    location: Optional[str] = None

    employment_type: Literal[
        "Full-time",
        "Part-time",
        "Internship",
        "Contract"
    ] = "Full-time"

    openings: int = Field(default=1, ge=1)

    deadline: Optional[datetime] = None

    status: Literal[
        "Draft",
        "Open",
        "Paused",
        "Closed"
    ] = "Draft"


class JobDriveUpdate(BaseModel):
    job_title: Optional[str] = Field(default=None, min_length=2, max_length=150)
    job_description: Optional[str] = Field(default=None, min_length=20)

    required_skills: Optional[list[str]] = None
    preferred_skills: Optional[list[str]] = None

    experience_min: Optional[int] = Field(default=None, ge=0)
    experience_max: Optional[int] = Field(default=None, ge=0)

    location: Optional[str] = None

    employment_type: Optional[Literal[
        "Full-time",
        "Part-time",
        "Internship",
        "Contract"
    ]] = None

    openings: Optional[int] = Field(default=None, ge=1)

    deadline: Optional[datetime] = None

    status: Optional[Literal[
        "Draft",
        "Open",
        "Paused",
        "Closed"
    ]] = None
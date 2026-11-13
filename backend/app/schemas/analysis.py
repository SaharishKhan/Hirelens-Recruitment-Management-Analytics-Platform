
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Any, Dict, List, Optional


# --------------------------------------------------
# 1. Matched Skill Schema
# --------------------------------------------------

class MatchedSkill(BaseModel):

    model_config = ConfigDict(extra="forbid")

    skill: str = Field(
        min_length=1,
        max_length=100
    )

    evidence: str = Field(
        min_length=1,
        max_length=1000
    )


# --------------------------------------------------
# 2. Missing or Unverified Skill Schema
# --------------------------------------------------

class MissingSkill(BaseModel):

    model_config = ConfigDict(extra="forbid")

    skill: str = Field(
        min_length=1,
        max_length=100
    )

    reason: str = Field(
        min_length=1,
        max_length=500
    )


# --------------------------------------------------
# 3. Main Resume Analysis Response Schema
# --------------------------------------------------

class ResumeAnalysisResponse(BaseModel):

    model_config = ConfigDict(extra="forbid")

    matching_score: int = Field(
        ge=0,
        le=100
    )
    score_breakdown: Optional[Dict[str, Any]] = None
    summary: str = Field(
        min_length=10,
        max_length=2000
    )

    matched_skills: List[MatchedSkill] = Field(
        max_length=50
    )

    missing_or_unverified_skills: List[MissingSkill] = Field(
        max_length=50
    )

    relevant_experience: str = Field(
        min_length=1,
        max_length=2000
    )

    strengths: List[str] = Field(
        max_length=20
    )

    areas_to_verify: List[str] = Field(
        max_length=20
    )

    extracted_candidate_skills: List[str] = Field(
        max_length=100
    )

    final_verdict: str = Field(
        min_length=1,
        max_length=500
    )

    @field_validator(
        "summary",
        "relevant_experience",
        "final_verdict"
    )
    @classmethod
    def clean_text_fields(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be empty.")

        return value

    @field_validator(
        "strengths",
        "areas_to_verify",
        "extracted_candidate_skills"
    )
    @classmethod
    def clean_list_items(cls, values):

        cleaned_values = []

        for item in values:
            item = item.strip()

            if not item:
                raise ValueError("List items cannot be empty.")

            cleaned_values.append(item)

        return cleaned_values


# --------------------------------------------------
# 4. Analysis Database Response Schema
# --------------------------------------------------

class ResumeAnalysisDatabaseResponse(BaseModel):

    id: str
    candidate_id: str
    job_drive_id: str

    analysis: ResumeAnalysisResponse

    model: str
    created_at: str

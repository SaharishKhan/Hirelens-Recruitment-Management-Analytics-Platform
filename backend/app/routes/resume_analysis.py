
from pathlib import Path
from datetime import datetime, timezone
from typing import List
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.database.connection import get_database
from app.services.matching_score import calculate_matching_score

from app.services.resume_parser import (
    parse_resume,
    ResumeParsingError
)

from app.services.groq_service import analyze_resume_with_groq,GROQ_MODEL

from app.services.analysis_validator import (
    validate_analysis_response,
    AnalysisValidationError
)

from app.schemas.analysis import (
    ResumeAnalysisDatabaseResponse
)


# --------------------------------------------------
# Router Configuration
# --------------------------------------------------

router = APIRouter(
    prefix="/api/resume-analysis",
    tags=["Resume Analysis"]
)

logger = logging.getLogger(__name__)

# Resume storage directory
STORAGE_DIR = (
    Path(__file__).resolve().parents[2]
    / "storage"
    / "resumes"
)


# --------------------------------------------------
# Helper: Validate MongoDB ObjectId
# --------------------------------------------------

def validate_object_id(id_value: str):

    if not ObjectId.is_valid(id_value):
        raise HTTPException(
            status_code=400,
            detail="Invalid ID format."
        )

    return ObjectId(id_value)


# --------------------------------------------------
# Helper: Get Candidate and Verify Ownership
# --------------------------------------------------

def get_owned_candidate(
    db,
    candidate_id: ObjectId,
    current_user
):

    candidate = db.candidates.find_one({
        "_id": candidate_id,
        "created_by": current_user["_id"]
    })

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found."
        )

    return candidate


# --------------------------------------------------
# Helper: Get Job Drive and Verify Ownership
# --------------------------------------------------

def get_owned_job_drive(
    db,
    job_drive_id,
    current_user
):

    # Candidate records may store the job drive ID
    # as either a MongoDB ObjectId or a string.
    if isinstance(job_drive_id, ObjectId):
        object_id = job_drive_id
    elif ObjectId.is_valid(str(job_drive_id)):
        object_id = ObjectId(str(job_drive_id))
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid job drive ID."
        )

    job_drive = db.job_drives.find_one({
        "_id": object_id,
        "created_by": current_user["_id"]
    })

    if not job_drive:
        raise HTTPException(
            status_code=404,
            detail="Associated job drive not found."
        )

    return job_drive


# --------------------------------------------------
# Helper: Format Analysis Document
# --------------------------------------------------

def format_analysis(analysis):

    return {
        "id": str(analysis["_id"]),
        "candidate_id": str(analysis["candidate_id"]),
        "job_drive_id": str(analysis["job_drive_id"]),
        "analysis": analysis["analysis"],
        "model": analysis["model"],
        "created_at": analysis["created_at"].isoformat()
    }


# --------------------------------------------------
# POST: Analyze Candidate Resume
# --------------------------------------------------

@router.post(
    "/{candidate_id}",
    response_model=ResumeAnalysisDatabaseResponse,
    status_code=status.HTTP_201_CREATED
)
def create_resume_analysis(
    candidate_id: str,
    current_user=Depends(get_current_user)
):

    db = get_database()

    # 1. Validate candidate ID
    candidate_object_id = validate_object_id(candidate_id)

    # 2. Find candidate belonging to logged-in user
    candidate = get_owned_candidate(
        db,
        candidate_object_id,
        current_user
    )

    # 3. Find associated job drive
    job_drive = get_owned_job_drive(
        db,
        candidate["job_drive_id"],
        current_user
    )

    # 4. Get saved resume filename
    storage_name = candidate.get("resume_storage_name")

    if not storage_name:
        raise HTTPException(
            status_code=404,
            detail="Candidate resume is not available."
        )

    # Prevent path traversal:
    # only accept the stored filename, not a path.
    if Path(storage_name).name != storage_name:
        raise HTTPException(
            status_code=400,
            detail="Invalid stored resume filename."
        )

    resume_path = STORAGE_DIR / storage_name

    if not resume_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Resume file could not be found."
        )

    # 5. Get job description
    job_description = job_drive.get("job_description", "").strip()

    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description is missing."
        )

    # Include required skills if available.
    required_skills = job_drive.get("required_skills", [])

    if isinstance(required_skills, list) and required_skills:
        job_description += (
            "\n\nRequired Skills:\n"
            + ", ".join(str(skill) for skill in required_skills)
        )

    elif isinstance(required_skills, str) and required_skills.strip():
        job_description += (
            "\n\nRequired Skills:\n"
            + required_skills.strip()
        )

    # Include preferred skills if available.
    preferred_skills = job_drive.get("preferred_skills", [])

    if isinstance(preferred_skills, list) and preferred_skills:
        job_description += (
            "\n\nPreferred Skills / Strengths Skills:\n"
            + ", ".join(str(skill) for skill in preferred_skills)
        )

    elif isinstance(preferred_skills, str) and preferred_skills.strip():
        job_description += (
            "\n\nPreferred Skills / Strengths Skills:\n"
            + preferred_skills.strip()
        )

    # 6. Extract resume text
    try:

        resume_text = parse_resume(str(resume_path))

    except ResumeParsingError as error:

        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    # 7. Send resume and job description to Groq
    try:

        analysis_result = analyze_resume_with_groq(
            resume_text=resume_text,
            job_description=job_description
        )

        # 8. Validate response again at the API boundary.
        # groq_service.py should already validate it;
        # this provides an additional safety check.
        validated_analysis = validate_analysis_response(
            analysis_result
        )

    except AnalysisValidationError as error:

        logger.warning("Resume analysis validation failed: %s", error)

        raise HTTPException(
            status_code=502,
            detail="AI returned an invalid analysis response."
        )

    except Exception:

        logger.exception(
            "Resume analysis failed for candidate %s",
            candidate_id
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to complete AI resume analysis."
        )
    # 8.5 Calculate deterministic matching score
    analysis_data = validated_analysis.model_dump()

    score_details = calculate_matching_score(
        analysis=analysis_data,
        required_skills=job_drive.get("required_skills", []),
        strength_skills=job_drive.get("preferred_skills", [])
    )

    # Save the full breakdown and override the AI's raw matching_score
    # (falls back to AI score if required_skills are not configured)
    analysis_data["score_breakdown"] = score_details

    if score_details["matching_score"] is not None:
        analysis_data["matching_score"] = round(score_details["matching_score"])

    # 9. Prepare MongoDB document
    analysis_document = {

        "candidate_id": candidate["_id"],

        "job_drive_id": job_drive["_id"],

        "created_by": current_user["_id"],

        "analysis": analysis_data,

        "model": GROQ_MODEL,

        "created_at": datetime.now(timezone.utc)
    }

    # 10. Save analysis in MongoDB
    try:

        result = db.resume_analyses.insert_one(
            analysis_document
        )

    except Exception:

        logger.exception(
            "Failed to save resume analysis for candidate %s",
            candidate_id
        )

        raise HTTPException(
            status_code=500,
            detail="Analysis completed but could not be saved."
        )

    # 11. Retrieve saved document
    saved_analysis = db.resume_analyses.find_one({
        "_id": result.inserted_id
    })

    return format_analysis(saved_analysis)


# --------------------------------------------------
# GET: Retrieve Latest Resume Analysis
# --------------------------------------------------

@router.get(
    "/{candidate_id}",
    response_model=ResumeAnalysisDatabaseResponse
)
def get_latest_resume_analysis(
    candidate_id: str,
    current_user=Depends(get_current_user)
):

    db = get_database()

    candidate_object_id = validate_object_id(candidate_id)

    candidate = get_owned_candidate(
        db,
        candidate_object_id,
        current_user
    )

    analysis = db.resume_analyses.find_one(
        {
            "candidate_id": candidate["_id"],
            "created_by": current_user["_id"]
        },
        sort=[("created_at", -1)]
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="No resume analysis found for this candidate."
        )

    return format_analysis(analysis)


# --------------------------------------------------
# GET: Retrieve Analysis History
# --------------------------------------------------

@router.get(
    "/{candidate_id}/history",
    response_model=List[ResumeAnalysisDatabaseResponse]
)
def get_resume_analysis_history(
    candidate_id: str,
    current_user=Depends(get_current_user)
):

    db = get_database()

    candidate_object_id = validate_object_id(candidate_id)

    candidate = get_owned_candidate(
        db,
        candidate_object_id,
        current_user
    )

    analyses = db.resume_analyses.find(
        {
            "candidate_id": candidate["_id"],
            "created_by": current_user["_id"]
        }
    ).sort("created_at", -1)

    return [
        format_analysis(analysis)
        for analysis in analyses
    ]

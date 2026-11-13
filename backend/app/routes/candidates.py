import io
import re
import uuid
import zipfile

from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from pydantic import EmailStr, TypeAdapter, ValidationError

from app.database.connection import get_database
from app.core.dependencies import get_current_user
from app.schemas.candidate import CandidateUpdate


router = APIRouter(
    prefix="/api/candidates",
    tags=["Candidate Management"]
)


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

MAX_RESUME_SIZE = 5 * 1024 * 1024  # 5 MB

STORAGE_DIR = (
    Path(__file__).resolve().parents[2]
    / "storage"
    / "resumes"
)

STORAGE_DIR.mkdir(parents=True, exist_ok=True)

EMAIL_VALIDATOR = TypeAdapter(EmailStr)


# --------------------------------------------------
# HELPER: FORMAT CANDIDATE
# --------------------------------------------------

def format_candidate(candidate):

    candidate["_id"] = str(candidate["_id"])
    candidate["job_drive_id"] = str(candidate["job_drive_id"])
    candidate["created_by"] = str(candidate["created_by"])

    if isinstance(candidate.get("created_at"), datetime):
        candidate["created_at"] = candidate["created_at"].isoformat()

    if isinstance(candidate.get("updated_at"), datetime):
        candidate["updated_at"] = candidate["updated_at"].isoformat()

    return candidate


# --------------------------------------------------
# HELPER: CHECK JOB DRIVE OWNERSHIP
# --------------------------------------------------

def get_owned_job_drive(db, job_drive_id, current_user):

    if not ObjectId.is_valid(job_drive_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid job drive ID"
        )

    job_drive = db.job_drives.find_one({
        "_id": ObjectId(job_drive_id),
        "created_by": current_user["_id"]
    })

    if not job_drive:
        raise HTTPException(
            status_code=404,
            detail="Job drive not found or access denied"
        )

    return job_drive


# --------------------------------------------------
# HELPER: VALIDATE AND STORE RESUME
# --------------------------------------------------

async def save_resume(upload: UploadFile):

    if not upload.filename:
        raise HTTPException(
            status_code=400,
            detail="Resume filename is missing"
        )

    # Extract only the filename, not any supplied directory path.
    original_name = upload.filename.replace("\\", "/").split("/")[-1]

    # Remove unsafe characters from the displayed filename.
    original_name = re.sub(
        r"[^A-Za-z0-9._ -]",
        "_",
        original_name
    )

    extension = Path(original_name).suffix.lower()

    if extension not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX resumes are allowed"
        )

    # Read at most 5 MB + 1 byte to detect oversized files.
    content = await upload.read(MAX_RESUME_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded resume is empty"
        )

    if len(content) > MAX_RESUME_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Resume size must not exceed 5 MB"
        )

    # Verify the actual file format.
    if extension == ".pdf":

        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail="Invalid PDF file"
            )

        content_type = "application/pdf"

    else:

        try:
            with zipfile.ZipFile(io.BytesIO(content)) as docx_file:

                file_names = set(docx_file.namelist())

                if (
                    "[Content_Types].xml" not in file_names
                    or "word/document.xml" not in file_names
                ):
                    raise ValueError("Invalid DOCX structure")

        except (zipfile.BadZipFile, ValueError):
            raise HTTPException(
                status_code=400,
                detail="Invalid DOCX file"
            )

        content_type = (
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        )

    # Generate a unique filename.
    storage_name = f"{uuid.uuid4().hex}{extension}"

    file_path = STORAGE_DIR / storage_name

    try:
        with file_path.open("xb") as resume_file:
            resume_file.write(content)

    except OSError:
        raise HTTPException(
            status_code=500,
            detail="Unable to store resume"
        )

    return {
        "resume_file_name": original_name,
        "resume_storage_name": storage_name,
        "resume_content_type": content_type,
        "resume_size": len(content)
    }


# --------------------------------------------------
# HELPER: DELETE STORED RESUME
# --------------------------------------------------

def remove_resume(storage_name):

    if not storage_name:
        return

    # Only permit generated filenames inside our storage directory.
    if Path(storage_name).name != storage_name:
        return

    file_path = STORAGE_DIR / storage_name

    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        # The database record can still be deleted.
        # Log this error in production for cleanup.
        pass


# --------------------------------------------------
# CREATE CANDIDATE + UPLOAD RESUME
# --------------------------------------------------

@router.post("/")
async def create_candidate(
    job_drive_id: str = Form(...),
    name: str = Form(..., min_length=2, max_length=100),
    email: str = Form(...),
    phone: Optional[str] = Form(default=None),
    resume: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    # Validate email.
    try:
        email = str(EMAIL_VALIDATOR.validate_python(email))
    except ValidationError:
        raise HTTPException(
            status_code=422,
            detail="Invalid candidate email address"
        )

    # Verify that the HR user owns this Job Drive.
    get_owned_job_drive(db, job_drive_id, current_user)

    # Prevent duplicate candidate registration in the same drive.
    existing_candidate = db.candidates.find_one({
        "job_drive_id": ObjectId(job_drive_id),
        "email": email,
        "created_by": current_user["_id"]
    })

    if existing_candidate:
        raise HTTPException(
            status_code=409,
            detail="Candidate already exists in this job drive"
        )

    # Validate and store resume.
    resume_data = await save_resume(resume)

    now = datetime.now(timezone.utc)

    candidate = {
        "name": name.strip(),
        "email": email,
        "phone": phone.strip() if phone else None,

        "job_drive_id": ObjectId(job_drive_id),

        **resume_data,

        "status": "Applied",

        "created_by": current_user["_id"],

        "created_at": now,
        "updated_at": now
    }

    try:
        result = db.candidates.insert_one(candidate)

        candidate["_id"] = result.inserted_id

    except Exception:
        # Avoid leaving an unreferenced uploaded file.
        remove_resume(resume_data["resume_storage_name"])
        raise HTTPException(
            status_code=500,
            detail="Unable to create candidate"
        )

    return {
        "message": "Candidate created successfully",
        "candidate": format_candidate(candidate)
    }


# --------------------------------------------------
# GET ALL CANDIDATES
# --------------------------------------------------

@router.get("/")
def get_candidates(
    job_drive_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    query = {
        "created_by": current_user["_id"]
    }

    if job_drive_id:

        get_owned_job_drive(db, job_drive_id, current_user)

        query["job_drive_id"] = ObjectId(job_drive_id)

    candidates = list(
        db.candidates.find(query).sort("created_at", -1)
    )

    return {
        "total": len(candidates),
        "candidates": [
            format_candidate(candidate)
            for candidate in candidates
        ]
    }


# --------------------------------------------------
# GET ONE CANDIDATE
# --------------------------------------------------

@router.get("/{candidate_id}")
def get_candidate(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid candidate ID"
        )

    candidate = db.candidates.find_one({
        "_id": ObjectId(candidate_id),
        "created_by": current_user["_id"]
    })

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found or access denied"
        )

    return format_candidate(candidate)


# --------------------------------------------------
# UPDATE CANDIDATE DETAILS
# --------------------------------------------------

@router.put("/{candidate_id}")
def update_candidate(
    candidate_id: str,
    data: CandidateUpdate,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid candidate ID"
        )

    existing_candidate = db.candidates.find_one({
        "_id": ObjectId(candidate_id),
        "created_by": current_user["_id"]
    })

    if not existing_candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found or access denied"
        )

    updates = data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    # Required fields cannot be changed to null or blank.
    for field in ["name", "email", "status"]:
        if field in updates:
            if updates[field] is None or (
                isinstance(updates[field], str)
                and not updates[field].strip()
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"{field} cannot be empty"
                )

    if "name" in updates:
        updates["name"] = updates["name"].strip()

    if "email" in updates:
        updates["email"] = str(updates["email"])

        duplicate = db.candidates.find_one({
            "_id": {"$ne": ObjectId(candidate_id)},
            "job_drive_id": existing_candidate["job_drive_id"],
            "email": updates["email"],
            "created_by": current_user["_id"]
        })

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="Another candidate with this email already exists in this job drive"
            )

    if "phone" in updates and updates["phone"] is not None:
        updates["phone"] = updates["phone"].strip() or None

    updates["updated_at"] = datetime.now(timezone.utc)

    db.candidates.update_one(
        {
            "_id": ObjectId(candidate_id),
            "created_by": current_user["_id"]
        },
        {"$set": updates}
    )

    updated_candidate = db.candidates.find_one({
        "_id": ObjectId(candidate_id)
    })

    return {
        "message": "Candidate updated successfully",
        "candidate": format_candidate(updated_candidate)
    }


# --------------------------------------------------
# REPLACE CANDIDATE RESUME
# --------------------------------------------------

@router.put("/{candidate_id}/resume")
async def replace_candidate_resume(
    candidate_id: str,
    resume: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid candidate ID"
        )

    candidate = db.candidates.find_one({
        "_id": ObjectId(candidate_id),
        "created_by": current_user["_id"]
    })

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found or access denied"
        )

    # Save new file first. Keep the old file if validation fails.
    resume_data = await save_resume(resume)

    db.candidates.update_one(
        {"_id": ObjectId(candidate_id)},
        {
            "$set": {
                **resume_data,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    # Remove old file after the database is updated.
    remove_resume(candidate.get("resume_storage_name"))

    updated_candidate = db.candidates.find_one({
        "_id": ObjectId(candidate_id)
    })

    return {
        "message": "Resume replaced successfully",
        "candidate": format_candidate(updated_candidate)
    }


# --------------------------------------------------
# AUTHENTICATED RESUME DOWNLOAD
# --------------------------------------------------

@router.get("/{candidate_id}/resume")
def download_candidate_resume(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid candidate ID"
        )

    candidate = db.candidates.find_one({
        "_id": ObjectId(candidate_id),
        "created_by": current_user["_id"]
    })

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found or access denied"
        )

    storage_name = candidate.get("resume_storage_name")

    if not storage_name or Path(storage_name).name != storage_name:
        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    file_path = STORAGE_DIR / storage_name

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Resume file is missing from storage"
        )

    return FileResponse(
        path=file_path,
        media_type=candidate.get(
            "resume_content_type",
            "application/octet-stream"
        ),
        filename=candidate.get(
            "resume_file_name",
            "resume"
        ),
        content_disposition_type="attachment",
        headers={
            "X-Content-Type-Options": "nosniff"
        }
    )


# --------------------------------------------------
# DELETE CANDIDATE
# --------------------------------------------------

@router.delete("/{candidate_id}")
def delete_candidate(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid candidate ID"
        )

    candidate = db.candidates.find_one({
        "_id": ObjectId(candidate_id),
        "created_by": current_user["_id"]
    })

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found or access denied"
        )

    result = db.candidates.delete_one({
        "_id": ObjectId(candidate_id),
        "created_by": current_user["_id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    # Remove the corresponding resume file.
    remove_resume(candidate.get("resume_storage_name"))

    return {
        "message": "Candidate and associated resume deleted successfully"
    }
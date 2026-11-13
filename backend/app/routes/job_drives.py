from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone

from app.database.connection import get_database
from app.core.dependencies import get_current_user
from app.schemas.job_drive import JobDriveCreate, JobDriveUpdate


router = APIRouter(
    prefix="/api/job-drives",
    tags=["Job Drive Management"]
)


def format_job_drive(drive):
    drive["_id"] = str(drive["_id"])
    drive["company_id"] = str(drive["company_id"])
    drive["created_by"] = str(drive["created_by"])

    if isinstance(drive.get("created_at"), datetime):
        drive["created_at"] = drive["created_at"].isoformat()

    if isinstance(drive.get("updated_at"), datetime):
        drive["updated_at"] = drive["updated_at"].isoformat()

    if isinstance(drive.get("deadline"), datetime):
        drive["deadline"] = drive["deadline"].isoformat()

    return drive


# CREATE JOB DRIVE
@router.post("/")
def create_job_drive(
    data: JobDriveCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()

    if not ObjectId.is_valid(data.company_id):
        raise HTTPException(status_code=400, detail="Invalid company ID")

    company = db.companies.find_one({
        "_id": ObjectId(data.company_id),
        "created_by": current_user["_id"]
    })

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found or access denied"
        )

    if (
        data.experience_max is not None
        and data.experience_max < data.experience_min
    ):
        raise HTTPException(
            status_code=400,
            detail="Maximum experience cannot be less than minimum experience"
        )

    now = datetime.now(timezone.utc)

    job_drive = data.model_dump()
    job_drive["company_id"] = ObjectId(data.company_id)
    job_drive["created_by"] = current_user["_id"]
    job_drive["created_at"] = now
    job_drive["updated_at"] = now

    result = db.job_drives.insert_one(job_drive)

    created_drive = db.job_drives.find_one({
        "_id": result.inserted_id
    })

    return {
        "message": "Job drive created successfully",
        "job_drive": format_job_drive(created_drive)
    }


# GET ALL JOB DRIVES
@router.get("/")
def get_job_drives(
    current_user: dict = Depends(get_current_user)
):
    db = get_database()

    drives = list(
        db.job_drives.find({
            "created_by": current_user["_id"]
        }).sort("created_at", -1)
    )

    return {
        "total": len(drives),
        "job_drives": [
            format_job_drive(drive) for drive in drives
        ]
    }


# GET ONE JOB DRIVE
@router.get("/{drive_id}")
def get_job_drive(
    drive_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()

    if not ObjectId.is_valid(drive_id):
        raise HTTPException(status_code=400, detail="Invalid job drive ID")

    drive = db.job_drives.find_one({
        "_id": ObjectId(drive_id),
        "created_by": current_user["_id"]
    })

    if not drive:
        raise HTTPException(
            status_code=404,
            detail="Job drive not found or access denied"
        )

    return format_job_drive(drive)


# UPDATE JOB DRIVE
@router.put("/{drive_id}")
def update_job_drive(
    drive_id: str,
    data: JobDriveUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()

    if not ObjectId.is_valid(drive_id):
        raise HTTPException(status_code=400, detail="Invalid job drive ID")

    existing_drive = db.job_drives.find_one({
        "_id": ObjectId(drive_id),
        "created_by": current_user["_id"]
    })

    if not existing_drive:
        raise HTTPException(
            status_code=404,
            detail="Job drive not found or access denied"
        )

    updates = data.model_dump(exclude_unset=True)

    minimum = updates.get("experience_min", existing_drive["experience_min"])
    maximum = updates.get("experience_max", existing_drive["experience_max"])

    if minimum is None:
        minimum = existing_drive["experience_min"]

    if "experience_max" not in updates:
        maximum = existing_drive["experience_max"]
    if maximum is not None and maximum < minimum:
        raise HTTPException(
            status_code=400,
            detail="Maximum experience cannot be less than minimum experience"
        )

    updates["updated_at"] = datetime.now(timezone.utc)

    db.job_drives.update_one(
        {"_id": ObjectId(drive_id)},
        {"$set": updates}
    )

    updated_drive = db.job_drives.find_one({
        "_id": ObjectId(drive_id)
    })

    return {
        "message": "Job drive updated successfully",
        "job_drive": format_job_drive(updated_drive)
    }


# DELETE JOB DRIVE
@router.delete("/{drive_id}")
def delete_job_drive(
    drive_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()

    if not ObjectId.is_valid(drive_id):
        raise HTTPException(status_code=400, detail="Invalid job drive ID")

    result = db.job_drives.delete_one({
        "_id": ObjectId(drive_id),
        "created_by": current_user["_id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Job drive not found or access denied"
        )

    return {"message": "Job drive deleted successfully"}
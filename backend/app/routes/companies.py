from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone

from app.database.connection import get_database
from app.core.dependencies import get_current_user

from app.schemas.company import CompanyCreate, CompanyUpdate


router = APIRouter(
    prefix="/api/companies",
    tags=["Company Management"]
)


# Convert MongoDB document into API response
def format_company(company):

    return {
        "id": str(company["_id"]),
        "name": company["name"],
        "industry": company.get("industry"),
        "website": company.get("website"),
        "location": company.get("location"),
        "contact_person": company.get("contact_person"),
        "contact_email": company.get("contact_email"),
        "contact_phone": company.get("contact_phone"),
        "description": company.get("description"),
        "created_by": str(company["created_by"]),
        "created_at": company["created_at"].isoformat(),
        "updated_at": (
            company["updated_at"].isoformat()
            if company.get("updated_at")
            else None
        )
    }


# -------------------------------
# 1. CREATE COMPANY
# -------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_company(
    data: CompanyCreate,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    company = {
        "name": data.name.strip(),
        "industry": data.industry,
        "website": data.website,
        "location": data.location,
        "contact_person": data.contact_person,
        "contact_email": (
            str(data.contact_email).lower()
            if data.contact_email else None
        ),
        "contact_phone": data.contact_phone,
        "description": data.description,

        # Link company to logged-in HR user
        "created_by": current_user["_id"],

        "created_at": datetime.now(timezone.utc),
        "updated_at": None
    }

    result = db["companies"].insert_one(company)

    company["_id"] = result.inserted_id

    return {
        "message": "Company created successfully",
        "company": format_company(company)
    }


# -------------------------------
# 2. VIEW ALL MY COMPANIES
# -------------------------------

@router.get("/")
def get_companies(
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    companies = db["companies"].find({
        "created_by": current_user["_id"]
    }).sort("created_at", -1)

    return {
        "total": db["companies"].count_documents({
            "created_by": current_user["_id"]
        }),
        "companies": [
            format_company(company)
            for company in companies
        ]
    }


# -------------------------------
# 3. VIEW ONE COMPANY
# -------------------------------

@router.get("/{company_id}")
def get_company(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    try:
        object_id = ObjectId(company_id)

    except (InvalidId, TypeError):

        raise HTTPException(
            status_code=400,
            detail="Invalid company ID"
        )

    company = db["companies"].find_one({
        "_id": object_id,
        "created_by": current_user["_id"]
    })

    if not company:

        raise HTTPException(
            status_code=404,
            detail="Company not found"
        )

    return format_company(company)


# -------------------------------
# 4. UPDATE COMPANY
# -------------------------------

@router.put("/{company_id}")
def update_company(
    company_id: str,
    data: CompanyUpdate,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    try:
        object_id = ObjectId(company_id)

    except (InvalidId, TypeError):

        raise HTTPException(
            status_code=400,
            detail="Invalid company ID"
        )

    # Get only the fields supplied by the HR user
    update_data = data.model_dump(
        exclude_unset=True
    )

    if not update_data:

        raise HTTPException(
            status_code=400,
            detail="No update data provided"
        )

    if "name" in update_data and update_data["name"] is not None:
        update_data["name"] = update_data["name"].strip()

    if "contact_email" in update_data:
        email = update_data["contact_email"]

        update_data["contact_email"] = (
            str(email).lower() if email else None
        )

    update_data["updated_at"] = datetime.now(timezone.utc)

    result = db["companies"].update_one(
        {
            "_id": object_id,
            "created_by": current_user["_id"]
        },
        {
            "$set": update_data
        }
    )

    if result.matched_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Company not found"
        )

    updated_company = db["companies"].find_one({
        "_id": object_id,
        "created_by": current_user["_id"]
    })

    return {
        "message": "Company updated successfully",
        "company": format_company(updated_company)
    }


# -------------------------------
# 5. DELETE COMPANY
# -------------------------------

@router.delete("/{company_id}")
def delete_company(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):

    db = get_database()

    try:
        object_id = ObjectId(company_id)

    except (InvalidId, TypeError):

        raise HTTPException(
            status_code=400,
            detail="Invalid company ID"
        )

    result = db["companies"].delete_one({
        "_id": object_id,
        "created_by": current_user["_id"]
    })

    if result.deleted_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Company not found"
        )

    return {
        "message": "Company deleted successfully"
    }
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.companies import router as companies_router
from app.routes.job_drives import router as job_drives_router
from app.routes.candidates import router as candidates_router
from app.routes.resume_analysis import router as resume_analysis_router
from app.routes.analytics import router as analytics_router
from app.database.connection import (
    connect_to_database,
    close_database_connection
)

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):

    connect_to_database()

    yield

    close_database_connection()


app = FastAPI(
    title="HireLens API",
    description="HR Analytics and Recruitment Management System",
    version="1.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth_router)

app.include_router(companies_router)
app.include_router(job_drives_router)
app.include_router(candidates_router)
app.include_router(resume_analysis_router)
app.include_router(analytics_router)
@app.get("/")
def home():

    return {
        "message": "Welcome to HireLens Backend"
    }


@app.get("/api/health")
def health_check():

    return {
        "status": "success",
        "backend": "running",
        "database": "connected"
    }
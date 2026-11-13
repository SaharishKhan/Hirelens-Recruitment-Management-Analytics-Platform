from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.services.analytic_service import build_dashboard_analytics

router = APIRouter(prefix="/api/analytics", tags=["Recruitment Analytics"])


@router.get("/overview")
def get_analytics_overview(current_user: dict = Depends(get_current_user)):
    """Read-only analytics for the authenticated HR user."""
    return build_dashboard_analytics(current_user)

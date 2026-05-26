from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, Inspection, Company, InspectionStatus, UserRole
from app.utils.auth import get_current_user, require_role

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns summary stats for the current user's scope."""
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0)

    base_q = db.query(Inspection)
    if current_user.role == UserRole.agent:
        base_q = base_q.filter(Inspection.agent_id == current_user.id)
    elif current_user.role == UserRole.company_admin:
        base_q = base_q.filter(Inspection.company_id == current_user.company_id)

    total = base_q.count()
    this_month = base_q.filter(Inspection.created_at >= this_month_start).count()
    drafts = base_q.filter(Inspection.status == InspectionStatus.draft).count()
    submitted = base_q.filter(Inspection.status == InspectionStatus.submitted).count()
    approved = base_q.filter(Inspection.status == InspectionStatus.approved).count()

    result = {
        "total_inspections": total,
        "this_month": this_month,
        "drafts": drafts,
        "submitted": submitted,
        "approved": approved,
    }

    if current_user.role in [UserRole.company_admin, UserRole.super_admin]:
        agent_count = db.query(User).filter(
            User.company_id == current_user.company_id,
            User.role == UserRole.agent,
            User.is_active == True
        ).count()
        result["active_agents"] = agent_count

    if current_user.role == UserRole.super_admin:
        result["total_companies"] = db.query(Company).count()
        result["active_companies"] = db.query(Company).filter(Company.is_active == True).count()

    # Last 7 days daily counts
    daily = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        count = base_q.filter(
            Inspection.created_at >= day_start,
            Inspection.created_at < day_end
        ).count()
        daily.append({"date": day_start.strftime("%b %d"), "count": count})

    result["daily_chart"] = daily
    return result

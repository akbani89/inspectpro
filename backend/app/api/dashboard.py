from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, Inspection, Company, InspectionStatus, UserRole
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    base_q = db.query(Inspection)
    if current_user.role == UserRole.agent:
        base_q = base_q.filter(Inspection.agent_id == current_user.id)
    elif current_user.role == UserRole.company_admin:
        base_q = base_q.filter(Inspection.company_id == current_user.company_id)
    # super_admin sees all - no filter needed

    total      = base_q.count()
    this_month = base_q.filter(Inspection.created_at >= this_month_start).count()
    drafts     = base_q.filter(Inspection.status == InspectionStatus.draft).count()
    submitted  = base_q.filter(Inspection.status == InspectionStatus.submitted).count()
    approved   = base_q.filter(Inspection.status == InspectionStatus.approved).count()
    rejected   = base_q.filter(Inspection.status == InspectionStatus.rejected).count()

    result = {
        "total_inspections": total,
        "this_month": this_month,
        "drafts": drafts,
        "submitted": submitted,
        "approved": approved,
        "rejected": rejected,
    }

    # Active agents count - only for company_admin (their company) or super_admin (all)
    if current_user.role == UserRole.company_admin and current_user.company_id:
        agent_count = db.query(User).filter(
            User.company_id == current_user.company_id,
            User.role == UserRole.agent,
            User.is_active == True
        ).count()
        result["active_agents"] = agent_count

    elif current_user.role == UserRole.super_admin:
        agent_count = db.query(User).filter(
            User.role == UserRole.agent,
            User.is_active == True
        ).count()
        result["active_agents"] = agent_count
        result["total_companies"] = db.query(Company).count()
        result["active_companies"] = db.query(Company).filter(Company.is_active == True).count()

    return result

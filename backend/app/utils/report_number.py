from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Inspection


def generate_report_number(db: Session, company_slug: str) -> str:
    """Generate sequential report numbers like INS/MTR/KHI/ABC/000001/2026"""
    year = datetime.utcnow().year
    prefix = f"INS/MTR/{company_slug.upper()}"

    count = db.query(Inspection).filter(
        Inspection.report_number.like(f"{prefix}%/{year}")
    ).count()

    seq = str(count + 1).zfill(6)
    return f"{prefix}/{seq}/{year}"

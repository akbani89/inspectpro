from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os, shutil, uuid

from app.database import get_db
from app.models import User, Company, UserRole
from app.utils.auth import get_current_user, require_role

router = APIRouter()


class CompanyUpdateRequest(BaseModel):
    name: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    report_header_color: Optional[str]
    report_footer_text: Optional[str]


def company_to_dict(c: Company) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "email": c.email,
        "phone": c.phone,
        "address": c.address,
        "logo_url": c.logo_url,
        "report_header_color": c.report_header_color,
        "report_footer_text": c.report_footer_text,
        "subscription_tier": c.subscription_tier,
        "is_active": c.is_active,
        "created_at": c.created_at,
        "agent_count": len(c.users),
        "inspection_count": len(c.inspections),
    }


# ── Super Admin: list all companies ──────────────────────────
@router.get("/")
def list_companies(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.super_admin))
):
    return [company_to_dict(c) for c in db.query(Company).all()]


# ── Get own company (admin) ───────────────────────────────────
@router.get("/me")
def get_my_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(404, "No company associated")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    return company_to_dict(company)


# ── Update company settings ───────────────────────────────────
@router.patch("/me")
def update_company(
    req: CompanyUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin, UserRole.super_admin))
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    for field, value in req.dict(exclude_none=True).items():
        setattr(company, field, value)
    db.commit()
    return company_to_dict(company)


# ── Upload company logo ───────────────────────────────────────
@router.post("/me/logo")
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin))
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    ext = file.filename.split(".")[-1]
    filename = f"logos/{current_user.company_id}.{ext}"
    os.makedirs("uploads/logos", exist_ok=True)
    with open(f"uploads/{filename}", "wb") as f:
        shutil.copyfileobj(file.file, f)

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    company.logo_url = f"/uploads/{filename}"
    db.commit()
    return {"logo_url": company.logo_url}


# ── Super admin: activate / deactivate company ────────────────
@router.patch("/{company_id}/status")
def set_company_status(
    company_id: str,
    active: bool,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.super_admin))
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    company.is_active = active
    db.commit()
    return {"message": f"Company {'activated' if active else 'deactivated'}"}

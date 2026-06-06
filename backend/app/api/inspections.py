from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import os, shutil, uuid

from app.database import get_db
from app.models import User, Inspection, InspectionPhoto, InspectionStatus, UserRole, Company
from app.utils.auth import get_current_user, require_role
from app.utils.report_number import generate_report_number

router = APIRouter()


class InspectionCreateRequest(BaseModel):
    # Proposal
    insurer_name: Optional[str] = None
    branch_name: Optional[str] = None
    underwriter_name: Optional[str] = None
    request_date: Optional[datetime] = None
    insured_name: Optional[str] = None
    insured_contact: Optional[str] = None
    insured_address: Optional[str] = None
    insured_cnic: Optional[str] = None
    # Vehicle
    manufacturer: Optional[str] = None
    make: Optional[str] = None
    model_variant: Optional[str] = None
    engine_cc: Optional[str] = None
    registration_no: Optional[str] = None
    registration_year: Optional[int] = None
    manufacturing_year: Optional[int] = None
    engine_no: Optional[str] = None
    chassis_no: Optional[str] = None
    color: Optional[str] = None
    odometer_reading: Optional[int] = None
    body_type: Optional[str] = None
    usage_type: Optional[str] = "Private"
    assembly: Optional[str] = "Local Assembled"
    # Accessories
    factory_accessories: Optional[List[str]] = []
    additional_accessories: Optional[List[str]] = []
    accessories_notes: Optional[str] = None
    # Body
    is_new_vehicle: Optional[bool] = False
    damages: Optional[List[Any]] = []
    damage_notes: Optional[str] = None
    missing_items: Optional[str] = None
    alterations: Optional[str] = None
    # Valuation
    market_value: Optional[float] = None
    additional_accessories_value: Optional[float] = 0
    # Meta
    inspection_place: Optional[str] = None
    inspection_date: Optional[datetime] = None
    documents_received: Optional[Any] = {}
    surveyor_remarks: Optional[str] = None


class RejectRequest(BaseModel):
    comment: str


def inspection_to_dict(i: Inspection, include_photos: bool = True) -> dict:
    d = {
        "id": i.id,
        "report_number": i.report_number,
        "status": i.status,
        "rejection_comment": i.rejection_comment,
        "agent_id": i.agent_id,
        "agent_name": i.agent.full_name if i.agent else None,
        "company_id": i.company_id,
        "insured_name": i.insured_name,
        "registration_no": i.registration_no,
        "make": i.make,
        "manufacturer": i.manufacturer,
        "model_variant": i.model_variant,
        "engine_cc": i.engine_cc,
        "registration_year": i.registration_year,
        "manufacturing_year": i.manufacturing_year,
        "engine_no": i.engine_no,
        "chassis_no": i.chassis_no,
        "color": i.color,
        "odometer_reading": i.odometer_reading,
        "body_type": i.body_type,
        "usage_type": i.usage_type,
        "assembly": i.assembly,
        "insurer_name": i.insurer_name,
        "branch_name": i.branch_name,
        "underwriter_name": i.underwriter_name,
        "request_date": i.request_date,
        "insured_contact": i.insured_contact,
        "insured_address": i.insured_address,
        "insured_cnic": i.insured_cnic,
        "factory_accessories": i.factory_accessories,
        "additional_accessories": i.additional_accessories,
        "accessories_notes": i.accessories_notes,
        "is_new_vehicle": i.is_new_vehicle,
        "damages": i.damages,
        "damage_notes": i.damage_notes,
        "missing_items": i.missing_items,
        "alterations": i.alterations,
        "market_value": i.market_value,
        "additional_accessories_value": i.additional_accessories_value,
        "inspection_place": i.inspection_place,
        "inspection_date": i.inspection_date,
        "documents_received": i.documents_received,
        "surveyor_remarks": i.surveyor_remarks,
        "pdf_url": i.pdf_url,
        "created_at": i.created_at,
        "updated_at": i.updated_at,
        "submitted_at": i.submitted_at,
    }
    if include_photos:
        d["photos"] = [
            {"id": p.id, "url": p.url, "caption": p.caption,
             "damage_tag": p.damage_tag, "photo_type": p.photo_type}
            for p in i.photos
        ]
    return d


@router.get("/")
def list_inspections(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Inspection)

    if current_user.role == UserRole.agent:
        query = query.filter(Inspection.agent_id == current_user.id)
    elif current_user.role == UserRole.company_admin:
        query = query.filter(Inspection.company_id == current_user.company_id)

    if status:
        query = query.filter(Inspection.status == status)
    if search:
        query = query.filter(
            Inspection.insured_name.ilike(f"%{search}%") |
            Inspection.registration_no.ilike(f"%{search}%") |
            Inspection.report_number.ilike(f"%{search}%")
        )

    total = query.count()
    items = query.order_by(Inspection.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [inspection_to_dict(i, include_photos=False) for i in items]}


@router.post("/", status_code=201)
def create_inspection(
    req: InspectionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    report_no = generate_report_number(db, company.slug if company else "INS")

    inspection = Inspection(
        report_number=report_no,
        company_id=current_user.company_id,
        agent_id=current_user.id,
        **req.dict()
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection_to_dict(inspection)


@router.get("/{inspection_id}")
def get_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(404, "Inspection not found")
    if current_user.role == UserRole.agent and inspection.agent_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if current_user.role == UserRole.company_admin and inspection.company_id != current_user.company_id:
        raise HTTPException(403, "Access denied")
    return inspection_to_dict(inspection)


@router.patch("/{inspection_id}")
def update_inspection(
    inspection_id: str,
    req: InspectionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(404, "Not found")
    if inspection.status == InspectionStatus.submitted:
        raise HTTPException(400, "Cannot edit a submitted inspection")

    for field, value in req.dict(exclude_none=True).items():
        setattr(inspection, field, value)
    db.commit()
    return inspection_to_dict(inspection)


@router.post("/{inspection_id}/submit")
def submit_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(404, "Not found")
    if inspection.status != InspectionStatus.draft:
        raise HTTPException(400, "Already submitted")

    inspection.status = InspectionStatus.submitted
    inspection.submitted_at = datetime.utcnow()
    db.commit()
    return {"message": "Inspection submitted", "report_number": inspection.report_number}


@router.post("/{inspection_id}/approve")
def approve_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin, UserRole.super_admin))
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(404, "Not found")
    if inspection.status != InspectionStatus.submitted:
        raise HTTPException(400, "Only submitted inspections can be approved")
    inspection.status = InspectionStatus.approved
    db.commit()
    return {"message": "Inspection approved"}


@router.post("/{inspection_id}/reject")
def reject_inspection(
    inspection_id: str,
    req: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin, UserRole.super_admin))
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(404, "Not found")
    if inspection.status != InspectionStatus.submitted:
        raise HTTPException(400, "Only submitted inspections can be rejected")
    inspection.status = InspectionStatus.rejected
    inspection.rejection_comment = req.comment
    db.commit()
    return {"message": "Inspection rejected", "comment": req.comment}


@router.post("/{inspection_id}/photos")
def upload_photo(
    inspection_id: str,
    file: UploadFile = File(...),
    caption: Optional[str] = None,
    photo_type: str = "damage",
    damage_tag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(404, "Inspection not found")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "heic", "webp"]:
        raise HTTPException(400, "Invalid image format")

    photo_id = str(uuid.uuid4())
    path = f"uploads/photos/{inspection_id}_{photo_id}.{ext}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    photo = InspectionPhoto(
        inspection_id=inspection_id,
        url=f"/{path}",
        caption=caption,
        photo_type=photo_type,
        damage_tag=damage_tag,
    )
    db.add(photo)
    db.commit()
    return {"id": photo.id, "url": photo.url}


@router.delete("/{inspection_id}/photos/{photo_id}")
def delete_photo(
    inspection_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photo = db.query(InspectionPhoto).filter(
        InspectionPhoto.id == photo_id,
        InspectionPhoto.inspection_id == inspection_id
    ).first()
    if not photo:
        raise HTTPException(404, "Photo not found")
    if os.path.exists(photo.url.lstrip("/")):
        os.remove(photo.url.lstrip("/"))
    db.delete(photo)
    db.commit()
    return {"message": "Photo deleted"}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database import get_db
from app.models import User, UserRole, Company
from app.utils.auth import hash_password, get_current_user, require_role

router = APIRouter()


class CreateAgentRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    cnic: Optional[str] = None
    company_id: Optional[str] = None  # only used by super_admin


class UpdateAgentRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    is_active: Optional[bool] = None


def user_to_dict(u: User) -> dict:
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "phone": u.phone,
        "cnic": u.cnic,
        "role": u.role,
        "is_active": u.is_active,
        "last_login": u.last_login,
        "created_at": u.created_at,
        "company_id": u.company_id,
        "company_name": u.company.name if u.company else None,
        "inspection_count": len(u.inspections),
    }


@router.get("/")
def list_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin, UserRole.super_admin))
):
    query = db.query(User).filter(User.role == UserRole.agent)
    if current_user.role != UserRole.super_admin:
        query = query.filter(User.company_id == current_user.company_id)
    return [user_to_dict(u) for u in query.all()]


@router.post("/", status_code=201)
def create_agent(
    req: CreateAgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin, UserRole.super_admin))
):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")

    # Determine which company to assign the agent to
    if current_user.role == UserRole.super_admin:
        # Super admin can specify a company_id or defaults to first company
        if req.company_id:
            company = db.query(Company).filter(Company.id == req.company_id).first()
            if not company:
                raise HTTPException(404, "Company not found")
            company_id = req.company_id
        else:
            company = db.query(Company).first()
            company_id = company.id if company else None
    else:
        # Company admin assigns to their own company
        company_id = current_user.company_id

    agent = User(
        company_id=company_id,
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        phone=req.phone,
        cnic=req.cnic,
        role=UserRole.agent,
    )
    db.add(agent)
    db.commit()
    return user_to_dict(agent)


@router.patch("/{agent_id}")
def update_agent(
    agent_id: str,
    req: UpdateAgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin, UserRole.super_admin))
):
    query = db.query(User).filter(User.id == agent_id, User.role == UserRole.agent)
    if current_user.role != UserRole.super_admin:
        query = query.filter(User.company_id == current_user.company_id)
    agent = query.first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    for field, value in req.dict(exclude_none=True).items():
        setattr(agent, field, value)
    db.commit()
    return user_to_dict(agent)


@router.delete("/{agent_id}")
def delete_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin, UserRole.super_admin))
):
    query = db.query(User).filter(User.id == agent_id)
    if current_user.role != UserRole.super_admin:
        query = query.filter(User.company_id == current_user.company_id)
    agent = query.first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent.is_active = False
    db.commit()
    return {"message": "Agent deactivated"}


@router.post("/{agent_id}/reset-password")
def reset_agent_password(
    agent_id: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin, UserRole.super_admin))
):
    agent = db.query(User).filter(User.id == agent_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password reset successfully"}

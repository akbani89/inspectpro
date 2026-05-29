from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database import get_db
from app.models import User, UserRole
from app.utils.auth import hash_password, get_current_user, require_role

router = APIRouter()


class CreateAgentRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str]
    cnic: Optional[str]


class UpdateAgentRequest(BaseModel):
    full_name: Optional[str]
    phone: Optional[str]
    cnic: Optional[str]
    is_active: Optional[bool]


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
    current_user: User = Depends(require_role(UserRole.company_admin))
):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")

    agent = User(
        company_id=current_user.company_id,
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
    current_user: User = Depends(require_role(UserRole.company_admin))
):
    agent = db.query(User).filter(
        User.id == agent_id,
        User.company_id == current_user.company_id,
        User.role == UserRole.agent
    ).first()
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
    current_user: User = Depends(require_role(UserRole.company_admin))
):
    agent = db.query(User).filter(
        User.id == agent_id,
        User.company_id == current_user.company_id
    ).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent.is_active = False  # soft delete
    db.commit()
    return {"message": "Agent deactivated"}


@router.post("/{agent_id}/reset-password")
def reset_agent_password(
    agent_id: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.company_admin))
):
    agent = db.query(User).filter(
        User.id == agent_id,
        User.company_id == current_user.company_id
    ).first()
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password reset successfully"}

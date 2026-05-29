from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import User, Company, UserRole
from app.utils.auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter()


class RegisterCompanyRequest(BaseModel):
    company_name: str
    company_email: EmailStr
    admin_full_name: str
    admin_email: EmailStr
    password: str
    phone: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str
    role: str
    company_id: Optional[str]
    company_name: Optional[str]


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/register-company", status_code=201)
def register_company(req: RegisterCompanyRequest, db: Session = Depends(get_db)):
    """Self-service company registration — creates company + admin user in one step."""
    if db.query(Company).filter(Company.email == req.company_email).first():
        raise HTTPException(400, "Company email already registered")
    if db.query(User).filter(User.email == req.admin_email).first():
        raise HTTPException(400, "Admin email already registered")

    slug = req.company_name.lower().replace(" ", "-")[:30]
    # ensure unique slug
    base_slug = slug
    i = 1
    while db.query(Company).filter(Company.slug == slug).first():
        slug = f"{base_slug}-{i}"
        i += 1

    company = Company(
        name=req.company_name,
        slug=slug,
        email=req.company_email,
        phone=req.phone,
    )
    db.add(company)
    db.flush()

    admin = User(
        company_id=company.id,
        email=req.admin_email,
        hashed_password=hash_password(req.password),
        full_name=req.admin_full_name,
        phone=req.phone,
        role=UserRole.company_admin,
    )
    db.add(admin)
    db.commit()

    return {"message": "Company registered successfully", "company_id": company.id}


@router.post("/login", response_model=LoginResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username, User.is_active == True).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_token({"sub": user.id, "role": user.role, "company_id": user.company_id})

    return LoginResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        company_id=user.company_id,
        company_name=user.company.name if user.company else None,
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": current_user.phone,
        "company_id": current_user.company_id,
        "company_name": current_user.company.name if current_user.company else None,
    }


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated"}

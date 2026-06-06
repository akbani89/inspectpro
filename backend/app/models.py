from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid
import enum


def gen_uuid():
    return str(uuid.uuid4())


class SubscriptionTier(str, enum.Enum):
    starter = "starter"
    professional = "professional"
    enterprise = "enterprise"


class InspectionStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    company_admin = "company_admin"
    agent = "agent"


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    address = Column(Text)
    logo_url = Column(String)
    report_header_color = Column(String, default="#1a56db")
    report_footer_text = Column(String)
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.starter)
    stripe_customer_id = Column(String)
    stripe_subscription_id = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="company", cascade="all, delete")
    inspections = relationship("Inspection", back_populates="company", cascade="all, delete")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    role = Column(Enum(UserRole), default=UserRole.agent)
    cnic = Column(String)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="users")
    inspections = relationship("Inspection", back_populates="agent")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String, primary_key=True, default=gen_uuid)
    report_number = Column(String, unique=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    agent_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(InspectionStatus), default=InspectionStatus.draft)
    rejection_comment = Column(Text)

    # Proposal
    insurer_name = Column(String)
    branch_name = Column(String)
    underwriter_name = Column(String)
    request_date = Column(DateTime)
    insured_name = Column(String)
    insured_contact = Column(String)
    insured_address = Column(Text)
    insured_cnic = Column(String)

    # Vehicle
    manufacturer = Column(String)
    make = Column(String)
    model_variant = Column(String)
    engine_cc = Column(String)
    registration_no = Column(String)
    registration_year = Column(Integer)
    manufacturing_year = Column(Integer)
    engine_no = Column(String)
    chassis_no = Column(String)
    color = Column(String)
    odometer_reading = Column(Integer)
    body_type = Column(String)
    usage_type = Column(String, default="Private")
    assembly = Column(String, default="Local Assembled")

    # Accessories
    factory_accessories = Column(JSON, default=list)
    additional_accessories = Column(JSON, default=list)
    accessories_notes = Column(Text)

    # Body
    is_new_vehicle = Column(Boolean, default=False)
    damages = Column(JSON, default=list)
    damage_notes = Column(Text)
    missing_items = Column(Text)
    alterations = Column(Text)

    # Valuation
    market_value = Column(Float)
    additional_accessories_value = Column(Float, default=0)

    # Meta
    inspection_place = Column(String)
    inspection_date = Column(DateTime)
    documents_received = Column(JSON, default=dict)
    surveyor_remarks = Column(Text)

    # Files
    pdf_url = Column(String)
    pdf_generated_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime)

    company = relationship("Company", back_populates="inspections")
    agent = relationship("User", back_populates="inspections")
    photos = relationship("InspectionPhoto", back_populates="inspection", cascade="all, delete")


class InspectionPhoto(Base):
    __tablename__ = "inspection_photos"

    id = Column(String, primary_key=True, default=gen_uuid)
    inspection_id = Column(String, ForeignKey("inspections.id"), nullable=False)
    url = Column(String, nullable=False)
    caption = Column(String)
    damage_tag = Column(String)
    photo_type = Column(String, default="damage")
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    inspection = relationship("Inspection", back_populates="photos")

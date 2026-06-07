from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship, Session
from app.database import Base, get_db
from app.models import UserRole
from app.utils.auth import require_role
import uuid

def gen_uuid(): return str(uuid.uuid4())

# ── MODELS ────────────────────────────────────────────────────

class City(Base):
    __tablename__ = "cities"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False, unique=True)
    province = Column(String)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

class Insurer(Base):
    __tablename__ = "insurers"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    branches = relationship("InsurerBranch", back_populates="insurer", cascade="all, delete")

class InsurerBranch(Base):
    __tablename__ = "insurer_branches"
    id = Column(String, primary_key=True, default=gen_uuid)
    insurer_id = Column(String, ForeignKey("insurers.id"), nullable=False)
    name = Column(String, nullable=False)
    city = Column(String)
    is_active = Column(Boolean, default=True)
    insurer = relationship("Insurer", back_populates="branches")

class VehicleManufacturer(Base):
    __tablename__ = "vehicle_manufacturers"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    makes = relationship("VehicleMake", back_populates="manufacturer", cascade="all, delete")

class VehicleMake(Base):
    __tablename__ = "vehicle_makes"
    id = Column(String, primary_key=True, default=gen_uuid)
    manufacturer_id = Column(String, ForeignKey("vehicle_manufacturers.id"), nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    manufacturer = relationship("VehicleManufacturer", back_populates="makes")
    variants = relationship("VehicleVariant", back_populates="make", cascade="all, delete")

class VehicleVariant(Base):
    __tablename__ = "vehicle_variants"
    id = Column(String, primary_key=True, default=gen_uuid)
    make_id = Column(String, ForeignKey("vehicle_makes.id"), nullable=False)
    name = Column(String, nullable=False)
    engine_cc = Column(String)
    body_type = Column(String)
    is_active = Column(Boolean, default=True)
    make = relationship("VehicleMake", back_populates="variants")

# ── ROUTER ────────────────────────────────────────────────────

router = APIRouter()

# Cities
@router.get("/cities")
def get_cities(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name, "province": c.province}
            for c in db.query(City).filter(City.is_active == True).order_by(City.sort_order, City.name).all()]

@router.post("/cities", status_code=201)
def add_city(name: str, province: str = None, db: Session = Depends(get_db),
             current_user=Depends(require_role(UserRole.super_admin))):
    if db.query(City).filter(City.name == name).first():
        raise HTTPException(400, "City already exists")
    city = City(name=name, province=province)
    db.add(city); db.commit()
    return {"id": city.id, "name": city.name, "province": city.province}

@router.delete("/cities/{city_id}")
def delete_city(city_id: str, db: Session = Depends(get_db),
                current_user=Depends(require_role(UserRole.super_admin))):
    city = db.query(City).filter(City.id == city_id).first()
    if not city: raise HTTPException(404, "Not found")
    city.is_active = False; db.commit()
    return {"message": "Deleted"}

# Insurers
@router.get("/insurers")
def get_insurers(db: Session = Depends(get_db)):
    insurers = db.query(Insurer).filter(Insurer.is_active == True).order_by(Insurer.sort_order, Insurer.name).all()
    return [{"id": i.id, "name": i.name,
             "branches": [{"id": b.id, "name": b.name, "city": b.city}
                          for b in i.branches if b.is_active]}
            for i in insurers]

@router.post("/insurers", status_code=201)
def add_insurer(name: str, db: Session = Depends(get_db),
                current_user=Depends(require_role(UserRole.super_admin))):
    if db.query(Insurer).filter(Insurer.name == name).first():
        raise HTTPException(400, "Insurer already exists")
    ins = Insurer(name=name); db.add(ins); db.commit()
    return {"id": ins.id, "name": ins.name}

@router.post("/insurers/{insurer_id}/branches", status_code=201)
def add_branch(insurer_id: str, name: str, city: str = None,
               db: Session = Depends(get_db),
               current_user=Depends(require_role(UserRole.super_admin))):
    branch = InsurerBranch(insurer_id=insurer_id, name=name, city=city)
    db.add(branch); db.commit()
    return {"id": branch.id, "name": branch.name}

@router.delete("/insurers/{insurer_id}")
def delete_insurer(insurer_id: str, db: Session = Depends(get_db),
                   current_user=Depends(require_role(UserRole.super_admin))):
    ins = db.query(Insurer).filter(Insurer.id == insurer_id).first()
    if not ins: raise HTTPException(404, "Not found")
    ins.is_active = False; db.commit()
    return {"message": "Deleted"}

@router.delete("/branches/{branch_id}")
def delete_branch(branch_id: str, db: Session = Depends(get_db),
                  current_user=Depends(require_role(UserRole.super_admin))):
    branch = db.query(InsurerBranch).filter(InsurerBranch.id == branch_id).first()
    if not branch: raise HTTPException(404, "Not found")
    branch.is_active = False; db.commit()
    return {"message": "Deleted"}

# Vehicles
@router.get("/manufacturers")
def get_manufacturers(db: Session = Depends(get_db)):
    mfrs = db.query(VehicleManufacturer).filter(VehicleManufacturer.is_active == True).order_by(VehicleManufacturer.sort_order, VehicleManufacturer.name).all()
    return [{"id": m.id, "name": m.name,
             "makes": [{"id": mk.id, "name": mk.name,
                        "variants": [{"id": v.id, "name": v.name, "engine_cc": v.engine_cc, "body_type": v.body_type}
                                     for v in mk.variants if v.is_active]}
                       for mk in m.makes if mk.is_active]}
            for m in mfrs]

@router.post("/manufacturers", status_code=201)
def add_manufacturer(name: str, db: Session = Depends(get_db),
                     current_user=Depends(require_role(UserRole.super_admin))):
    if db.query(VehicleManufacturer).filter(VehicleManufacturer.name == name).first():
        raise HTTPException(400, "Manufacturer already exists")
    m = VehicleManufacturer(name=name); db.add(m); db.commit()
    return {"id": m.id, "name": m.name}

@router.post("/manufacturers/{mfr_id}/makes", status_code=201)
def add_make(mfr_id: str, name: str, db: Session = Depends(get_db),
             current_user=Depends(require_role(UserRole.super_admin))):
    mk = VehicleMake(manufacturer_id=mfr_id, name=name); db.add(mk); db.commit()
    return {"id": mk.id, "name": mk.name}

@router.post("/makes/{make_id}/variants", status_code=201)
def add_variant(make_id: str, name: str, engine_cc: str = None, body_type: str = None,
                db: Session = Depends(get_db),
                current_user=Depends(require_role(UserRole.super_admin))):
    v = VehicleVariant(make_id=make_id, name=name, engine_cc=engine_cc, body_type=body_type)
    db.add(v); db.commit()
    return {"id": v.id, "name": v.name}

@router.delete("/manufacturers/{mfr_id}")
def delete_manufacturer(mfr_id: str, db: Session = Depends(get_db),
                        current_user=Depends(require_role(UserRole.super_admin))):
    m = db.query(VehicleManufacturer).filter(VehicleManufacturer.id == mfr_id).first()
    if not m: raise HTTPException(404, "Not found")
    m.is_active = False; db.commit()
    return {"message": "Deleted"}

@router.delete("/makes/{make_id}")
def delete_make(make_id: str, db: Session = Depends(get_db),
                current_user=Depends(require_role(UserRole.super_admin))):
    mk = db.query(VehicleMake).filter(VehicleMake.id == make_id).first()
    if not mk: raise HTTPException(404, "Not found")
    mk.is_active = False; db.commit()
    return {"message": "Deleted"}

@router.delete("/variants/{variant_id}")
def delete_variant(variant_id: str, db: Session = Depends(get_db),
                   current_user=Depends(require_role(UserRole.super_admin))):
    v = db.query(VehicleVariant).filter(VehicleVariant.id == variant_id).first()
    if not v: raise HTTPException(404, "Not found")
    v.is_active = False; db.commit()
    return {"message": "Deleted"}

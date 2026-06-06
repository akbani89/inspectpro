"""
Run this script once to populate the database with initial Pakistan data.
Usage: python seed_data.py
"""
import sys
sys.path.insert(0, '/app')

from app.database import SessionLocal
from app.api.master_data import (
    City, Insurer, InsurerBranch,
    VehicleManufacturer, VehicleMake, VehicleVariant
)

db = SessionLocal()

# ── CITIES ────────────────────────────────────────────────────
cities = [
    ("Karachi", "Sindh"), ("Lahore", "Punjab"), ("Islamabad", "Federal"),
    ("Rawalpindi", "Punjab"), ("Faisalabad", "Punjab"), ("Multan", "Punjab"),
    ("Peshawar", "KPK"), ("Quetta", "Balochistan"), ("Sialkot", "Punjab"),
    ("Gujranwala", "Punjab"), ("Hyderabad", "Sindh"), ("Sukkur", "Sindh"),
    ("Abbottabad", "KPK"), ("Mardan", "KPK"), ("Bahawalpur", "Punjab"),
    ("Sargodha", "Punjab"), ("Gujrat", "Punjab"), ("Sheikhupura", "Punjab"),
    ("Larkana", "Sindh"), ("Mirpur", "AJK"), ("Muzaffarabad", "AJK"),
]
for i, (name, province) in enumerate(cities):
    if not db.query(City).filter(City.name == name).first():
        db.add(City(name=name, province=province, sort_order=i))
print(f"Added {len(cities)} cities")

# ── INSURERS ──────────────────────────────────────────────────
insurers_data = {
    "Jubilee General Insurance Co. Ltd": ["Saddar", "Clifton", "Gulshan", "DHA", "North Nazimabad", "Lahore Main", "Islamabad"],
    "EFU General Insurance Ltd": ["Karachi Main", "Lahore", "Islamabad", "Faisalabad", "Multan"],
    "Adamjee Insurance Co. Ltd": ["Karachi", "Lahore", "Islamabad", "Rawalpindi"],
    "TPL Insurance Ltd": ["Karachi", "Lahore", "Islamabad"],
    "United Insurance Co. of Pakistan": ["Karachi", "Lahore", "Islamabad"],
    "Alpha Insurance Co. Ltd": ["Karachi", "Lahore"],
    "Askari General Insurance": ["Karachi", "Lahore", "Islamabad", "Rawalpindi"],
    "Atlas Insurance Ltd": ["Karachi", "Lahore", "Islamabad"],
    "Chubb Insurance Pakistan Ltd": ["Karachi", "Lahore"],
    "Century Insurance Co. Ltd": ["Karachi", "Lahore"],
    "Crescent Star Insurance Ltd": ["Karachi", "Lahore"],
    "East West Insurance Co. Ltd": ["Karachi"],
    "Excel Insurance Co. Ltd": ["Karachi", "Lahore"],
    "IGI Insurance Ltd": ["Karachi", "Lahore", "Islamabad"],
    "New Hampshire Insurance": ["Karachi"],
    "Pakistan General Insurance": ["Karachi", "Lahore"],
    "Premier Insurance Ltd": ["Karachi", "Lahore"],
    "Reliance Insurance Co. Ltd": ["Karachi", "Lahore"],
    "Shaheen Insurance Co. Ltd": ["Karachi", "Lahore", "Islamabad"],
    "SPI Insurance Co. Ltd": ["Karachi", "Lahore"],
    "Standard Insurance Co. Ltd": ["Karachi"],
    "The Universal Insurance Co. Ltd": ["Karachi", "Lahore"],
}
for i, (name, branches) in enumerate(insurers_data.items()):
    ins = db.query(Insurer).filter(Insurer.name == name).first()
    if not ins:
        ins = Insurer(name=name, sort_order=i)
        db.add(ins)
        db.flush()
    for branch in branches:
        if not db.query(InsurerBranch).filter(InsurerBranch.insurer_id == ins.id, InsurerBranch.name == branch).first():
            db.add(InsurerBranch(insurer_id=ins.id, name=branch))
print(f"Added {len(insurers_data)} insurers")

# ── VEHICLES ──────────────────────────────────────────────────
vehicles_data = {
    "Suzuki Motor Corporation": {
        "Suzuki Alto": [
            ("VXL AGS", "660CC", "Hatchback"),
            ("VXL Manual", "660CC", "Hatchback"),
            ("VX", "660CC", "Hatchback"),
        ],
        "Suzuki Swift": [
            ("GL Manual", "1197CC", "Saloon"),
            ("GL CVT", "1197CC", "Saloon"),
            ("GLX CVT", "1197CC", "Saloon"),
        ],
        "Suzuki Cultus": [
            ("VXL", "1000CC", "Hatchback"),
            ("VXR", "1000CC", "Hatchback"),
            ("AGS", "1000CC", "Hatchback"),
        ],
        "Suzuki Wagon R": [
            ("VXL", "998CC", "Hatchback"),
            ("VXR", "998CC", "Hatchback"),
            ("AGS", "998CC", "Hatchback"),
        ],
        "Suzuki Jimny": [
            ("1.5 AT", "1462CC", "SUV"),
        ],
        "Suzuki Bolan": [
            ("VX", "796CC", "Van"),
        ],
        "Suzuki Ravi": [
            ("Standard", "796CC", "Pickup"),
        ],
    },
    "Toyota Motor Corporation": {
        "Toyota Corolla": [
            ("Altis X 1.6 CVT", "1598CC", "Saloon"),
            ("Altis X 1.6 Manual", "1598CC", "Saloon"),
            ("Altis Grande 1.8 CVT", "1798CC", "Saloon"),
            ("X 1.6 CVT", "1598CC", "Saloon"),
            ("X 1.6 Manual", "1598CC", "Saloon"),
        ],
        "Toyota Yaris": [
            ("ATIV X CVT", "1300CC", "Saloon"),
            ("ATIV X Manual", "1300CC", "Saloon"),
            ("ATIV MT", "1300CC", "Saloon"),
            ("GLI CVT", "1300CC", "Saloon"),
            ("GLI Manual", "1300CC", "Saloon"),
        ],
        "Toyota Fortuner": [
            ("2.7 VVTi", "2694CC", "SUV"),
            ("2.8 Sigma 4", "2755CC", "SUV"),
            ("Legender", "2694CC", "SUV"),
        ],
        "Toyota Hilux": [
            ("Revo G MT", "2755CC", "Pickup"),
            ("Revo V AT", "2755CC", "Pickup"),
            ("Rocco", "2755CC", "Pickup"),
        ],
        "Toyota Prado": [
            ("TX", "2694CC", "SUV"),
            ("TXL", "2694CC", "SUV"),
        ],
        "Toyota Land Cruiser": [
            ("ZX", "4608CC", "SUV"),
            ("AX G-Selection", "4608CC", "SUV"),
        ],
        "Toyota Hiace": [
            ("Grand Cabin", "2982CC", "Van"),
            ("Standard", "2982CC", "Van"),
        ],
        "Toyota Vitz": [
            ("F 1.0", "998CC", "Hatchback"),
            ("RS 1.3", "1298CC", "Hatchback"),
        ],
    },
    "Honda Motor Co.": {
        "Honda Civic": [
            ("Oriel 1.8 CVT", "1799CC", "Saloon"),
            ("RS 1.5 Turbo CVT", "1498CC", "Saloon"),
            ("VTi 1.5 Turbo CVT", "1498CC", "Saloon"),
            ("EXi", "1590CC", "Saloon"),
        ],
        "Honda City": [
            ("Aspire 1.5 CVT", "1498CC", "Saloon"),
            ("1.5 CVT", "1498CC", "Saloon"),
            ("1.3 Manual", "1339CC", "Saloon"),
        ],
        "Honda HR-V": [
            ("1.8 i-VTEC", "1799CC", "SUV"),
        ],
        "Honda BR-V": [
            ("S MT", "1498CC", "SUV"),
            ("E CVT", "1498CC", "SUV"),
            ("V CVT", "1498CC", "SUV"),
        ],
        "Honda Vezel": [
            ("Z", "1496CC", "SUV"),
            ("X", "1496CC", "SUV"),
        ],
        "Honda Fit": [
            ("GF", "1497CC", "Hatchback"),
            ("GK", "1497CC", "Hatchback"),
        ],
    },
    "Kia Motors": {
        "Kia Sportage": [
            ("FWD Alpha AT", "1999CC", "SUV"),
            ("AWD Alpha AT", "1999CC", "SUV"),
            ("FWD AT", "1999CC", "SUV"),
        ],
        "Kia Picanto": [
            ("1.0 MT", "998CC", "Hatchback"),
            ("1.0 AT", "998CC", "Hatchback"),
        ],
        "Kia Stonic": [
            ("EX MT", "1000CC", "SUV"),
            ("EX AT", "1000CC", "SUV"),
        ],
        "Kia Sorento": [
            ("3.5 FWD", "3470CC", "SUV"),
        ],
        "Kia Carnival": [
            ("FWD", "2151CC", "Van"),
        ],
    },
    "Hyundai Motor Company": {
        "Hyundai Tucson": [
            ("FWD A/T", "1999CC", "SUV"),
            ("AWD A/T", "1999CC", "SUV"),
            ("GLS Sport", "1999CC", "SUV"),
        ],
        "Hyundai Sonata": [
            ("2.0 GLS", "1999CC", "Saloon"),
        ],
        "Hyundai Elantra": [
            ("GLS", "1591CC", "Saloon"),
        ],
        "Hyundai Porter": [
            ("H-100", "2607CC", "Pickup"),
        ],
    },
    "MG Motor": {
        "MG HS": [
            ("1.5T Essence", "1490CC", "SUV"),
            ("1.5T Luxury", "1490CC", "SUV"),
            ("Magnette", "1490CC", "SUV"),
        ],
        "MG ZS": [
            ("1.5 CVT Essence", "1498CC", "SUV"),
            ("EV Luxury", "Electric", "SUV"),
        ],
        "MG 5": [
            ("1.5T Essence", "1490CC", "Saloon"),
        ],
    },
    "Changan Automobile": {
        "Changan Alsvin": [
            ("1.5 Comfort MT", "1498CC", "Saloon"),
            ("1.5 Lumiere CVT", "1498CC", "Saloon"),
            ("1.5 Flagship CVT", "1498CC", "Saloon"),
        ],
        "Changan Oshan X7": [
            ("1.5T FWD", "1498CC", "SUV"),
        ],
        "Changan Karvaan": [
            ("1.5 Standard", "1498CC", "Van"),
            ("1.5 Plus", "1498CC", "Van"),
        ],
        "Changan M9": [
            ("Standard", "1498CC", "Pickup"),
        ],
    },
    "DFSK (Dongfeng Sokon)": {
        "DFSK Glory 580": [
            ("1.5T CVT", "1498CC", "SUV"),
            ("1.5T MT", "1498CC", "SUV"),
        ],
        "DFSK Glory 500": [
            ("1.5T MT", "1498CC", "SUV"),
        ],
        "DFSK Loadhopper": [
            ("Standard", "1000CC", "Pickup"),
        ],
    },
    "Proton Holdings": {
        "Proton Saga": [
            ("1.3 MT Standard", "1332CC", "Saloon"),
            ("1.3 AT Premium", "1332CC", "Saloon"),
        ],
        "Proton X70": [
            ("1.8 TGDI FWD Executive", "1799CC", "SUV"),
            ("1.8 TGDI AWD Premium", "1799CC", "SUV"),
        ],
    },
    "BMW AG": {
        "BMW 3 Series": [
            ("318i", "1499CC", "Saloon"),
            ("320i", "1998CC", "Saloon"),
            ("330i", "1998CC", "Saloon"),
        ],
        "BMW 5 Series": [
            ("520i", "1998CC", "Saloon"),
            ("530i", "1998CC", "Saloon"),
        ],
        "BMW X5": [
            ("xDrive40i", "2998CC", "SUV"),
        ],
    },
    "Mercedes-Benz AG": {
        "Mercedes-Benz C-Class": [
            ("C200", "1496CC", "Saloon"),
            ("C300", "1991CC", "Saloon"),
        ],
        "Mercedes-Benz E-Class": [
            ("E200", "1991CC", "Saloon"),
            ("E300", "1991CC", "Saloon"),
        ],
        "Mercedes-Benz GLE": [
            ("GLE 300d", "1950CC", "SUV"),
        ],
    },
    "Audi AG": {
        "Audi A3": [
            ("1.4 TFSI", "1395CC", "Saloon"),
            ("2.0 TFSI", "1984CC", "Saloon"),
        ],
        "Audi A4": [
            ("1.4 TFSI", "1395CC", "Saloon"),
            ("2.0 TFSI", "1984CC", "Saloon"),
        ],
        "Audi Q5": [
            ("2.0 TFSI", "1984CC", "SUV"),
        ],
    },
    "Prince Motors (PACO)": {
        "Prince Pearl": [
            ("Standard", "800CC", "Hatchback"),
        ],
        "Prince DFSK": [
            ("Mini Truck", "1000CC", "Pickup"),
        ],
    },
}

for mfr_name, makes in vehicles_data.items():
    mfr = db.query(VehicleManufacturer).filter(VehicleManufacturer.name == mfr_name).first()
    if not mfr:
        mfr = VehicleManufacturer(name=mfr_name)
        db.add(mfr)
        db.flush()
    for make_name, variants in makes.items():
        mk = db.query(VehicleMake).filter(VehicleMake.manufacturer_id == mfr.id, VehicleMake.name == make_name).first()
        if not mk:
            mk = VehicleMake(manufacturer_id=mfr.id, name=make_name)
            db.add(mk)
            db.flush()
        for variant_name, engine_cc, body_type in variants:
            if not db.query(VehicleVariant).filter(VehicleVariant.make_id == mk.id, VehicleVariant.name == variant_name).first():
                db.add(VehicleVariant(make_id=mk.id, name=variant_name, engine_cc=engine_cc, body_type=body_type))

print(f"Added {len(vehicles_data)} manufacturers with makes and variants")

db.commit()
print("Seed data committed successfully!")
db.close()

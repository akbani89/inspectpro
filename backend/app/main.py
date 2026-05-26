from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import auth, companies, agents, inspections, reports, dashboard
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InspectPro API",
    description="Vehicle Pre-Insurance Inspection Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads/photos", exist_ok=True)
os.makedirs("uploads/pdfs", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router,        prefix="/api/auth",        tags=["Auth"])
app.include_router(companies.router,   prefix="/api/companies",   tags=["Companies"])
app.include_router(agents.router,      prefix="/api/agents",      tags=["Agents"])
app.include_router(inspections.router, prefix="/api/inspections", tags=["Inspections"])
app.include_router(reports.router,     prefix="/api/reports",     tags=["Reports"])
app.include_router(dashboard.router,   prefix="/api/dashboard",   tags=["Dashboard"])

@app.get("/")
def root():
    return {"status": "InspectPro API running", "version": "1.0.0"}

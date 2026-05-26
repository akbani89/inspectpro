from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.orm import Session
from datetime import datetime
import os

from app.database import get_db
from app.models import User, Inspection, Company, UserRole
from app.utils.auth import get_current_user
from app.services.pdf_service import render_pdf_html

router = APIRouter()


def _get_inspection_or_404(inspection_id: str, db: Session, current_user: User) -> Inspection:
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(404, "Inspection not found")
    if current_user.role == UserRole.agent and inspection.agent_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if current_user.role == UserRole.company_admin and inspection.company_id != current_user.company_id:
        raise HTTPException(403, "Access denied")
    return inspection


@router.get("/{inspection_id}/preview", response_class=HTMLResponse)
def preview_report(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return the HTML preview — useful for browser preview in the mobile app's WebView."""
    inspection = _get_inspection_or_404(inspection_id, db, current_user)
    company = db.query(Company).filter(Company.id == inspection.company_id).first()
    agent = inspection.agent

    html = render_pdf_html(inspection, company, agent)
    return HTMLResponse(content=html)


@router.post("/{inspection_id}/generate-pdf")
def generate_pdf(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate the PDF using WeasyPrint and save to disk. Returns download URL."""
    try:
        from weasyprint import HTML
    except ImportError:
        raise HTTPException(500, "PDF generation not available — install WeasyPrint on the server")

    inspection = _get_inspection_or_404(inspection_id, db, current_user)
    company = db.query(Company).filter(Company.id == inspection.company_id).first()
    agent = inspection.agent

    html_content = render_pdf_html(inspection, company, agent, base_url="http://localhost:8000")

    os.makedirs("uploads/pdfs", exist_ok=True)
    pdf_path = f"uploads/pdfs/{inspection.report_number.replace('/', '_')}.pdf"

    HTML(string=html_content, base_url="http://localhost:8000").write_pdf(pdf_path)

    inspection.pdf_url = f"/{pdf_path}"
    inspection.pdf_generated_at = datetime.utcnow()
    db.commit()

    return {
        "pdf_url": inspection.pdf_url,
        "generated_at": inspection.pdf_generated_at,
        "report_number": inspection.report_number,
    }


@router.get("/{inspection_id}/download")
def download_pdf(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = _get_inspection_or_404(inspection_id, db, current_user)
    if not inspection.pdf_url:
        raise HTTPException(400, "PDF not generated yet. Call /generate-pdf first.")

    path = inspection.pdf_url.lstrip("/")
    if not os.path.exists(path):
        raise HTTPException(404, "PDF file not found on server")

    filename = f"{inspection.report_number.replace('/', '_')}.pdf"
    return FileResponse(path, media_type="application/pdf", filename=filename)

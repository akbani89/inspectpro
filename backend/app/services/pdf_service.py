from jinja2 import Template
from datetime import datetime
import os

TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    color: #1a1a2e;
    background: #fff;
  }

  /* ── Header ── */
  .header {
    background: {{ brand_color }};
    color: #fff;
    padding: 24px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-left h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .header-left p  { font-size: 10px; opacity: 0.8; margin-top: 2px; }
  .header-right   { text-align: right; }
  .report-number  { font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 6px; }
  .report-date    { font-size: 9px; opacity: 0.75; margin-top: 4px; }

  /* ── Status badge ── */
  .status-bar {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 32px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-new      { background: #dcfce7; color: #166534; }
  .badge-damage   { background: #fef3c7; color: #92400e; }
  .badge-approved { background: #dbeafe; color: #1e40af; }

  /* ── Body layout ── */
  .body { padding: 24px 32px; }

  /* ── Section ── */
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: {{ brand_color }};
    border-bottom: 2px solid {{ brand_color }};
    padding-bottom: 4px;
    margin-bottom: 12px;
  }

  /* ── Grid rows ── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 20px; }
  .field  { display: flex; flex-direction: column; }
  .field-label { font-size: 8px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .field-value { font-size: 10px; font-weight: 500; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; min-height: 18px; }

  /* ── Damage table ── */
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th { background: {{ brand_color }}; color: #fff; padding: 6px 10px; text-align: left; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) td { background: #f8fafc; }
  .no-damage { text-align: center; color: #16a34a; font-weight: 600; padding: 16px; background: #f0fdf4; border-radius: 6px; }

  /* ── Accessories tags ── */
  .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .tag  { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 9px; }

  /* ── Valuation box ── */
  .valuation-box {
    background: {{ brand_color }};
    color: #fff;
    border-radius: 8px;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .valuation-box .label { font-size: 9px; opacity: 0.8; }
  .valuation-box .value { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }

  /* ── Documents checklist ── */
  .doc-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .doc-item { display: flex; align-items: center; gap: 6px; font-size: 9px; }
  .check    { width: 14px; height: 14px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; flex-shrink: 0; }
  .check-yes { background: #dcfce7; color: #16a34a; }
  .check-no  { background: #fee2e2; color: #dc2626; }

  /* ── Photos ── */
  .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .photo-item  { break-inside: avoid; }
  .photo-item img { width: 100%; height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
  .photo-caption { font-size: 8px; color: #64748b; margin-top: 3px; text-align: center; }

  /* ── Surveyor section ── */
  .surveyor-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 18px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 24px;
    padding: 14px 32px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .footer-left p   { font-size: 8px; color: #94a3b8; line-height: 1.5; }
  .signature-line  { width: 140px; border-top: 1px solid #334155; padding-top: 4px; font-size: 8px; color: #64748b; margin-top: 24px; }

  .divider { border: none; border-top: 1px solid #f1f5f9; margin: 16px 0; }

  /* prevent page breaks inside sections */
  .section { page-break-inside: avoid; }
</style>
</head>
<body>

<!-- ── HEADER ── -->
<div class="header">
  <div class="header-left">
    <h1>{{ company_name }}</h1>
    <p>Pre-Insurance Vehicle Inspection Report</p>
  </div>
  <div class="header-right">
    <div class="report-number">{{ report_number }}</div>
    <div class="report-date">Dated: {{ report_date }}</div>
  </div>
</div>

<!-- ── STATUS BAR ── -->
<div class="status-bar">
  <span>Status:</span>
  {% if is_new_vehicle %}
    <span class="badge badge-new">New Vehicle — No Damage</span>
  {% elif damages %}
    <span class="badge badge-damage">Pre-existing Damage Noted</span>
  {% else %}
    <span class="badge badge-new">No Damage Observed</span>
  {% endif %}
  <span style="margin-left:auto;font-size:9px;color:#64748b;">Inspected by: {{ agent_name }}</span>
</div>

<div class="body">

  <!-- ── 1. PROPOSAL DETAILS ── -->
  <div class="section">
    <div class="section-title">Proposal Details</div>
    <div class="grid-3">
      <div class="field"><span class="field-label">Insurer</span><span class="field-value">{{ insurer_name or '—' }}</span></div>
      <div class="field"><span class="field-label">Branch</span><span class="field-value">{{ branch_name or '—' }}</span></div>
      <div class="field"><span class="field-label">Underwriter</span><span class="field-value">{{ underwriter_name or '—' }}</span></div>
      <div class="field"><span class="field-label">Request Date</span><span class="field-value">{{ request_date or '—' }}</span></div>
      <div class="field"><span class="field-label">Insured Name</span><span class="field-value">{{ insured_name or '—' }}</span></div>
      <div class="field"><span class="field-label">Contact No.</span><span class="field-value">{{ insured_contact or '—' }}</span></div>
      <div class="field"><span class="field-label">CNIC No.</span><span class="field-value">{{ insured_cnic or '—' }}</span></div>
      <div class="field" style="grid-column: span 2"><span class="field-label">Address</span><span class="field-value">{{ insured_address or '—' }}</span></div>
    </div>
  </div>

  <!-- ── 2. VEHICLE DETAILS ── -->
  <div class="section">
    <div class="section-title">Vehicle Details</div>
    <div class="grid-3">
      <div class="field"><span class="field-label">Manufacturer</span><span class="field-value">{{ manufacturer or '—' }}</span></div>
      <div class="field"><span class="field-label">Make / Model</span><span class="field-value">{{ make or '—' }}</span></div>
      <div class="field"><span class="field-label">Variant</span><span class="field-value">{{ model_variant or '—' }}</span></div>
      <div class="field"><span class="field-label">Engine CC</span><span class="field-value">{{ engine_cc or '—' }}</span></div>
      <div class="field"><span class="field-label">Registration No.</span><span class="field-value">{{ registration_no or '—' }}</span></div>
      <div class="field"><span class="field-label">Reg. Year</span><span class="field-value">{{ registration_year or '—' }}</span></div>
      <div class="field"><span class="field-label">Mfg. Year</span><span class="field-value">{{ manufacturing_year or '—' }}</span></div>
      <div class="field"><span class="field-label">Engine No.</span><span class="field-value">{{ engine_no or '—' }}</span></div>
      <div class="field"><span class="field-label">Chassis No.</span><span class="field-value">{{ chassis_no or '—' }}</span></div>
      <div class="field"><span class="field-label">Color</span><span class="field-value">{{ color or '—' }}</span></div>
      <div class="field"><span class="field-label">ODO Reading</span><span class="field-value">{% if odometer_reading %}{{ "{:,}".format(odometer_reading) }} km{% else %}—{% endif %}</span></div>
      <div class="field"><span class="field-label">Body Type</span><span class="field-value">{{ body_type or '—' }}</span></div>
      <div class="field"><span class="field-label">Usage</span><span class="field-value">{{ usage_type or '—' }}</span></div>
      <div class="field"><span class="field-label">Assembly</span><span class="field-value">{{ assembly or '—' }}</span></div>
    </div>
  </div>

  <!-- ── 3. ACCESSORIES ── -->
  <div class="section">
    <div class="section-title">Accessories</div>
    <div class="grid-2">
      <div>
        <span class="field-label">Factory Fitted</span>
        <div class="tags">
          {% for item in factory_accessories %}
            <span class="tag">{{ item }}</span>
          {% else %}
            <span style="color:#94a3b8;font-size:9px;">None listed</span>
          {% endfor %}
        </div>
      </div>
      <div>
        <span class="field-label">Additional / Aftermarket</span>
        <div class="tags">
          {% for item in additional_accessories %}
            <span class="tag">{{ item }}</span>
          {% else %}
            <span style="color:#94a3b8;font-size:9px;">None</span>
          {% endfor %}
        </div>
      </div>
    </div>
    {% if accessories_notes %}
    <p style="margin-top:8px;font-size:9px;color:#475569;">{{ accessories_notes }}</p>
    {% endif %}
  </div>

  <!-- ── 4. BODY OBSERVATIONS ── -->
  <div class="section">
    <div class="section-title">Body Observations</div>
    {% if damages and damages|length > 0 %}
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Part / Location</th>
          <th>Damage Type</th>
          <th>Severity</th>
        </tr>
      </thead>
      <tbody>
        {% for d in damages %}
        <tr>
          <td>{{ loop.index }}</td>
          <td>{{ d.part or d }}</td>
          <td>{{ d.type or '—' }}</td>
          <td>{{ d.severity or '—' }}</td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
    {% else %}
    <div class="no-damage">✓ No damage or scratches observed</div>
    {% endif %}

    <div class="grid-2" style="margin-top:12px;">
      <div class="field"><span class="field-label">Missing Factory Items</span><span class="field-value">{{ missing_items or 'Nil' }}</span></div>
      <div class="field"><span class="field-label">Alterations / Modifications</span><span class="field-value">{{ alterations or 'Nil' }}</span></div>
    </div>
    {% if damage_notes %}
    <div style="margin-top:8px;font-size:9px;color:#475569;background:#fef9ee;padding:8px 10px;border-radius:6px;border-left:3px solid #f59e0b;">{{ damage_notes }}</div>
    {% endif %}
  </div>

  <!-- ── 5. VALUATION ── -->
  <div class="section">
    <div class="section-title">Insured Estimate Values</div>
    <div class="valuation-box">
      <div>
        <div class="label">Current Market Value</div>
        <div class="value">{% if market_value %}PKR {{ "{:,.0f}".format(market_value) }}{% else %}—{% endif %}</div>
      </div>
      {% if additional_accessories_value and additional_accessories_value > 0 %}
      <div style="text-align:right">
        <div class="label">Additional Accessories Value</div>
        <div style="font-size:14px;font-weight:600;">PKR {{ "{:,.0f}".format(additional_accessories_value) }}</div>
      </div>
      {% endif %}
    </div>
  </div>

  <!-- ── 6. PHOTOS ── -->
  {% if photos %}
  <div class="section">
    <div class="section-title">Inspection Photos</div>
    <div class="photos-grid">
      {% for photo in photos %}
      <div class="photo-item">
        <img src="{{ base_url }}{{ photo.url }}" alt="{{ photo.caption or 'Inspection photo' }}"/>
        <div class="photo-caption">{{ photo.caption or photo.photo_type | title }}</div>
      </div>
      {% endfor %}
    </div>
  </div>
  {% endif %}

  <!-- ── 7. DOCUMENTS RECEIVED ── -->
  <div class="section">
    <div class="section-title">Documents Received</div>
    <div class="doc-list">
      {% set docs = [
        ('reg_book', 'Registration Book'),
        ('sale_invoice', 'Sale Invoice (New Vehicle)'),
        ('cnic', 'CNIC of Insured'),
        ('import_docs', 'Import Documents'),
        ('bill_of_entry', 'Bill of Entry / Lading'),
      ] %}
      {% for key, label in docs %}
      {% set received = documents_received.get(key, False) %}
      <div class="doc-item">
        <span class="check {{ 'check-yes' if received else 'check-no' }}">{{ '✓' if received else '✗' }}</span>
        <span>{{ label }}</span>
      </div>
      {% endfor %}
    </div>
  </div>

  <!-- ── 8. SURVEYOR DETAILS ── -->
  <div class="section">
    <div class="section-title">Surveyor Details</div>
    <div class="surveyor-box">
      <div class="field"><span class="field-label">Surveyor Name</span><span class="field-value">{{ agent_name }}</span></div>
      <div class="field"><span class="field-label">Place of Inspection</span><span class="field-value">{{ inspection_place or '—' }}</span></div>
      <div class="field"><span class="field-label">Date &amp; Time</span><span class="field-value">{{ inspection_datetime or '—' }}</span></div>
    </div>
    {% if surveyor_remarks %}
    <p style="margin-top:8px;font-size:9px;color:#475569;font-style:italic;">Remarks: {{ surveyor_remarks }}</p>
    {% endif %}
  </div>

</div><!-- end body -->

<!-- ── FOOTER ── -->
<div class="footer">
  <div class="footer-left">
    <p><strong>ISSUED WITHOUT PREJUDICE</strong></p>
    <p style="margin-top:4px;">{{ footer_text or 'This report is prepared based on visual inspection only and does not constitute a guarantee of the vehicle condition.' }}</p>
  </div>
  <div style="text-align:right;">
    <div class="signature-line">For {{ company_name }}</div>
  </div>
</div>

</body>
</html>
"""


def render_pdf_html(inspection, company, agent, base_url: str = "http://localhost:8000") -> str:
    """Render the Jinja2 HTML template for a given inspection."""
    template = Template(TEMPLATE)

    docs = inspection.documents_received or {}

    return template.render(
        company_name=company.name,
        brand_color=company.report_header_color or "#1a56db",
        footer_text=company.report_footer_text,
        report_number=inspection.report_number,
        report_date=datetime.utcnow().strftime("%d/%m/%Y"),

        agent_name=agent.full_name,
        inspection_place=inspection.inspection_place,
        inspection_datetime=inspection.inspection_date.strftime("%d-%b-%Y %I:%M %p") if inspection.inspection_date else None,

        # Proposal
        insurer_name=inspection.insurer_name,
        branch_name=inspection.branch_name,
        underwriter_name=inspection.underwriter_name,
        request_date=inspection.request_date.strftime("%d-%m-%Y") if inspection.request_date else None,
        insured_name=inspection.insured_name,
        insured_contact=inspection.insured_contact,
        insured_address=inspection.insured_address,
        insured_cnic=inspection.insured_cnic,

        # Vehicle
        manufacturer=inspection.manufacturer,
        make=inspection.make,
        model_variant=inspection.model_variant,
        engine_cc=inspection.engine_cc,
        registration_no=inspection.registration_no,
        registration_year=inspection.registration_year,
        manufacturing_year=inspection.manufacturing_year,
        engine_no=inspection.engine_no,
        chassis_no=inspection.chassis_no,
        color=inspection.color,
        odometer_reading=inspection.odometer_reading,
        body_type=inspection.body_type,
        usage_type=inspection.usage_type,
        assembly=inspection.assembly,

        # Accessories
        factory_accessories=inspection.factory_accessories or [],
        additional_accessories=inspection.additional_accessories or [],
        accessories_notes=inspection.accessories_notes,

        # Body
        is_new_vehicle=inspection.is_new_vehicle,
        damages=inspection.damages or [],
        damage_notes=inspection.damage_notes,
        missing_items=inspection.missing_items,
        alterations=inspection.alterations,

        # Valuation
        market_value=inspection.market_value,
        additional_accessories_value=inspection.additional_accessories_value,

        # Docs + photos
        documents_received=docs,
        photos=inspection.photos,
        base_url=base_url,

        surveyor_remarks=inspection.surveyor_remarks,
    )

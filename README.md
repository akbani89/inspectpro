# InspectPro — Vehicle Pre-Insurance Inspection Platform

A complete SaaS platform for insurance survey companies — mobile app (iOS + Android), Python backend API, and web admin dashboard.

---

## What's in this codebase

```
inspectpro/
├── backend/          ← Python (FastAPI) REST API + PDF generation
├── mobile/           ← React Native app (iOS + Android via Expo)
├── admin-web/        ← Web admin dashboard (plain HTML, no build needed)
├── docker-compose.yml
└── README.md
```

---

## Quick Start (Run Everything Locally in 5 Minutes)

### Prerequisites
Install these once on your computer:
- **Docker Desktop** → https://www.docker.com/products/docker-desktop
- **Node.js 20+** → https://nodejs.org
- **Expo Go app** on your phone → App Store / Play Store (search "Expo Go")

### Step 1 — Start the backend + database

```bash
cd inspectpro
docker compose up -d
```

Wait ~30 seconds. The API is now running at **http://localhost:8000**

Verify it's working: open http://localhost:8000 in your browser. You should see:
```json
{"status": "InspectPro API running", "version": "1.0.0"}
```

### Step 2 — Create your first Super Admin account

Run this once to seed a super admin:
```bash
docker compose exec api python -c "
from app.database import SessionLocal
from app.models import User, UserRole
from app.utils.auth import hash_password
db = SessionLocal()
u = User(email='admin@inspectpro.com', hashed_password=hash_password('Admin@1234'), full_name='Super Admin', role=UserRole.super_admin)
db.add(u); db.commit(); print('Super admin created')
"
```

### Step 3 — Open the Web Admin Dashboard

Open **http://localhost:3000** in your browser.

Login with:
- Email: `admin@inspectpro.com`
- Password: `Admin@1234`

From the dashboard you can:
- Register survey companies
- Add agents
- View and approve inspections
- Generate PDF reports

### Step 4 — Run the Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

> **Important:** Change the API URL in `mobile/src/services/api.ts`:
> ```
> export const API_BASE = 'http://YOUR_COMPUTER_IP:8000/api';
> ```
> Find your IP: Mac → `ifconfig | grep inet` · Windows → `ipconfig`

---

## How Survey Companies Sign Up

Companies self-register via the API:

```
POST http://localhost:8000/api/auth/register-company
Content-Type: application/json

{
  "company_name": "Prism Surveyors",
  "company_email": "info@prismsurveyors.com",
  "admin_full_name": "Aman Gull",
  "admin_email": "aman@prismsurveyors.com",
  "password": "SecurePass123"
}
```

You can also build a public registration page using this endpoint.

---

## User Roles

| Role | Access |
|---|---|
| **Super Admin** | Full platform access — all companies, all inspections |
| **Company Admin** | Own company only — manage agents, approve inspections, branding |
| **Field Agent** | Own inspections only — create, photo upload, submit, PDF download |

---

## Full API Reference

Interactive docs auto-generated at: **http://localhost:8000/docs**

### Key endpoints:

| Method | URL | Description |
|---|---|---|
| POST | `/api/auth/login` | Login (returns JWT token) |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/register-company` | Register new company |
| GET | `/api/inspections` | List inspections (filtered) |
| POST | `/api/inspections` | Create new inspection |
| PATCH | `/api/inspections/{id}` | Update inspection |
| POST | `/api/inspections/{id}/submit` | Submit for review |
| POST | `/api/inspections/{id}/approve` | Approve (admin only) |
| POST | `/api/inspections/{id}/photos` | Upload photo |
| POST | `/api/reports/{id}/generate-pdf` | Generate PDF report |
| GET | `/api/reports/{id}/download` | Download PDF |
| GET | `/api/reports/{id}/preview` | HTML preview |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/agents` | List agents (admin) |
| POST | `/api/agents` | Add agent (admin) |
| GET | `/api/companies/me` | Company details |
| PATCH | `/api/companies/me` | Update company branding |

---

## Deploying to Production (Go Live)

### Option A — Railway.app (Easiest — recommended)

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Push this repo to GitHub first, then connect it
4. Railway auto-detects Docker and deploys everything
5. Add environment variables in Railway dashboard:
   - `SECRET_KEY` → generate with: `python -c "import secrets; print(secrets.token_hex(32))"`
   - `DATABASE_URL` → Railway provides this automatically when you add PostgreSQL

**Cost:** ~$5/month for a small app

### Option B — DigitalOcean Droplet

1. Create a $6/month Ubuntu droplet at https://digitalocean.com
2. SSH in and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Clone your repo and run:
   ```bash
   SECRET_KEY=your-long-random-key docker compose up -d
   ```
4. Point your domain's DNS A record to the droplet IP

### After deploying

Update the mobile app's API URL in `mobile/src/services/api.ts`:
```typescript
export const API_BASE = 'https://your-domain.com/api';
```

---

## Publishing the Mobile App

### Android (Google Play Store)

1. Create Google Play developer account ($25 one-time) at https://play.google.com/console
2. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   eas build --platform android
   ```
3. Upload the `.aab` file to Google Play Console
4. Fill in store listing, screenshots, and submit for review (~3-7 days)

### iOS (Apple App Store)

1. Create Apple Developer account ($99/year) at https://developer.apple.com
2. Build for iOS:
   ```bash
   eas build --platform ios
   ```
3. Upload to App Store Connect using Transporter app
4. Submit for review (~1-3 days)

### App branding before publishing

Edit `mobile/app.json`:
```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png" }
  }
}
```

---

## Customising the PDF Report

Edit `backend/app/services/pdf_service.py`.

The PDF is built from an HTML/CSS template using Jinja2 + WeasyPrint. You can:
- Change colors → each company sets their own `report_header_color` in Company Settings
- Add your logo → upload via `POST /api/companies/me/logo`
- Change layout → edit the `TEMPLATE` string in `pdf_service.py`

---

## Adding Subscription Billing (Stripe)

1. Create Stripe account at https://stripe.com
2. Add to `.env`: `STRIPE_SECRET_KEY=sk_live_...`
3. Create products in Stripe dashboard:
   - Starter Plan: $29/month (up to 5 agents)
   - Professional: $79/month (up to 20 agents)
   - Enterprise: $199/month (unlimited)
4. Use Stripe's hosted checkout — no code needed for the billing page

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing key (min 32 chars, random) |
| `ENVIRONMENT` | ✅ | `development` or `production` |
| `AWS_ACCESS_KEY_ID` | Optional | For S3 photo storage in production |
| `AWS_SECRET_ACCESS_KEY` | Optional | For S3 photo storage in production |
| `AWS_BUCKET_NAME` | Optional | S3 bucket name |
| `STRIPE_SECRET_KEY` | Optional | For subscription billing |
| `SENDGRID_API_KEY` | Optional | For email notifications |

---

## Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Mobile App | React Native + Expo | One codebase → iOS + Android |
| Backend API | Python FastAPI | Fast, auto-documented, easy to hire for |
| Database | PostgreSQL | Battle-tested, scales well |
| PDF Engine | WeasyPrint + Jinja2 | HTML/CSS → PDF, full design control |
| Auth | JWT (python-jose) | Stateless, works great for mobile |
| Admin Web | Plain HTML + Axios | No build step, instant to deploy |
| Hosting | Docker Compose | Works on any server or cloud |

---

## Support & Next Steps

**Immediate next steps:**
1. Run locally to test the full flow
2. Deploy to Railway or DigitalOcean
3. Customise the PDF template with your branding
4. Register your first test company via the API
5. Build the public signup page for companies

**Future features to add:**
- WhatsApp integration (Twilio API)
- Email notifications on submission/approval
- Analytics dashboard with charts
- Offline mode with local SQLite sync
- Custom form fields per company
- QR code on PDF for verification

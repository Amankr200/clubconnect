# ClubConnect

**A full-stack campus club and society management platform for BPIT — built with React, Express, and PostgreSQL (Neon).**

ClubConnect centralises every aspect of campus society life: browsing clubs, posting Instagram-style stories, requesting event/venue approvals through a multi-tier workflow, and providing role-specific dashboards for students, faculty, HODs, deans, the principal, and the platform administrator.

---

## Features

| Feature                          | Description                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Club Stories**                 | Instagram-style 24-hour stories from 20+ active societies, with view and click tracking                                        |
| **Event Management**             | Create events with venue booking, photo upload (base-64), time-slot conflict detection, and RSVP                               |
| **Multi-Tier Approval Workflow** | Student Coordinator → Faculty Coordinator → Principal; HOD/Faculty requests route directly to Principal                        |
| **Role-Based Dashboards**        | Custom dashboards for every actor: Student, Student Coordinator, Faculty Coordinator, HOD, Dean, Principal, and Platform Admin |
| **Venue Booking**                | Availability checker with time-slot overlap prevention across concurrent active requests                                       |
| **Society Management**           | Rich society profiles (logo, banner, description, vision, mission, coordinators) editable by authorised roles                  |
| **Bug Reporting**                | In-app bug report modal persisted to the database and visible in the Admin dashboard                                           |
| **Email Notifications**          | Nodemailer-powered event notifications wired to the approval pipeline                                                          |
| **JWT Authentication**           | Stateless, 7-day JWT tokens stored in `localStorage`; token validated on every page load via `/api/auth/me`                    |
| **Campus Calendar**              | FullCalendar integration showing all approved events                                                                           |
| **Dark / Light Theme**           | Theme context with persistent user preference

---

## Tech Stack

### Frontend

| Technology       | Version | Purpose                 |
| ---------------- | ------- | ----------------------- |
| React            | 19      | UI library              |
| Vite             | 8       | Build tool & dev server |
| React Router DOM | 7       | Client-side routing     |
| FullCalendar     | 6       | Campus event calendar   |
| Lucide React     | 1       | Icon library            |
| Oxlint           | 1       | Fast JavaScript linter  |

### Backend

| Technology        | Version | Purpose                         |
| ----------------- | ------- | ------------------------------- |
| Node.js + Express | 5       | REST API server                 |
| PostgreSQL (Neon) | —       | Primary database (cloud-hosted) |
| `pg`              | 8       | PostgreSQL client               |
| `bcryptjs`        | 2       | Password hashing                |
| `jsonwebtoken`    | 9       | JWT authentication              |
| `nodemailer`      | 7       | Email notifications             |
| `dotenv`          | 16      | Environment variable loading    |
| `nodemon`         | 3       | Dev auto-restart                |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/clubconnect.git
cd clubconnect
```

### 2. Configure environment variables

Create a `.env` file inside the `backend/` directory:

```bash
cp backend/.env.example backend/.env   # if an example file exists, otherwise create manually
```

Populate the following variables (see [Environment Variables](#environment-variables) for details):

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
JWT_SECRET=your_super_secret_key
PORT=5001

# Optional — for email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
# Optional; defaults to SMTP_USER
SMTP_FROM=ClubConnect <your_email@gmail.com>
```

For Gmail, `SMTP_PASS` must be a Google **App Password**, not your normal account
password. Enable 2-Step Verification before creating one. Restart the backend
after changing `backend/.env`; environment variables are read when the server
starts. Resend can be used instead by setting `RESEND_API_KEY` and
`RESEND_FROM`.

### 3. Install dependencies

Install **frontend** and **backend** dependencies separately:

```bash
# Frontend (root)
npm install

# Backend
cd backend
npm install
cd ..
```

### 4. Seed the database

The `initDb()` function in [`backend/db.js`](backend/db.js) runs automatically on server start and creates all required tables. To populate demo users and societies, run the seed script:

```bash
cd backend
npm run seed
```

> **Note:** `backend/seed.js` is listed in `.gitignore` because it contains plaintext passwords. Refer to your team lead for the seed file.

### 5. Run in development

Open **two terminals**:

```bash
# Terminal 1 — Backend API (port 5001)
npm run server

# Terminal 2 — Frontend dev server (port 5173)
npm run dev
```

The Vite proxy in [`vite.config.js`](vite.config.js) forwards all `/api` requests from `localhost:5173` to `localhost:5001`, so no CORS configuration is needed during development.

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Build for production

```bash
npm run build        # outputs to dist/
npm run server       # Express serves dist/ as static files + API
```

The Express server in [`backend/server.js`](backend/server.js) detects a `dist/index.html` and serves the SPA alongside the REST API from a single port.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                        │
│                                                                 │
│  React 19 + Vite 6  ·  React Router DOM 7  ·  FullCalendar 6   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │  AuthContext │  │   ThemeContext    │  │   src/api/*.js    │ │
│  │  (JWT + user)│  │  (dark/light)    │  │  (fetch wrappers) │ │
│  └──────────────┘  └──────────────────┘  └────────┬──────────┘ │
│                                                    │ /api/*     │
└────────────────────────────────────────────────────┼────────────┘
                          Vite proxy (dev)            │
                          Express static (prod)       │
                                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express API  (port 5001)                      │
│                       backend/server.js                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Routes                                                  │   │
│  │  /api/auth          /api/societies    /api/stories       │   │
│  │  /api/venue-bookings  /api/bugs       /api/admin         │   │
│  └───────────────────────────┬─────────────────────────────┘   │
│                               │                                  │
│  ┌────────────────────────────▼──────────────────────────────┐  │
│  │  Middleware          Models                Notifications   │  │
│  │  requireAuth.js      userModel.js          nodemailer      │  │
│  │  (JWT verify)        societyModel.js                       │  │
│  │                      venueBookingModel.js                  │  │
│  │                      storyModel.js                         │  │
│  │                      bugReportModel.js                     │  │
│  │                      adminModel.js                         │  │
│  └────────────────────────────┬──────────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────────┘
                                │  pg (node-postgres)
                                ▼
              ┌─────────────────────────────────┐
              │   PostgreSQL — Neon (cloud)      │
              │                                  │
              │  users · societies · events       │
              │  venue_bookings · stories         │
              │  bug_reports · review_trail       │
              └─────────────────────────────────┘
```

---

## Role System

ClubConnect uses a 7-tier role hierarchy enforced on both the frontend (dashboard routing) and the backend (middleware guards).

| Role                    |
| ----------------------- |
| **Platform Admin**      |
| **Principal**           |
| **Dean**                |
| **Head of Department**  |
| **Faculty Coordinator** |
| **Student Coordinator** |
| **Student**             |

Each role has access to dedicated dashboards and workflows based on its permissions.

---

## Event Approval Workflow

```
Student Coordinator
       │
       ▼  (status: pending_faculty)
Faculty Coordinator / HOD ──reviews──► request changes → back to Student Coordinator
       │
       ▼  (status: pending_principal)
  Principal / Dean ──reviews──► request changes → back to Faculty Coordinator
       │
       ▼  (status: approved)
    Event is live ✅
```

- Requests can be returned for modifications, and each stage maintains an approval trail for auditability.
- Change requests carry free-text notes visible to the submitter in their dashboard.

---

## License

This project is intended for academic and institutional use at BPIT. All rights reserved.

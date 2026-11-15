# CareSync — Elderly Care & Medication Management Platform
**PromptWars × Catalyst Challenge | Google Antigravity**  
*A smart, secure, accessible, and collaborative healthcare platform empowering seniors, caregivers, and families.*

---

## 🌟 1. Project Overview & Problem Statement

Elderly individuals living independently or with distributed families face critical healthcare challenges:
- **Medication Non-Adherence & Polypharmacy:** Multiple prescriptions, varying frequencies, and complex instructions often lead to missed or duplicated doses.
- **Caregiver Information Asymmetry:** Family members and professional nurses lack real-time visibility into whether daily medications were taken as prescribed.
- **Forgotten Clinical Appointments:** Critical specialist visits (geriatrics, cardiology, endocrinology) are easily overlooked without proactive multi-stakeholder reminders.
- **Accessibility Barriers:** Most healthcare software suffers from tiny touch targets, low contrast, and high cognitive load that alienates older adults.

**CareSync** solves this by establishing a synchronized healthcare ecosystem connecting the **Elderly Senior**, their **Primary Caregiver/Nurse**, and their **Family Members** around a shared profile protected by **cryptographic passcode-based delegation**.

---

## 🛠️ 2. Technology Stack

CareSync strictly adheres to the mandated technology stack:

- **Frontend:** React 18, Vite, JavaScript, Tailwind CSS, React Router v6, Chart.js (`react-chartjs-2`), Lucide Icons.
- **Backend:** Node.js (v20/v24), Express.js REST API, Helmet, CORS, Express-Rate-Limit, bcryptjs.
- **Database:** Google Cloud Firestore (Native NoSQL Mode).
- **Authentication:** Firebase Authentication & Secure Passcode-based Caregiver/Family Delegation.
- **Google Cloud Services:**
  - **Google Cloud Run:** Multi-stage containerized deployment serving both REST APIs and the optimized static React SPA from a single container.
  - **Google Cloud Scheduler:** Automated cron execution triggering `/api/cron/process-reminders` every 15 minutes for proactive dose alerts, missed dose notifications, and appointment reminders.
  - **Firebase Admin SDK & Firebase Client SDK:** Real-time data synchronization and JWT token verification.
- **Email & Notifications:** Nodemailer with configurable SMTP credentials and an automated **Development Simulation Mode**.

---

## 🔒 3. Security, Privacy & Passcode Delegation Model

Healthcare data requires uncompromising security:
1. **Server-Side Bcrypt Passcode Hashing:**
   - Caregivers generate a 6-character high-entropy alphanumeric passcode (e.g., `CR-7842`).
   - The passcode is immediately hashed using `bcrypt` (10 salt rounds) before saving to Firestore.
   - **Plaintext passcodes are never saved in the database or exposed in frontend code.**
2. **Brute-Force Rate Limiting:**
   - Passcode verification (`POST /api/invitations/verify-and-join`) is strictly limited to **5 attempts per IP per 15-minute window** via Express rate-limiting middleware.
3. **Role-Based Access Control (RBAC):**
   - **Senior / Elderly User:** Access personal daily checklist, mark doses as taken, listen to audio instructions, view appointments and profile.
   - **Caretaker / Nurse:** Full administrative access — add/edit prescriptions, manage schedules, track adherence, schedule appointments, generate passcodes, and receive missed dose alerts.
   - **Family Member:** Read-only access — monitor daily schedules, observe adherence trends, view clinical appointments, and receive important care team notifications.
4. **Tamper-Resistant Audit Trail:**
   - Every state change (medication added, dose taken, missed dose flagged, appointment scheduled, member joined) is permanently recorded in the `activityLogs` collection with actor UID, role, timestamp, and details.

---

## 📊 4. Mathematical Adherence Engine

CareSync calculates adherence with strict mathematical accuracy without ever penalizing seniors for doses scheduled in the future:

$$\text{Adherence Rate (\%)} = \frac{\text{Doses Marked Taken}}{\text{Total Past Scheduled Doses} - \text{Valid Clinically Skipped Doses}} \times 100$$

- **Future Invariance:** Doses scheduled ahead of the current timestamp (`scheduledTimestamp > now`) remain in `upcoming` status and are **excluded** from the denominator.
- **Grace Period:** A dose is not flagged as `missed` until 60 minutes after its scheduled time has elapsed without action.
- **Clinical Skips:** If a physician advises holding a dose (e.g. low blood pressure), marking it as `skipped` with a clinical note removes it from the denominator, preserving an accurate compliance metric.
- **Punctuality Rating:** Tracks doses taken within 45 minutes of scheduled time.

---

## 📧 5. Proactive Notification Engine & Development Simulation Mode

CareSync proactively sends automated alerts for:
1. **Upcoming Medication Doses:** Dispatched ~30 minutes prior to the scheduled dose.
2. **Missed Medication Doses:** Dispatched to caretakers and family after the 60-minute grace period expires.
3. **Doctor Appointments:** Dispatched 24 hours prior to scheduled clinic visits.

### Development Simulation Mode
If SMTP environment variables (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) are unconfigured, CareSync **automatically activates Development Simulation Mode**:
- Renders rich responsive HTML emails, logs the delivery receipt to the server console, and stores the alert in the database with status `simulated`.
- The in-app Notification Bell displays real-time delivery alerts and lets evaluators test notification triggers with one click.
- **CareSync never pretends an email was dispatched if SMTP credentials are absent.**

---

## ♿ 6. Accessibility System Designed for Seniors

- **Senior Mode (`/senior-view`):** Ultra-simplified daily view featuring extra-large touch targets (min 60px height), high-contrast text, and single-tap "I Took This Medicine" confirmation.
- **Web Speech Synthesis (Text-to-Speech):** Reads scheduled medications, dosages, and instructions aloud with a calm, clear cadence for visually impaired seniors.
- **Accessibility Toolbar:** Allows users to dynamically scale font sizes from **100% up to 150%** across the entire application and toggle **High Contrast Mode** on or off.
- **One-Click Emergency SOS:** Instantly surfaces emergency contacts (family, primary nurse, and 911/112 dialer) from any page.

---

## 🚀 7. Step-by-Step Installation & Local Development

### Prerequisites
- Node.js (v18, v20, or v24)
- npm (v9+)
- Git

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/caresync.git
cd caresync
```

### Step 2: Install All Dependencies
```bash
npm run install:all
```
*(Installs dependencies across root, backend, and frontend).*

### Step 3: Configure Environment Variables (Optional)
CareSync runs out of the box in Development Simulation Mode! To connect real services, copy the example files:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

### Step 4: Run Automated Tests
```bash
npm test
```
*Executes all 11 unit & integration tests covering adherence math, passcode bcrypt security, and API endpoints.*

### Step 5: Start the Development Server
```bash
npm run dev
```
- **Frontend SPA:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 👨‍⚖️ 8. Evaluator / Competition Quick-Start Guide

For PromptWars × Catalyst judges:
1. Open the application at [http://localhost:5173](http://localhost:5173) (or your deployed Cloud Run URL).
2. On the **Login Page**, use the **Evaluator Fast Login** buttons:
   - **👩‍⚕️ Nurse / Caregiver (Sarah Jenkins):** Full administrative view, add prescriptions, schedule appointments, generate passcodes.
   - **👴 Senior User (Robert Harrison, 78):** Daily medication checklist, mark doses taken, listen to audio instructions.
   - **👨‍👦 Family Member (Michael Harrison):** Monitor adherence trends, view clinical appointments, receive alerts.
3. In the top navigation bar, click the **Notification Bell** to:
   - Click **"Run Scheduler Now"** to simulate Google Cloud Scheduler executing automated dose checks.
   - Click **"Test Email Dispatch"** to test live or simulated Nodemailer delivery.
4. Click **"Launch Senior Mode"** to experience the senior-accessible interface.

---

## ☁️ 9. Google Cloud Run Deployment

CareSync includes an optimized multi-stage `Dockerfile` that packages both the React production bundle and the Express backend into a single high-performance container.

### Deploying to Google Cloud Run
```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Build and Deploy to Cloud Run
gcloud run deploy caresync \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,CRON_SECRET=your-secure-cron-secret-2026
```

### Setting up Google Cloud Scheduler
```bash
gcloud scheduler jobs create http caresync-reminder-job \
  --schedule="*/15 * * * *" \
  --uri="https://YOUR_CLOUD_RUN_URL/api/cron/process-reminders" \
  --http-method=POST \
  --headers="X-Cron-Secret=your-secure-cron-secret-2026"
```

---

## 🏆 10. Competition Compliance Checklist

| Evaluation Parameter | Requirement | CareSync Implementation |
| :--- | :--- | :--- |
| **Repository Size** | Strictly < 10 MB | **Compliant:** Excluded node_modules, build artifacts, and heavy assets. |
| **Git Branches** | Only ONE branch | **Compliant:** Single `main` branch development. |
| **Full-Stack Working App** | Not just static demo | **Compliant:** Fully connected React 18 + Node/Express + Firestore + Nodemailer. |
| **Passcode Delegation** | Secure caregiver sharing | **Compliant:** Bcrypt hashing, 72h expiry, 5-attempt rate-limit. |
| **Mathematical Adherence**| No future dose penalty | **Compliant:** Adherence engine verified by automated unit tests. |
| **Multi-Role RBAC** | Elderly, Caretaker, Family | **Compliant:** Three distinct permission sets and instant role switcher. |
| **Google Cloud Ready** | Cloud Run & Scheduler | **Compliant:** Containerized with health checks and scheduled cron webhook. |

---

## 📄 License
MIT License. Developed for the PromptWars × Catalyst Challenge.

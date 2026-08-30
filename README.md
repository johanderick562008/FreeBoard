# 🎓 FreeBoard

A web-based student timetable and connection management platform that helps students manage their timetables, connect with classmates, and quickly see who is available during a particular period.

## 🌐 Live Application

**Frontend:** https://freeboard-phi.vercel.app/

**Backend API:** https://free-board-ashen.vercel.app/

**API Health Check:** https://free-board-ashen.vercel.app/health

---

## 📌 About the Project

FreeBoard is designed to make it easier for students to coordinate with friends and classmates based on their college timetable.

Instead of repeatedly asking:

- "Who is free now?"
- "Who has lunch period?"
- "Are you free during the 3rd hour?"

students can use FreeBoard to view timetable information and compare schedules.

### Main Features

- Google authentication
- Student profiles
- Username management
- User search
- Connection requests
- Connection management
- Timetable creation and editing
- Timetable viewing
- Live schedule checking
- Schedule comparison between multiple users
- Secure session-based authentication

---

## ✨ Features

### 🔐 Google Authentication

Users can sign in using their Google account through Google OAuth.

### 👤 User Profiles

Users can manage:

- Username
- Display name
- Profile picture

### 🔎 User Search

Search for other FreeBoard users and send connection requests.

### 🤝 Connections

Users can:

- Send connection requests
- Accept requests
- Decline requests
- Remove connections
- Set nicknames for connections
- View their connections

### 🗓️ Timetable Management

Users can create, edit, save, and retrieve their college timetable.

### 🟢 Live Schedule

Check the schedule for a selected day and timetable period.

### 👥 Together

Compare the schedules of multiple users to find periods when friends are available together.

### 🔒 Secure Sessions

Authentication uses HTTP-only cookies and JWT-based sessions. Protected backend resources validate the current session.

---

## 🏗️ Project Structure

```text
FreeBoard/
│
├── backend/
│   ├── api/
│   │   └── index.py
│   ├── app/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── security.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── timetable.py
│   │   │   └── schedule.py
│   │   └── services/
│   ├── requirements.txt
│   └── vercel.json
│
├── frontend/
│   ├── index.html
│   ├── app.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── api.js
│   │   └── app.js
│   ├── api/
│   │   └── index.py
│   └── vercel.json
│
└── README.md
```

---

## 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic Settings
- Authlib
- Python-JOSE
- SlowAPI

### Authentication

- Google OAuth 2.0
- HTTP-only cookies
- JWT-based session tokens

### Database

- MySQL
- Aiven Cloud Database

### Deployment

- Vercel
- GitHub

---

## 🔄 Application Architecture

```text
                    ┌──────────────────────┐
                    │       Student        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      FreeBoard       │
                    │      Frontend        │
                    │      (Vercel)        │
                    └──────────┬───────────┘
                               │
                         HTTP / REST API
                               │
                               ▼
                    ┌──────────────────────┐
                    │      FastAPI         │
                    │       Backend        │
                    │      (Vercel)        │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌────────────────┐          ┌──────────────────┐
       │  Google OAuth  │          │   Aiven MySQL    │
       │ Authentication │          │    Database      │
       └────────────────┘          └──────────────────┘
```

---

## 🚀 Running the Backend Locally

### 1. Clone the repository

```bash
git clone https://github.com/johanderick562008/FreeBoard.git
cd FreeBoard
```

### 2. Navigate to the backend

```bash
cd backend
```

### 3. Create a virtual environment

Windows:

```cmd
python -m venv venv
```

Activate it:

```cmd
venv\Scripts\activate
```

### 4. Install dependencies

```cmd
pip install -r requirements.txt
```

### 5. Configure environment variables

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL=your_database_url

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback

JWT_SECRET=your_secret_key
JWT_EXPIRE_MINUTES=10080

FRONTEND_ORIGIN=http://localhost:5500

ENV=development
```

**Never commit `.env` to GitHub.**

### 6. Start FastAPI

From the `backend` directory:

```cmd
uvicorn api.index:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

## 🌐 Running the Frontend Locally

Serve the `frontend` directory using a local development server:

```cmd
cd frontend
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

Make sure the frontend API configuration points to the correct backend URL.

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL database connection URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL |
| `JWT_SECRET` | Secret used for signing session tokens |
| `JWT_EXPIRE_MINUTES` | Session expiration time |
| `FRONTEND_ORIGIN` | Frontend application URL |
| `ENV` | Environment such as `development` or `production` |

### Production Example

```env
DATABASE_URL=your_aiven_database_url

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://free-board-ashen.vercel.app/auth/google/callback

JWT_SECRET=your_production_secret
JWT_EXPIRE_MINUTES=10080

FRONTEND_ORIGIN=https://freeboard-phi.vercel.app
ENV=production
```

**Do not commit real credentials, passwords, API keys, or secrets to GitHub.**

---

## 🔑 Google OAuth Configuration

The Google OAuth authorized redirect URI must match the backend callback URL.

### Production

```text
https://free-board-ashen.vercel.app/auth/google/callback
```

### Local Development

```text
http://127.0.0.1:8000/auth/google/callback
```

---

## 📡 API Endpoints

### Authentication

```text
GET  /auth/google/login
GET  /auth/google/callback
POST /auth/logout
GET  /auth/me
```

### Users

```text
POST   /users/username
PATCH  /users/me
GET    /users/search
GET    /users/connections
POST   /users/connections/{id}
DELETE /users/connections/{id}
GET    /users/connections/incoming
POST   /users/connections/requests/{request_id}/accept
POST   /users/connections/requests/{request_id}/decline
PATCH  /users/connections/{user_id}/nickname
```

### Timetable

```text
GET /timetable/{user_id}
PUT /timetable/bulk
```

### Schedule

```text
GET /schedule/live
GET /schedule/together
```

### Health Check

```text
GET /health
```

---

## 🔒 Security

FreeBoard uses:

- Google OAuth authentication
- HTTP-only authentication cookies
- Secure cookies in production
- SameSite cookie protection
- JWT session tokens
- CORS configuration
- Rate limiting
- GZip middleware
- Server-side authentication checks

The backend does not trust a user ID supplied directly by the client for protected resources.

---

## 📦 Deployment

The project is deployed using Vercel.

### Backend

FastAPI entry point:

```text
backend/api/index.py
```

### Frontend

Production frontend:

```text
https://freeboard-phi.vercel.app/
```

Production backend:

```text
https://free-board-ashen.vercel.app/
```

---

## 🧪 Health Check

The backend provides:

```http
GET /health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

## 👨‍💻 Development Workflow

Check changes:

```cmd
git status
```

Stage changes:

```cmd
git add .
```

Commit:

```cmd
git commit -m "Describe your changes"
```

Push:

```cmd
git push origin main
```

---

## 🐛 Troubleshooting

### Backend returns 500

Check:

- Vercel deployment logs
- Required environment variables
- `requirements.txt`
- Python entry point
- Database credentials

### Google login fails

Check:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- Google Cloud authorized redirect URIs
- `FRONTEND_ORIGIN`

### User is redirected back to login

Check:

- Browser cookies are enabled
- Production cookies use HTTPS
- Frontend requests use `credentials: "include"`
- Backend CORS allows the production frontend origin

### Database connection fails

Verify `DATABASE_URL` and make sure the Aiven database is available.

---

## 📄 License

This project is currently intended as a personal/academic project.

Add an explicit open-source license if you decide to distribute the project under specific licensing terms.

---

## 👤 Author

**Johan Derick**

GitHub:  
https://github.com/johanderick562008/FreeBoard

---

## ⭐ Project

If you find FreeBoard useful, consider giving the repository a ⭐ on GitHub.

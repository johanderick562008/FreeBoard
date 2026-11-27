# 🎓 FreeBoard

A web app for college students to see **who's free right now**. Add your timetable once, connect with friends, and FreeBoard shows who's free this period, who's free at any time in the week, and when your whole group is free together.

## 🌐 Live Application

**App:** https://freeboard-phi.vercel.app/

**Backend API:** https://free-board-ashen.vercel.app/

**API Health Check:** https://free-board-ashen.vercel.app/health

---

## 📌 About the Project

FreeBoard makes it easy to coordinate with friends and classmates around your college timetable.

Instead of repeatedly asking:

- "Who is free now?"
- "Who has lunch period?"
- "Are you free during the 3rd hour?"

students open FreeBoard and see the answer instantly.

### Main Features

- Google sign-in, with a display name and username chosen by you
- Friend requests, with Instagram-style "Requested / Accepted" states
- Timetable builder with your own period times
- Copy a classmate's timetable in a few taps
- **Live Now**: who's free this period
- **Browse**: who's free at any day and period
- **Free Together**: when a group is free together, plus a whole-week grid
- Groups (shortcuts) to filter everything by a set of friends
- Private nicknames for friends, shown everywhere in the app
- Private board counts: "On my board" and "Can see mine"
- Themes, fonts, text size and the special **Doomsday Edition**
- A built-in guide, "What's new" updates and new-feature pointers

---

## ✨ Features

### 🔐 Sign in and profile

- Sign in with Google.
- New users choose their **display name** and **username** themselves. Nothing is copied from the Google account, and no account is created until a username is picked.
- The display name can be changed any time.
- Logging out asks for confirmation first.

### 🤝 Friends and requests

- Search people by name or username and send a request.
- Buttons show **Send request → Requested → ✓ Accepted**, and a pending request can be **unsent**.
- Accept or decline incoming requests.
- Give anyone on your board a **nickname**. Only you see it, and it's used in Live Now, Browse, People and Free Together.
- Remove people from your board.

### 🔒 Board counts (private)

- Two counts under your name: **On my board** (timetables you can see) and **Can see mine** (people who can see yours).
- Tap a count to open the list, with search.
- **Add back** someone who can see you, or **Remove** someone so they can no longer see your timetable. They aren't told.
- Only you can ever see your own counts and lists.

### 🗓️ Timetable

- Tap cells to select them, then apply a subject or mark them **Free**.
- Set your own **period times** (⚙), since colleges have different periods.
- **Clear All**, with confirmation.
- **Copy a classmate's timetable:** pick a friend from your board, preview their week, and copy their classes and period times in one tap. They aren't told, and their timetable never changes.
- By default, only accepted friends can see your timetable.

### 🟢 Live Now and 📅 Browse

- **Live Now** shows who's free and who's in class right now, updating with the clock.
- **Browse** shows the same for any day and period.

### 👥 Free Together

- Pick 2 or more people to see every period when **all of them** are free.
- Below that, **"Whole week at a glance"**: a grid of the week where each box shows how many of them are free (brighter means more). Tap a box to see exactly who's free and who's in which class.

### 🏷️ Groups

- Save sets of friends as groups (for example "Hostellers" or "Project team"), and you can include yourself.
- Use a group to filter Live Now, Browse and People, or to pick people in Free Together.

### 🎨 Appearance

- Themes: **Classic Green, Midnight, Daylight, Sakura Night, Terminal** and **Custom** (your own background and highlight colours).
- Fonts: **Grotesk, Rounded, Serif, Mono**, and three text sizes.
- **Doomsday Edition** (special): smoke and forged-iron styling, a launch screen with a clock that lights up, a spark effect on every tap, and an original villain, *The Warden*, watching from the background.
- Saved per device. Launch and tap effects turn off automatically if the device is set to reduce motion.

### ⓘ Guide and updates

- **How to use FreeBoard:** an illustrated guide to every feature.
- **What's new:** recent updates, with a dot on ⓘ until you've seen them.
- **New-feature pointers:** a small bubble points at each new button, shows on up to 5 visits, and stops for good once you tap **Got it** or use the feature.

---

## 🏗️ Project Structure

```text
FreeBoard/
│
├── backend/
│   ├── api/
│   │   └── index.py            # Vercel entry point
│   ├── app/
│   │   ├── config.py           # environment settings
│   │   ├── database.py         # SQLAlchemy engine (TLS for TiDB Cloud)
│   │   ├── main.py             # FastAPI app, CORS, GZip, routers
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py         # JWT sessions, cookies
│   │   ├── routers/
│   │   │   ├── auth.py         # Google sign-in, logout, /auth/me
│   │   │   ├── users.py        # profile, search, requests, nicknames, board counts
│   │   │   ├── timetable.py    # timetable save/clear/view, copy a classmate's
│   │   │   ├── schedule.py     # live, browse, together, week grid
│   │   │   ├── settings.py     # each person's period times
│   │   │   ├── groups.py       # groups (shortcuts)
│   │   │   └── pings.py        # not enabled yet (planned notifications)
│   │   └── services/
│   ├── schema.sql
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── vercel.json
│
├── frontend/
│   ├── index.html              # sign-in page
│   ├── app.html                # the app (served at /app)
│   ├── logo.png
│   ├── css/
│   │   ├── styles.css
│   │   ├── groups.css
│   │   ├── themes.css
│   │   ├── spotlight.css
│   │   ├── network.css
│   │   ├── together-week.css
│   │   └── copy-timetable.css
│   ├── js/
│   │   ├── api.js              # all calls to the backend
│   │   ├── app.js              # main app logic
│   │   ├── groups.js
│   │   ├── theme-boot.js       # applies the saved theme before the page draws
│   │   ├── appearance.js       # themes panel and Doomsday Edition
│   │   ├── network.js          # board counts and lists
│   │   ├── together-week.js    # Free Together week grid
│   │   ├── copy-timetable.js
│   │   ├── spotlight.js        # new-feature pointers
│   │   └── whatsnew.js         # ⓘ guide and "What's new"
│   └── vercel.json
│
└── README.md
```

---

## 🛠️ Technology Stack

### Frontend

- HTML5, CSS3 and vanilla JavaScript (no framework)
- Fetch API
- CSS custom properties for themes

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy and PyMySQL
- Pydantic Settings
- Authlib (Google OAuth)
- Python-JOSE (JWT)
- SlowAPI (rate limiting)
- certifi (TLS certificates for the database)

### Authentication

- Google OAuth 2.0
- HTTP-only cookies
- JWT-based session tokens

### Database

- **TiDB Cloud Starter** (MySQL-compatible), AWS Singapore region
- Encrypted (TLS) connections

### Deployment

- Vercel (frontend and backend), backend pinned to the Singapore region (`sin1`), close to the database
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
                         HTTPS / REST API
                               │
                               ▼
                    ┌──────────────────────┐
                    │       FastAPI        │
                    │       Backend        │
                    │   (Vercel · sin1)    │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌────────────────┐          ┌──────────────────┐
       │  Google OAuth  │          │    TiDB Cloud    │
       │ Authentication │          │ (MySQL, TLS, SG) │
       └────────────────┘          └──────────────────┘
```

---

## 🗄️ Database Tables

| Table | What it stores |
|---|---|
| `users` | Accounts: Google ID, email, display name, username, avatar, privacy |
| `timetable_entries` | One row per day and period: label and whether it's free |
| `connections` | "Owner can see other's timetable", with status (`pending` / `accepted` / `declined`) and the owner's nickname for them |
| `period_settings` | Each person's period times (JSON) |
| `board_groups` | Groups (shortcuts): owner and name |
| `board_group_members` | Who is in each group |

`schema.sql` contains the first three tables. The other three were created directly in the database.

> TiDB hands out `AUTO_INCREMENT` ids in blocks, so ids are unique but not consecutive (for example 30171, then 60172). This is normal. When inserting rows by hand, leave out the `id` column.

---

## 🚀 Running the Backend Locally

### 1. Clone the repository

```bash
git clone https://github.com/johanderick562008/FreeBoard.git
cd FreeBoard
```

### 2. Go to the backend

```bash
cd backend
```

### 3. Create a virtual environment

Windows:

```cmd
python -m venv venv
venv\Scripts\activate
```

### 4. Install dependencies

```cmd
pip install -r requirements.txt
```

### 5. Configure environment variables

Copy `backend/.env.example` to `backend/.env` and fill it in:

```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/freeboard

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

JWT_SECRET=your_secret_key
JWT_EXPIRE_MINUTES=10080

FRONTEND_ORIGIN=http://localhost:5500

ENV=development
```

A local MySQL (`localhost`) connects without TLS. Any other host, such as TiDB Cloud, automatically uses TLS.

**Never commit `.env` to GitHub.**

### 6. Start FastAPI

From the `backend` directory:

```cmd
uvicorn api.index:app --reload
```

Backend: `http://127.0.0.1:8000`

Health check: `http://127.0.0.1:8000/health`, which returns:

```json
{
  "status": "ok"
}
```

---

## 🌐 Running the Frontend Locally

```cmd
cd frontend
python -m http.server 5500
```

Then open `http://localhost:5500`.

For local testing, change `API_BASE` to `http://localhost:8000` in **both** `frontend/js/api.js` and the inline script in `frontend/index.html`. Change them back to the production URL before pushing.

The local server doesn't apply Vercel's clean URLs, so open the app at `/app.html` locally. In production it's `/app`.

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL / TiDB connection URL (`mysql+pymysql://...`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL |
| `JWT_SECRET` | Secret used to sign session tokens |
| `JWT_EXPIRE_MINUTES` | Session length (default 10080 = 7 days) |
| `FRONTEND_ORIGIN` | Frontend URL, used for CORS and the redirect after sign-in |
| `ENV` | `development` or `production` |

### Production Example

Set these in the backend project's **Vercel → Settings → Environment Variables**:

```env
DATABASE_URL=mysql+pymysql://USER:PASSWORD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/freeboard

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://free-board-ashen.vercel.app/auth/google/callback

JWT_SECRET=your_production_secret
JWT_EXPIRE_MINUTES=10080

FRONTEND_ORIGIN=https://freeboard-phi.vercel.app
ENV=production
```

**Do not commit real credentials, passwords, API keys or secrets to GitHub.**

---

## 🔑 Google OAuth Configuration

The authorized redirect URI in Google Cloud Console must match `GOOGLE_REDIRECT_URI`.

### Production

```text
https://free-board-ashen.vercel.app/auth/google/callback
```

### Local Development

```text
http://localhost:8000/auth/google/callback
```

---

## 📡 API Endpoints

Every endpoint except sign-in and health requires a signed-in session.

### Authentication

```text
GET    /auth/google/login
GET    /auth/google/callback
POST   /auth/logout
GET    /auth/me
```

### Users and friends

```text
POST   /users/username                                   # pick a username (creates a new account)
PATCH  /users/me                                         # change display name
GET    /users/search
GET    /users/connections
POST   /users/connections/{other_user_id}                # send a request
DELETE /users/connections/{other_user_id}                # remove from my board
DELETE /users/connections/{other_user_id}/request        # unsend a pending request
GET    /users/connections/incoming
POST   /users/connections/requests/{request_id}/accept
POST   /users/connections/requests/{request_id}/decline
PATCH  /users/connections/{other_user_id}/nickname
GET    /users/me/network                                 # my private board counts and lists
DELETE /users/me/viewers/{other_user_id}                 # stop someone seeing my timetable
```

### Timetable

```text
GET    /timetable/{user_id}
PUT    /timetable/bulk
DELETE /timetable/clear
GET    /timetable/copy/candidates                        # friends I can copy from
POST   /timetable/copy/{user_id}                         # copy a friend's timetable and period times
```

### Period times

```text
GET    /settings/periods/{user_id}
PUT    /settings/periods
```

### Schedule

```text
GET    /schedule/live
GET    /schedule/browse
GET    /schedule/together
GET    /schedule/together/week                           # week grid: who's free per day and period
```

### Groups

```text
GET    /groups
POST   /groups
PUT    /groups/{group_id}
DELETE /groups/{group_id}
```

### Health Check

```text
GET    /health
```

---

## 🔒 Security and Privacy

- Google OAuth sign-in; no passwords stored
- HTTP-only, Secure, SameSite session cookies with JWT tokens
- Server-side checks on every protected endpoint; the backend never trusts a user id sent by the browser for your own data
- By default only **accepted** friends can see a timetable, and only people on your board can be compared or copied
- Board counts and lists are only ever returned to their owner
- Nicknames are private to the person who set them
- CORS limited to the FreeBoard frontend
- Rate limiting on search
- Encrypted (TLS) database connection
- GZip compression

---

## 📦 Deployment

Both parts are deployed on Vercel from this repository.

### Backend

- Entry point: `backend/api/index.py`
- `backend/vercel.json` pins the function to the **Singapore (`sin1`)** region, next to the TiDB database, for fast responses.

### Frontend

- `frontend/vercel.json` enables clean URLs, so the app is served at `/app`.

| | URL |
|---|---|
| Frontend | https://freeboard-phi.vercel.app/ |
| Backend | https://free-board-ashen.vercel.app/ |

---

## 👨‍💻 Development Workflow

```cmd
git status
git add .
git commit -m "Describe your changes"
git push origin main
```

Vercel redeploys automatically after every push.

---

## 🐛 Troubleshooting

### Backend returns 500

Check:

- Vercel deployment logs
- Required environment variables
- `requirements.txt`
- Database credentials and that the TiDB cluster is running

### "Insecure transport" or SSL errors from the database

TiDB Cloud only accepts TLS. Make sure the deployed `database.py` is the version that passes the `certifi` CA, and that `DATABASE_URL` points to the TiDB host on port `4000`.

### App feels slow

Check the `x-vercel-id` response header. It should show `sin1`. If it shows another region (for example `iad1`), check `"regions": ["sin1"]` in `backend/vercel.json`.

### Google login fails

Check:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` matches Google Cloud's authorized redirect URIs
- `FRONTEND_ORIGIN`

### Signed in, but sent back to the sign-in page

The session cookie comes from a different site than the app, so browsers treat it as a **third-party cookie**. Browsers that block these (iPhone Safari's "Prevent Cross-Site Tracking", Brave Shields, Samsung Internet's anti-tracking, Chrome Incognito) bounce back to sign-in. Try normal Chrome, or allow cookies for `free-board-ashen.vercel.app`.

### Database connection fails

Verify `DATABASE_URL` and make sure the TiDB Cloud cluster is available.

---

## 🗺️ Roadmap

- Installable app (PWA) and first-party sign-in through `/api`
- Notifications: pings and "tell me when they're free"
- "Busy this period" / "Free now" overrides
- Day off / holiday mode
- "Where I am" status during free periods
- Share your timetable as an image

---

## 📄 License

This is a personal and academic project.

Add an explicit open-source license if you decide to distribute it under specific terms.

---

## 👤 Author

**Johan Derick**

- Portfolio: https://portfolio-theta-ebon-54.vercel.app/
- LinkedIn: https://www.linkedin.com/in/johanderick05062008/
- GitHub: https://github.com/johanderick562008

---

## ⭐ Project

If you find FreeBoard useful, consider giving the repository a ⭐ on GitHub.

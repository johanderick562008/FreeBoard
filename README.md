# FreeBoard — "Who's free right now" for your whole campus

A full-stack rebuild of the FreeBoard prototype: real accounts, real database,
Google login, per-user timetables (typed in or uploaded as a photo), and a
network of people you add so Live / Browse / People / Together all work off
real data instead of one hardcoded sheet.

---

## 1. Architecture

```
                          ┌──────────────────────┐
                          │        Browser        │
                          │  index.html (login)   │
                          │  app.html (dashboard)  │
                          └──────────┬────────────┘
                                     │ HTTPS + JSON (fetch)
                                     │ JWT in httpOnly cookie
                          ┌──────────▼────────────┐
                          │   FastAPI backend      │
                          │  (Python, Uvicorn)     │
                          │                        │
                          │  /auth   — Google OAuth│
                          │  /users  — search/add  │
                          │  /timetable — upload,  │
                          │      OCR, manual edit  │
                          │  /schedule — live,     │
                          │      browse, together  │
                          └──────────┬────────────┘
                                     │ SQLAlchemy (parameterized)
                          ┌──────────▼────────────┐
                          │       MySQL 8          │
                          │ users / connections /   │
                          │ timetable_entries       │
                          └────────────────────────┘
```

**Why this stack**
- **FastAPI (Python)** — async, typed request/response validation (Pydantic) catches bad input before it ever touches the database, built-in OpenAPI docs for free.
- **MySQL** — relational fit for "user → timetable entries → connections" with real foreign keys and uniqueness constraints.
- **Google OAuth 2.0** — you never store or touch a password. One less thing to ever leak.
- **JWT in an httpOnly, Secure, SameSite cookie** — the frontend JS never has direct access to the token, which blocks the most common token-theft path (XSS reading localStorage).

---

## 2. Folder structure

```
freeboard/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + router wiring + CORS + rate limit
│   │   ├── config.py          # env-based settings
│   │   ├── database.py        # SQLAlchemy engine/session
│   │   ├── models.py          # User, TimetableEntry, Connection
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── security.py        # JWT create/verify, current_user dependency
│   │   ├── routers/
│   │   │   ├── auth.py        # /auth/google/login, /auth/google/callback, /auth/logout
│   │   │   ├── users.py       # /users/search, /users/me, /users/connections
│   │   │   ├── timetable.py   # /timetable/upload, /timetable/me, /timetable/entry
│   │   │   └── schedule.py    # /schedule/live, /schedule/browse, /schedule/together
│   │   └── services/
│   │       └── ocr_service.py # image → best-guess timetable grid
│   ├── schema.sql             # raw MySQL DDL (in case you skip ORM automigration)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html             # "Continue with Google" landing page
    ├── app.html                # the dashboard (Live/Browse/People/Together)
    ├── css/styles.css
    └── js/
        ├── api.js              # fetch wrapper, always sends credentials
        └── app.js              # renders all four tabs from live API data
```

---

## 3. Data model (schema.sql has the full DDL)

- **users** — id, google_sub (unique), email, username (unique, chosen at signup), display_name, avatar_url, created_at.
- **timetable_entries** — user_id, day (enum Mon–Fri), slot_index (0–7), label (e.g. "Free", "Data Structures", "Lunch"), is_free (derived flag kept in sync with label), source (`manual` / `ocr`), updated_at.
- **connections** — owner_user_id, other_user_id, created_at, unique(owner_user_id, other_user_id). This is what "search their user id and add them" writes to — it's how People/Together know which users to show you. It's a one-way "add to my board" rather than a mutual friend-request, to keep v1 simple; see §6 for how to upgrade it to mutual/private later.

---

## 4. Setup (local development)

### 4.1 Database
```bash
mysql -u root -p < backend/schema.sql
```

### 4.2 Google OAuth credentials
1. Go to console.cloud.google.com → create a project.
2. APIs & Services → OAuth consent screen → External → fill app name/logo.
3. Credentials → Create Credentials → OAuth client ID → Web application.
4. Authorized redirect URI: `http://localhost:8000/auth/google/callback` (add your real domain later, e.g. `https://freeboard.app/auth/google/callback`).
5. Copy the Client ID and Client Secret into `.env`.

### 4.3 Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in DB + Google creds + a random JWT_SECRET
uvicorn app.main:app --reload
```

### 4.4 Frontend
The frontend is static — during dev just open `frontend/index.html` via a local
server (`python -m http.server` inside `frontend/`) so cookies behave correctly,
rather than opening the file directly.

---

## 5. Security checklist (what's already wired up, and why)

| Concern | How it's handled |
|---|---|
| Passwords | None exist — Google OAuth only. Nothing to leak or brute-force. |
| Session tokens | JWT, signed (HS256, secret from env), stored in an **httpOnly, Secure, SameSite=Lax** cookie — never touchable by frontend JS, which blocks XSS token theft. |
| SQL injection | SQLAlchemy ORM with parameterized queries everywhere; no raw string-built SQL. |
| CSRF | SameSite=Lax cookie + state-checked OAuth flow; state-changing endpoints only accept `POST`/`PATCH` with JSON bodies (not GET). |
| Brute force / abuse | `slowapi` rate limiting on `/auth` and `/users/search` (e.g. 20 req/min/IP). |
| File upload abuse | Timetable image upload validates MIME type and caps size (5 MB), strips EXIF, re-encodes server-side before OCR runs — never executes or serves the raw uploaded file back. |
| Privacy | A user's full timetable is only exposed to accounts that added them (see `connections` table) — not the public internet, not unauthenticated requests. |
| Secrets | `.env` is git-ignored; `.env.example` has placeholders only. Never commit real client secrets or `JWT_SECRET`. |
| Transport | Everything assumes HTTPS in production — cookies are marked `Secure` so they're refused over plain HTTP. |
| CORS | Locked to your actual frontend origin(s) in `config.py`, not `*`. |

**Before a real public launch**, also add: email/domain allow-listing if you want it campus-only, a privacy toggle per user (public / connections-only / private timetable), audit logging on admin actions, and a proper managed-MySQL provider (PlanetScale, RDS, Cloud SQL) rather than self-hosting MySQL.

---

## 6. Natural next upgrades
- Turn `connections` into a two-sided friend request (pending/accepted) so people can't see your timetable just by knowing your username.
- Per-user privacy setting: public / connections-only / just-me.
- Push notifications ("your friend group has a common free slot starting in 10 min").
- Admin dashboard to merge duplicate/misspelled subject labels campus-wide.
- Replace the heuristic OCR with a proper table-structure model if photo parsing accuracy needs to improve.

---

## 7. Deploying it for real
- **Backend**: Render, Railway, or Fly.io (all have a free/cheap tier, handle HTTPS certs automatically, and let you set env vars in a dashboard).
- **Database**: PlanetScale (MySQL-compatible, generous free tier) or your host's managed MySQL.
- **Frontend**: can be served by the same backend as static files, or deployed separately on Vercel/Netlify — just point `API_BASE` in `frontend/js/api.js` at your backend's URL.
- **Domain + HTTPS**: point your domain's DNS at the host; Render/Railway/Vercel all issue free HTTPS certs automatically once DNS is verified.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.sessions import SessionMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import settings
#from .database import Base, engine
from .routers import auth, users, timetable, schedule

# Creates tables if they don't exist yet — schema.sql is the source of truth for
# production migrations, this is just a dev-convenience fallback.
#Base.metadata.create_all(bind=engine)

app = FastAPI(title="FreeBoard API")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Required by Authlib's OAuth state handling during the Google login redirect
app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET, same_site="lax")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compresses JSON/HTML responses over the wire — noticeable on mobile/slow connections
app.add_middleware(GZipMiddleware, minimum_size=500)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(timetable.router)
app.include_router(schedule.router)


@app.get("/health")
def health():
    return {"status": "ok"}

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.sessions import SessionMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import sys

from app.config import settings
from app.routers import auth, users, timetable, schedule

backend_dir = Path(__file__).resolve().parent.parent

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=1,          # serverless: one connection per warm invocation, not a big pool
    max_overflow=0,       # don't let it try to open extra connections under load
    pool_pre_ping=False,  # skip the extra round-trip — a fresh/warm connection doesn't need a health check
    pool_recycle=300,     # recycle before Aiven's own idle-connection timeout kicks in
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

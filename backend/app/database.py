import certifi
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

# TiDB Cloud only accepts encrypted (TLS) connections. Verify its certificate with
# certifi's trusted CA list. A local MySQL on your own machine is left without TLS.
_db_host = make_url(settings.DATABASE_URL).host
_connect_args = {} if _db_host in (None, "localhost", "127.0.0.1") else {"ssl": {"ca": certifi.where()}}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    pool_size=1,          # serverless: one connection per warm invocation, not a big pool
    max_overflow=0,       # don't let it try to open extra connections under load
    pool_pre_ping=False,  # skip the extra round-trip — a fresh/warm connection doesn't need a health check
    pool_recycle=300,     # recycle idle connections before the database host closes them
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

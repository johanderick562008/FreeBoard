from sqlalchemy import (
    Column, BigInteger, String, Boolean, DateTime, Enum, SmallInteger,
    ForeignKey, UniqueConstraint, func
)
from sqlalchemy.orm import relationship

from .database import Base

DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    google_sub = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(30), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    privacy = Column(Enum("public", "connections", "private", name="privacy_enum"),
                      nullable=False, default="connections")
    created_at = Column(DateTime, server_default=func.now())

    timetable = relationship("TimetableEntry", back_populates="user", cascade="all, delete-orphan")


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"
    __table_args__ = (UniqueConstraint("user_id", "day", "slot_index", name="uniq_slot"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    day = Column(Enum(*DAYS, name="day_enum"), nullable=False)
    slot_index = Column(SmallInteger, nullable=False)
    label = Column(String(80), nullable=False, default="Class")
    is_free = Column(Boolean, nullable=False, default=False)
    source = Column(Enum("manual", "ocr", name="source_enum"), nullable=False, default="manual")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="timetable")


class Connection(Base):
    __tablename__ = "connections"
    __table_args__ = (UniqueConstraint("owner_user_id", "other_user_id", name="uniq_edge"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    owner_user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    other_user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum("pending", "accepted", "declined", name="connection_status_enum"),
                         nullable=False, default="pending")
    nickname = Column(String(100), nullable=True)  # owner's private label for other_user, only owner sees it
    created_at = Column(DateTime, server_default=func.now())
    

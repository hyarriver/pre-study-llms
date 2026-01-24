"""
数据库模块 - 向后兼容导出
"""
from app.database.session import get_db, SessionLocal, engine
from app.database.base import Base
from app.models import Chapter, Progress, Note, User

__all__ = [
    "get_db",
    "SessionLocal", 
    "engine",
    "Base",
    "Chapter",
    "Progress",
    "Note",
    "User",
]

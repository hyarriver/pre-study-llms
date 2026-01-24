"""
章节模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base


class Chapter(Base):
    """章节模型"""
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    chapter_number = Column(Integer, unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    notebook_path = Column(String(500))
    readme_path = Column(String(500))
    pdf_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    progress = relationship("Progress", back_populates="chapter", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="chapter", cascade="all, delete-orphan")

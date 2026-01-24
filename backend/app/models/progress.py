"""
学习进度模型
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base


class Progress(Base):
    """学习进度模型"""
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    user_id = Column(String(50), default="default_user", nullable=False)
    completion_percentage = Column(Float, default=0.0)
    last_accessed = Column(DateTime, default=datetime.utcnow)
    completed = Column(Integer, default=0)  # 0: 未完成, 1: 已完成
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    chapter = relationship("Chapter", back_populates="progress")

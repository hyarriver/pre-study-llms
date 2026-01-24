"""
学习进度模型
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
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
    study_time_seconds = Column(Integer, default=0)  # 学习时长（秒）
    exam_score = Column(Float, default=0.0)  # 考核最高分(0-100)
    exam_attempts = Column(Integer, default=0)  # 考核次数
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    chapter = relationship("Chapter", back_populates="progress")


class StudyRecord(Base):
    """每日学习记录模型"""
    __tablename__ = "study_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    study_date = Column(Date, default=date.today, nullable=False, index=True)
    study_time_seconds = Column(Integer, default=0)  # 当日学习时长（秒）
    chapters_studied = Column(Integer, default=0)  # 当日学习章节数
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

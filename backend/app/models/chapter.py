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
    docx_path = Column(String(500))  # PDF 转换得到的 Word 文档路径（可选）
    source_type = Column(String(20), default="official", nullable=False)  # official | user_submitted
    submission_id = Column(Integer, nullable=True)  # 关联 MaterialSubmission.id，便于追溯
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    progress = relationship("Progress", back_populates="chapter", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="chapter", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="chapter", cascade="all, delete-orphan")
    exam_records = relationship("ExamRecord", back_populates="chapter", cascade="all, delete-orphan")
    # 用户提交审核通过的章节：通过 submission_id 追溯到 MaterialSubmission
    submission = relationship("MaterialSubmission", back_populates="chapter_rel", foreign_keys="MaterialSubmission.chapter_id", uselist=False)

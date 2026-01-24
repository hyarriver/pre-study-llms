"""
考试相关模型
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base


class Question(Base):
    """试题模型"""
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False, index=True)
    question_type = Column(String(20), nullable=False)  # single_choice, multi_choice, true_false
    content = Column(Text, nullable=False)  # 题目内容
    options = Column(JSON, nullable=True)  # 选项 [{"key": "A", "value": "xxx"}, ...]
    answer = Column(String(50), nullable=False)  # 正确答案 "A" 或 "A,B" 或 "true"/"false"
    explanation = Column(Text, nullable=True)  # 答案解析
    score = Column(Integer, default=10)  # 分值（默认10分）
    order_index = Column(Integer, default=0)  # 题目顺序
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    chapter = relationship("Chapter", back_populates="questions")


class ExamRecord(Base):
    """考试记录模型"""
    __tablename__ = "exam_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False, index=True)
    score = Column(Float, default=0.0)  # 得分
    total_score = Column(Float, default=0.0)  # 总分
    correct_count = Column(Integer, default=0)  # 正确题数
    total_count = Column(Integer, default=0)  # 总题数
    answers = Column(JSON, nullable=True)  # 用户答案 {"1": "A", "2": "B,C", ...}
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    chapter = relationship("Chapter", back_populates="exam_records")

"""
学习进度相关的 Pydantic 模型
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProgressBase(BaseModel):
    """进度基础模型"""
    chapter_id: int
    completion_percentage: float = 0.0
    completed: bool = False


class ProgressUpdate(BaseModel):
    """更新进度模型"""
    completion_percentage: Optional[float] = None
    completed: Optional[bool] = None


class ProgressResponse(BaseModel):
    """进度响应模型"""
    id: int
    chapter_id: int
    completion_percentage: float
    completed: bool
    last_accessed: datetime

    class Config:
        from_attributes = True

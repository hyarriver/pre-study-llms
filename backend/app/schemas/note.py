"""
笔记相关的 Pydantic 模型
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NoteBase(BaseModel):
    """笔记基础模型"""
    chapter_id: int
    title: str
    content: str


class NoteCreate(NoteBase):
    """创建笔记模型"""
    pass


class NoteUpdate(BaseModel):
    """更新笔记模型"""
    title: Optional[str] = None
    content: Optional[str] = None


class NoteResponse(NoteBase):
    """笔记响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

"""
章节相关的 Pydantic 模型
"""
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class ChapterBase(BaseModel):
    """章节基础模型"""
    chapter_number: int
    title: str
    description: Optional[str] = None
    notebook_path: Optional[str] = None
    readme_path: Optional[str] = None
    pdf_path: Optional[str] = None
    docx_path: Optional[str] = None


class ChapterCreate(ChapterBase):
    """创建章节模型"""
    pass


class ChapterUpdate(BaseModel):
    """更新章节模型"""
    chapter_number: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    notebook_path: Optional[str] = None
    readme_path: Optional[str] = None
    pdf_path: Optional[str] = None
    docx_path: Optional[str] = None


class ChapterReorderRequest(BaseModel):
    """管理员排序章节请求"""
    ordered_ids: List[int]


class ChapterResponse(ChapterBase):
    """章节响应模型"""
    id: int
    source_type: Optional[str] = "official"
    created_at: datetime
    updated_at: datetime
    completion_percentage: float = 0.0
    completed: bool = False

    class Config:
        from_attributes = True

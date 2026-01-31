"""
材料提交相关的 Pydantic 模型
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MaterialSubmissionBase(BaseModel):
    """材料提交基础模型"""
    title: str
    description: Optional[str] = None


class MaterialSubmissionResponse(BaseModel):
    """材料提交响应模型"""
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    file_path: str
    file_type: str
    status: str
    reject_reason: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    chapter_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MaterialSubmissionWithUser(MaterialSubmissionResponse):
    """材料提交响应（含提交人信息）"""
    user_nickname: Optional[str] = None
    user_username: Optional[str] = None


class RejectRequest(BaseModel):
    """驳回请求"""
    reason: Optional[str] = None

"""
章节相关路由 - API v1
"""
from fastapi import APIRouter, Depends
from typing import List, Optional
from app.models import User
from app.schemas.chapter import ChapterResponse
from app.core.dependencies import get_chapter_service
from app.core.auth import get_current_user_optional
from app.services.chapter_service import ChapterService

router = APIRouter()


def _user_id(user: Optional[User]) -> Optional[str]:
    return str(user.id) if user else None


@router.get("/", response_model=List[ChapterResponse])
async def get_chapters(
    service: ChapterService = Depends(get_chapter_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """获取所有章节列表；已登录则返回该用户学习进度"""
    return service.get_all(user_id=_user_id(current_user))


@router.get("/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(
    chapter_id: int,
    service: ChapterService = Depends(get_chapter_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """获取单个章节详情；已登录则返回该用户学习进度"""
    return service.get_by_id(chapter_id, user_id=_user_id(current_user))

"""
章节相关路由 - API v1
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.models import User, Chapter, Question
from app.schemas.chapter import ChapterResponse, ChapterUpdate, ChapterReorderRequest
from app.schemas.exam import ChapterExamInfo
from app.core.dependencies import get_chapter_service
from app.database import get_db
from app.core.auth import get_current_user_optional, get_current_admin
from app.services.chapter_service import ChapterService
from sqlalchemy.orm import Session

router = APIRouter()


def _user_id(user: Optional[User]) -> Optional[str]:
    return str(user.id) if user else None


@router.put("/admin/reorder")
async def admin_reorder_chapters(
    body: ChapterReorderRequest,
    service: ChapterService = Depends(get_chapter_service),
    current_user: User = Depends(get_current_admin),
):
    """管理员：按 ordered_ids 顺序重排章节"""
    service.reorder(body.ordered_ids)
    return {"message": "排序已更新"}


@router.get("/", response_model=List[ChapterResponse])
async def get_chapters(
    service: ChapterService = Depends(get_chapter_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """获取所有章节列表；已登录则返回该用户学习进度"""
    return service.get_all(user_id=_user_id(current_user))


@router.get("/{chapter_id}/exam-info", response_model=ChapterExamInfo)
async def get_chapter_exam_info(chapter_id: int, db: Session = Depends(get_db)):
    """获取章节考核信息（是否有题、题数），无需登录。用于未登录时决定是否显示考核 Tab。"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    question_count = db.query(Question).filter(Question.chapter_id == chapter_id).count()
    return ChapterExamInfo(
        chapter_id=chapter_id,
        has_questions=question_count > 0,
        question_count=question_count,
    )


@router.get("/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(
    chapter_id: int,
    service: ChapterService = Depends(get_chapter_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """获取单个章节详情；已登录则返回该用户学习进度"""
    return service.get_by_id(chapter_id, user_id=_user_id(current_user))


@router.patch("/{chapter_id}", response_model=ChapterResponse)
async def admin_update_chapter(
    chapter_id: int,
    data: ChapterUpdate,
    service: ChapterService = Depends(get_chapter_service),
    current_user: User = Depends(get_current_admin),
):
    """管理员：更新章节（标题、描述、路径、序号等）"""
    return service.update(chapter_id, data)


@router.delete("/{chapter_id}")
async def admin_delete_chapter(
    chapter_id: int,
    service: ChapterService = Depends(get_chapter_service),
    current_user: User = Depends(get_current_admin),
):
    """管理员：删除章节"""
    service.delete(chapter_id)
    return {"message": "章节已删除"}

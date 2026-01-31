"""
考试相关路由 - API v1（需登录）
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from typing import List, Optional
from app.models import User
from app.schemas.exam import (
    QuestionResponse,
    ExamSubmission,
    ExamResult,
    ExamRecordResponse,
    ChapterExamStatus,
)
from app.core.dependencies import get_exam_service
from app.core.auth import get_current_user
from app.services.exam_service import ExamService
from app.services.exam_notebook_generator import get_exam_notebook_bytes

router = APIRouter()


@router.get("/{chapter_id}/questions", response_model=List[QuestionResponse])
async def get_questions(
    chapter_id: int,
    service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user),
):
    """获取章节试题列表（需登录）"""
    return service.get_questions(chapter_id)


@router.post("/{chapter_id}/submit", response_model=ExamResult)
async def submit_exam(
    chapter_id: int,
    submission: ExamSubmission,
    service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user),
):
    """提交答案并评分（需登录）"""
    return service.submit_exam(chapter_id, submission, user_id=str(current_user.id))


@router.get("/{chapter_id}/records", response_model=List[ExamRecordResponse])
async def get_exam_records(
    chapter_id: int,
    service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user),
):
    """获取考试历史记录（需登录）"""
    return service.get_exam_records(chapter_id, user_id=str(current_user.id))


@router.get("/{chapter_id}/best", response_model=Optional[ExamRecordResponse])
async def get_best_record(
    chapter_id: int,
    service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user),
):
    """获取最高分记录（需登录）"""
    return service.get_best_record(chapter_id, user_id=str(current_user.id))


@router.get("/{chapter_id}/status", response_model=ChapterExamStatus)
async def get_exam_status(
    chapter_id: int,
    service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user),
):
    """获取章节考试状态（需登录）"""
    return service.get_chapter_exam_status(chapter_id, user_id=str(current_user.id))


@router.get("/{chapter_id}/exam-notebook")
async def get_exam_notebook(
    chapter_id: int,
    base_url: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """下载本章考核的 Jupyter Notebook 模板（需登录）。base_url 为平台 API 地址，用于在 Notebook 中请求题目与提交。"""
    content = get_exam_notebook_bytes(chapter_id, api_base_url=base_url)
    return Response(
        content=content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="chapter-{chapter_id}-exam.ipynb"',
        },
    )

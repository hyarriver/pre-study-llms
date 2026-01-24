"""
考试相关路由 - API v1（需登录）
"""
from fastapi import APIRouter, Depends, HTTPException
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

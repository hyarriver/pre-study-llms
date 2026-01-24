"""
学习进度相关路由 - API v1（需登录）
"""
from fastapi import APIRouter, Depends, Query
from typing import List
from app.models import User
from app.schemas.progress import (
    ProgressResponse, 
    ProgressUpdate, 
    StudyStatistics,
    StudyHeatmapData,
)
from app.core.dependencies import get_progress_service
from app.core.auth import get_current_user
from app.services.progress_service import ProgressService

router = APIRouter()


@router.get("/statistics", response_model=StudyStatistics)
async def get_statistics(
    service: ProgressService = Depends(get_progress_service),
    current_user: User = Depends(get_current_user),
):
    """获取学习统计数据（需登录）"""
    return service.get_statistics(user_id=str(current_user.id))


@router.get("/heatmap", response_model=StudyHeatmapData)
async def get_study_heatmap(
    days: int = Query(default=365, ge=7, le=365, description="获取多少天的数据"),
    service: ProgressService = Depends(get_progress_service),
    current_user: User = Depends(get_current_user),
):
    """获取学习热力图数据（需登录）"""
    return service.get_study_heatmap(user_id=str(current_user.id), days=days)


@router.get("/{chapter_id}", response_model=ProgressResponse)
async def get_progress(
    chapter_id: int,
    service: ProgressService = Depends(get_progress_service),
    current_user: User = Depends(get_current_user),
):
    """获取指定章节的学习进度（需登录）"""
    return service.get_by_chapter_id(chapter_id, user_id=str(current_user.id))


@router.put("/{chapter_id}", response_model=ProgressResponse)
async def update_progress(
    chapter_id: int,
    progress_update: ProgressUpdate,
    service: ProgressService = Depends(get_progress_service),
    current_user: User = Depends(get_current_user),
):
    """更新学习进度（需登录）"""
    return service.update(chapter_id, progress_update, user_id=str(current_user.id))


@router.get("/", response_model=List[ProgressResponse])
async def get_all_progress(
    service: ProgressService = Depends(get_progress_service),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户所有章节的学习进度（需登录）"""
    return service.get_all(user_id=str(current_user.id))

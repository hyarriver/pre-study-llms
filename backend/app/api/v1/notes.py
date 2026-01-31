"""
笔记相关路由 - API v1（需登录，按用户隔离）
"""
from fastapi import APIRouter, Depends
from typing import List
from app.models import User
from app.schemas.note import NoteResponse, NoteCreate, NoteUpdate
from app.core.dependencies import get_note_service
from app.core.auth import get_current_user
from app.services.note_service import NoteService

router = APIRouter()


@router.get("/chapter/{chapter_id}", response_model=List[NoteResponse])
async def get_chapter_notes(
    chapter_id: int,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
):
    """获取指定章节的当前用户笔记（需登录）"""
    return service.get_by_chapter_id(chapter_id, user_id=str(current_user.id))


@router.post("/", response_model=NoteResponse)
async def create_note(
    note: NoteCreate,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
):
    """创建新笔记（需登录）"""
    return service.create(note, user_id=str(current_user.id))


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_update: NoteUpdate,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
):
    """更新笔记（需登录）"""
    return service.update(note_id, note_update, user_id=str(current_user.id))


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
):
    """删除笔记（需登录）"""
    service.delete(note_id, user_id=str(current_user.id))
    return {"message": "笔记已删除"}

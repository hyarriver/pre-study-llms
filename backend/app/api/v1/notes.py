"""
笔记相关路由 - API v1
"""
from fastapi import APIRouter, Depends
from typing import List
from app.schemas.note import NoteResponse, NoteCreate, NoteUpdate
from app.core.dependencies import get_note_service
from app.services.note_service import NoteService

router = APIRouter()


@router.get("/chapter/{chapter_id}", response_model=List[NoteResponse])
async def get_chapter_notes(
    chapter_id: int,
    service: NoteService = Depends(get_note_service)
):
    """获取指定章节的所有笔记"""
    return service.get_by_chapter_id(chapter_id)


@router.post("/", response_model=NoteResponse)
async def create_note(
    note: NoteCreate,
    service: NoteService = Depends(get_note_service)
):
    """创建新笔记"""
    return service.create(note)


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_update: NoteUpdate,
    service: NoteService = Depends(get_note_service)
):
    """更新笔记"""
    return service.update(note_id, note_update)


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    service: NoteService = Depends(get_note_service)
):
    """删除笔记"""
    service.delete(note_id)
    return {"message": "笔记已删除"}

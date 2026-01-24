"""
笔记相关路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db, Note, Chapter

router = APIRouter()


class NoteCreate(BaseModel):
    chapter_id: int
    title: str
    content: str


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    chapter_id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/chapter/{chapter_id}", response_model=List[NoteResponse])
async def get_chapter_notes(chapter_id: int, db: Session = Depends(get_db)):
    """获取指定章节的所有笔记"""
    notes = db.query(Note).filter(
        Note.chapter_id == chapter_id,
        Note.user_id == "default_user"
    ).order_by(Note.created_at.desc()).all()
    
    return notes


@router.post("/", response_model=NoteResponse)
async def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    """创建新笔记"""
    # 验证章节是否存在
    chapter = db.query(Chapter).filter(Chapter.id == note.chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    
    new_note = Note(
        chapter_id=note.chapter_id,
        user_id="default_user",
        title=note.title,
        content=note.content
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    return NoteResponse(
        id=new_note.id,
        chapter_id=new_note.chapter_id,
        title=new_note.title,
        content=new_note.content,
        created_at=new_note.created_at,
        updated_at=new_note.updated_at
    )


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_update: NoteUpdate,
    db: Session = Depends(get_db)
):
    """更新笔记"""
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == "default_user"
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    if note_update.title is not None:
        note.title = note_update.title
    if note_update.content is not None:
        note.content = note_update.content
    
    note.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(note)
    
    return NoteResponse(
        id=note.id,
        chapter_id=note.chapter_id,
        title=note.title,
        content=note.content,
        created_at=note.created_at,
        updated_at=note.updated_at
    )


@router.delete("/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_db)):
    """删除笔记"""
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == "default_user"
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    db.delete(note)
    db.commit()
    
    return {"message": "笔记已删除"}

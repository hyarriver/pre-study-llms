"""
笔记服务层
"""
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.models import Note, Chapter
from app.schemas.note import NoteResponse, NoteCreate, NoteUpdate
from app.core.exceptions import ChapterNotFoundError, NoteNotFoundError


class NoteService:
    """笔记服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_chapter_id(self, chapter_id: int, user_id: str) -> List[NoteResponse]:
        """获取指定章节的当前用户笔记"""
        notes = self.db.query(Note).filter(
            Note.chapter_id == chapter_id,
            Note.user_id == user_id
        ).order_by(Note.created_at.desc()).all()
        
        return notes
    
    def create(self, note_data: NoteCreate, user_id: str) -> NoteResponse:
        """创建新笔记"""
        # 验证章节是否存在
        chapter = self.db.query(Chapter).filter(Chapter.id == note_data.chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(note_data.chapter_id)
        
        new_note = Note(
            chapter_id=note_data.chapter_id,
            user_id=user_id,
            title=note_data.title,
            content=note_data.content
        )
        self.db.add(new_note)
        self.db.commit()
        self.db.refresh(new_note)
        
        return NoteResponse(
            id=new_note.id,
            chapter_id=new_note.chapter_id,
            title=new_note.title,
            content=new_note.content,
            created_at=new_note.created_at,
            updated_at=new_note.updated_at
        )
    
    def update(self, note_id: int, note_update: NoteUpdate, user_id: str) -> NoteResponse:
        """更新笔记"""
        note = self.db.query(Note).filter(
            Note.id == note_id,
            Note.user_id == user_id
        ).first()
        
        if not note:
            raise NoteNotFoundError(note_id)
        
        if note_update.title is not None:
            note.title = note_update.title
        if note_update.content is not None:
            note.content = note_update.content
        
        note.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(note)
        
        return NoteResponse(
            id=note.id,
            chapter_id=note.chapter_id,
            title=note.title,
            content=note.content,
            created_at=note.created_at,
            updated_at=note.updated_at
        )
    
    def delete(self, note_id: int, user_id: str) -> None:
        """删除笔记"""
        note = self.db.query(Note).filter(
            Note.id == note_id,
            Note.user_id == user_id
        ).first()
        
        if not note:
            raise NoteNotFoundError(note_id)
        
        self.db.delete(note)
        self.db.commit()

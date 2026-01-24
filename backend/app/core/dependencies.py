"""
依赖注入
"""
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.chapter_service import ChapterService
from app.services.progress_service import ProgressService
from app.services.note_service import NoteService
from app.services.notebook_service import NotebookService


def get_chapter_service(
    db: Session = Depends(get_db)
) -> ChapterService:
    """获取章节服务"""
    return ChapterService(db)


def get_progress_service(
    db: Session = Depends(get_db)
) -> ProgressService:
    """获取进度服务"""
    return ProgressService(db)


def get_note_service(
    db: Session = Depends(get_db)
) -> NoteService:
    """获取笔记服务"""
    return NoteService(db)


def get_notebook_service() -> NotebookService:
    """获取Notebook服务"""
    return NotebookService()

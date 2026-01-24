"""
学习进度服务层
"""
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.models import Progress, Chapter
from app.schemas.progress import ProgressResponse, ProgressUpdate
from app.core.exceptions import ChapterNotFoundError


class ProgressService:
    """学习进度服务（需传入 user_id，对应登录用户）"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_chapter_id(self, chapter_id: int, user_id: str) -> ProgressResponse:
        """获取指定章节的学习进度"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
        progress = self.db.query(Progress).filter(
            Progress.chapter_id == chapter_id,
            Progress.user_id == user_id,
        ).first()
        
        if not progress:
            progress = Progress(
                chapter_id=chapter_id,
                user_id=user_id,
                completion_percentage=0.0,
                completed=0,
            )
            self.db.add(progress)
            self.db.commit()
            self.db.refresh(progress)
        
        return ProgressResponse(
            id=progress.id,
            chapter_id=progress.chapter_id,
            completion_percentage=progress.completion_percentage,
            completed=bool(progress.completed),
            last_accessed=progress.last_accessed,
        )
    
    def update(
        self, chapter_id: int, progress_update: ProgressUpdate, user_id: str
    ) -> ProgressResponse:
        """更新学习进度"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
        progress = self.db.query(Progress).filter(
            Progress.chapter_id == chapter_id,
            Progress.user_id == user_id,
        ).first()
        
        if not progress:
            progress = Progress(
                chapter_id=chapter_id,
                user_id=user_id,
                completion_percentage=0.0,
                completed=0,
            )
            self.db.add(progress)
        
        if progress_update.completion_percentage is not None:
            progress.completion_percentage = progress_update.completion_percentage
        if progress_update.completed is not None:
            progress.completed = 1 if progress_update.completed else 0
        progress.last_accessed = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(progress)
        
        return ProgressResponse(
            id=progress.id,
            chapter_id=progress.chapter_id,
            completion_percentage=progress.completion_percentage,
            completed=bool(progress.completed),
            last_accessed=progress.last_accessed,
        )
    
    def get_all(self, user_id: str) -> List[ProgressResponse]:
        """获取当前用户所有章节的学习进度"""
        progress_list = self.db.query(Progress).filter(
            Progress.user_id == user_id,
        ).all()
        return [
            ProgressResponse(
                id=p.id,
                chapter_id=p.chapter_id,
                completion_percentage=p.completion_percentage,
                completed=bool(p.completed),
                last_accessed=p.last_accessed,
            )
            for p in progress_list
        ]

"""
章节服务层
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models import Chapter, Progress
from app.schemas.chapter import ChapterResponse
from app.core.exceptions import ChapterNotFoundError


class ChapterService:
    """章节服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_all(self, user_id: Optional[str] = None) -> List[ChapterResponse]:
        """获取所有章节；user_id 为空时进度均为 0"""
        chapters = self.db.query(Chapter).order_by(Chapter.chapter_number).all()
        result = []
        for chapter in chapters:
            progress = None
            if user_id:
                progress = self.db.query(Progress).filter(
                    Progress.chapter_id == chapter.id,
                    Progress.user_id == user_id,
                ).first()
            chapter_data = ChapterResponse(
                id=chapter.id,
                chapter_number=chapter.chapter_number,
                title=chapter.title,
                description=chapter.description,
                notebook_path=chapter.notebook_path,
                readme_path=chapter.readme_path,
                pdf_path=chapter.pdf_path,
                source_type=getattr(chapter, "source_type", None) or "official",
                created_at=chapter.created_at,
                updated_at=chapter.updated_at,
                completion_percentage=progress.completion_percentage if progress else 0.0,
                completed=bool(progress.completed) if progress else False,
            )
            result.append(chapter_data)
        return result
    
    def get_by_id(self, chapter_id: int, user_id: Optional[str] = None) -> ChapterResponse:
        """根据ID获取章节；user_id 为空时进度为 0"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        progress = None
        if user_id:
            progress = self.db.query(Progress).filter(
                Progress.chapter_id == chapter.id,
                Progress.user_id == user_id,
            ).first()
        return ChapterResponse(
            id=chapter.id,
            chapter_number=chapter.chapter_number,
            title=chapter.title,
            description=chapter.description,
            notebook_path=chapter.notebook_path,
            readme_path=chapter.readme_path,
            pdf_path=chapter.pdf_path,
            source_type=getattr(chapter, "source_type", None) or "official",
            created_at=chapter.created_at,
            updated_at=chapter.updated_at,
            completion_percentage=progress.completion_percentage if progress else 0.0,
            completed=bool(progress.completed) if progress else False,
        )

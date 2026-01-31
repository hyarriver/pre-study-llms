"""
章节服务层
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models import Chapter, Progress, MaterialSubmission
from app.schemas.chapter import ChapterResponse, ChapterUpdate
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
                docx_path=getattr(chapter, "docx_path", None),
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
            docx_path=getattr(chapter, "docx_path", None),
            source_type=getattr(chapter, "source_type", None) or "official",
            created_at=chapter.created_at,
            updated_at=chapter.updated_at,
            completion_percentage=progress.completion_percentage if progress else 0.0,
            completed=bool(progress.completed) if progress else False,
        )

    def update(self, chapter_id: int, data: ChapterUpdate) -> ChapterResponse:
        """管理员：更新章节"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        if data.chapter_number is not None:
            chapter.chapter_number = data.chapter_number
        if data.title is not None:
            chapter.title = data.title
        if data.description is not None:
            chapter.description = data.description
        if data.notebook_path is not None:
            chapter.notebook_path = data.notebook_path
        if data.readme_path is not None:
            chapter.readme_path = data.readme_path
        if data.pdf_path is not None:
            chapter.pdf_path = data.pdf_path
        if data.docx_path is not None:
            chapter.docx_path = data.docx_path
        self.db.commit()
        self.db.refresh(chapter)
        return self.get_by_id(chapter_id, user_id=None)

    def reorder(self, ordered_ids: List[int]) -> None:
        """管理员：按 ordered_ids 顺序重写 chapter_number（1,2,3,...），避免唯一约束冲突先设为负数再设回。"""
        if not ordered_ids:
            return
        # 先全部设为负数，避免唯一约束冲突
        for i, cid in enumerate(ordered_ids):
            ch = self.db.query(Chapter).filter(Chapter.id == cid).first()
            if ch:
                ch.chapter_number = -(i + 1)
        self.db.commit()
        # 再设为目标顺序
        for i, cid in enumerate(ordered_ids):
            ch = self.db.query(Chapter).filter(Chapter.id == cid).first()
            if ch:
                ch.chapter_number = i + 1
        self.db.commit()

    def delete(self, chapter_id: int) -> None:
        """管理员：删除章节。先解除 MaterialSubmission 关联，再删除 Chapter（级联删除 Progress/Note/Question/ExamRecord）。"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        self.db.query(MaterialSubmission).filter(MaterialSubmission.chapter_id == chapter_id).update(
            {"chapter_id": None}
        )
        self.db.delete(chapter)
        self.db.commit()

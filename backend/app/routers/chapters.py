"""
章节相关路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db, Chapter, Progress

router = APIRouter()


class ChapterResponse(BaseModel):
    id: int
    chapter_number: int
    title: str
    description: str
    notebook_path: str
    readme_path: str
    pdf_path: str
    completion_percentage: float = 0.0
    completed: bool = False

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ChapterResponse])
async def get_chapters(db: Session = Depends(get_db)):
    """获取所有章节列表"""
    chapters = db.query(Chapter).order_by(Chapter.chapter_number).all()
    
    result = []
    for chapter in chapters:
        # 获取学习进度
        progress = db.query(Progress).filter(
            Progress.chapter_id == chapter.id,
            Progress.user_id == "default_user"
        ).first()
        
        chapter_data = ChapterResponse(
            id=chapter.id,
            chapter_number=chapter.chapter_number,
            title=chapter.title,
            description=chapter.description,
            notebook_path=chapter.notebook_path,
            readme_path=chapter.readme_path,
            pdf_path=chapter.pdf_path,
            completion_percentage=progress.completion_percentage if progress else 0.0,
            completed=bool(progress.completed) if progress else False
        )
        result.append(chapter_data)
    
    return result


@router.get("/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    """获取单个章节详情"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    
    # 获取学习进度
    progress = db.query(Progress).filter(
        Progress.chapter_id == chapter.id,
        Progress.user_id == "default_user"
    ).first()
    
    return ChapterResponse(
        id=chapter.id,
        chapter_number=chapter.chapter_number,
        title=chapter.title,
        description=chapter.description,
        notebook_path=chapter.notebook_path,
        readme_path=chapter.readme_path,
        pdf_path=chapter.pdf_path,
        completion_percentage=progress.completion_percentage if progress else 0.0,
        completed=bool(progress.completed) if progress else False
    )

"""
学习进度相关路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db, Progress, Chapter

router = APIRouter()


class ProgressUpdate(BaseModel):
    completion_percentage: Optional[float] = None
    completed: Optional[bool] = None


class ProgressResponse(BaseModel):
    id: int
    chapter_id: int
    completion_percentage: float
    completed: bool
    last_accessed: datetime

    class Config:
        from_attributes = True


@router.get("/{chapter_id}", response_model=ProgressResponse)
async def get_progress(chapter_id: int, db: Session = Depends(get_db)):
    """获取指定章节的学习进度"""
    # 验证章节是否存在
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    
    progress = db.query(Progress).filter(
        Progress.chapter_id == chapter_id,
        Progress.user_id == "default_user"
    ).first()
    
    if not progress:
        # 创建新的进度记录
        progress = Progress(
            chapter_id=chapter_id,
            user_id="default_user",
            completion_percentage=0.0,
            completed=False
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    return ProgressResponse(
        id=progress.id,
        chapter_id=progress.chapter_id,
        completion_percentage=progress.completion_percentage,
        completed=bool(progress.completed),
        last_accessed=progress.last_accessed
    )


@router.put("/{chapter_id}", response_model=ProgressResponse)
async def update_progress(
    chapter_id: int,
    progress_update: ProgressUpdate,
    db: Session = Depends(get_db)
):
    """更新学习进度"""
    # 验证章节是否存在
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    
    progress = db.query(Progress).filter(
        Progress.chapter_id == chapter_id,
        Progress.user_id == "default_user"
    ).first()
    
    if not progress:
        progress = Progress(
            chapter_id=chapter_id,
            user_id="default_user",
            completion_percentage=0.0,
            completed=False
        )
        db.add(progress)
    
    # 更新进度
    if progress_update.completion_percentage is not None:
        progress.completion_percentage = progress_update.completion_percentage
    if progress_update.completed is not None:
        progress.completed = 1 if progress_update.completed else 0
    
    progress.last_accessed = datetime.utcnow()
    
    db.commit()
    db.refresh(progress)
    
    return ProgressResponse(
        id=progress.id,
        chapter_id=progress.chapter_id,
        completion_percentage=progress.completion_percentage,
        completed=bool(progress.completed),
        last_accessed=progress.last_accessed
    )


@router.get("/", response_model=List[ProgressResponse])
async def get_all_progress(db: Session = Depends(get_db)):
    """获取所有章节的学习进度"""
    progress_list = db.query(Progress).filter(
        Progress.user_id == "default_user"
    ).all()
    
    return [
        ProgressResponse(
            id=p.id,
            chapter_id=p.chapter_id,
            completion_percentage=p.completion_percentage,
            completed=bool(p.completed),
            last_accessed=p.last_accessed
        )
        for p in progress_list
    ]

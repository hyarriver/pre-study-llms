"""
章节相关路由 - API v1
"""
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.models import User, Chapter, Question
from app.schemas.chapter import ChapterResponse, ChapterUpdate, ChapterReorderRequest
from app.schemas.exam import ChapterExamInfo
from app.schemas.convert_options import ConvertOptions
from app.core.dependencies import get_chapter_service, get_notebook_service
from app.database import get_db
from app.core.auth import get_current_user_optional, get_current_admin
from app.services.chapter_service import ChapterService
from app.services.material_service import MaterialService
from app.services.notebook_service import NotebookService
from app.services.pdf_to_docx_service import convert_pdf_to_docx
from sqlalchemy.orm import Session

router = APIRouter()


def _user_id(user: Optional[User]) -> Optional[str]:
    return str(user.id) if user else None


@router.put("/admin/reorder")
async def admin_reorder_chapters(
    body: ChapterReorderRequest,
    service: ChapterService = Depends(get_chapter_service),
    current_user: User = Depends(get_current_admin),
):
    """管理员：按 ordered_ids 顺序重排章节"""
    service.reorder(body.ordered_ids)
    return {"message": "排序已更新"}


@router.get("/", response_model=List[ChapterResponse])
async def get_chapters(
    service: ChapterService = Depends(get_chapter_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """获取所有章节列表；已登录则返回该用户学习进度"""
    return service.get_all(user_id=_user_id(current_user))


def get_material_service(db: Session = Depends(get_db)) -> MaterialService:
    return MaterialService(db)


@router.get("/{chapter_id}/exam-info", response_model=ChapterExamInfo)
async def get_chapter_exam_info(chapter_id: int, db: Session = Depends(get_db)):
    """获取章节考核信息（是否有题、题数），无需登录。用于未登录时决定是否显示考核 Tab。"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    question_count = db.query(Question).filter(Question.chapter_id == chapter_id).count()
    return ChapterExamInfo(
        chapter_id=chapter_id,
        has_questions=question_count > 0,
        question_count=question_count,
    )


@router.get("/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(
    chapter_id: int,
    service: ChapterService = Depends(get_chapter_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """获取单个章节详情；已登录则返回该用户学习进度"""
    return service.get_by_id(chapter_id, user_id=_user_id(current_user))


@router.patch("/{chapter_id}", response_model=ChapterResponse)
async def admin_update_chapter(
    chapter_id: int,
    data: ChapterUpdate,
    service: ChapterService = Depends(get_chapter_service),
    current_user: User = Depends(get_current_admin),
):
    """管理员：更新章节（标题、描述、路径、序号等）"""
    return service.update(chapter_id, data)


@router.delete("/{chapter_id}")
async def admin_delete_chapter(
    chapter_id: int,
    service: ChapterService = Depends(get_chapter_service),
    current_user: User = Depends(get_current_admin),
):
    """管理员：删除章节"""
    service.delete(chapter_id)
    return {"message": "章节已删除"}


@router.post("/{chapter_id}/regenerate-content")
async def regenerate_chapter_content(
    chapter_id: int,
    material_service: MaterialService = Depends(get_material_service),
    current_user: User = Depends(get_current_admin),
):
    """管理员：为已有用户提交章节补生成 README、Notebook、考核题"""
    try:
        material_service.regenerate_chapter_content(chapter_id)
        return {"message": "补生成完成"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{chapter_id}/convert-to-docx")
async def convert_chapter_to_docx(
    chapter_id: int,
    body: Optional[ConvertOptions] = None,
    db: Session = Depends(get_db),
    notebook_service: NotebookService = Depends(get_notebook_service),
    current_user: User = Depends(get_current_admin),
):
    """管理员：将章节 PDF 转为 Word（.docx），保留版式、表格、图片。若已有 DOCX 则直接返回路径。"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    if not chapter.pdf_path:
        raise HTTPException(status_code=400, detail="本章节没有关联的 PDF，无法转换")
    base_dir = notebook_service.base_dir
    pdf_full = base_dir / chapter.pdf_path
    if not pdf_full.exists():
        raise HTTPException(status_code=404, detail="PDF 文件不存在")
    # 若已有 DOCX 且文件存在，直接返回
    if getattr(chapter, "docx_path", None):
        docx_full = base_dir / chapter.docx_path
        if docx_full.exists():
            return {"docx_path": chapter.docx_path, "already_exists": True}
    # 输出路径：与 PDF 同目录，扩展名为 .docx
    p = Path(chapter.pdf_path)
    rel_docx = (p.parent / (p.stem + ".docx")).as_posix()
    out_full = base_dir / rel_docx
    try:
        convert_pdf_to_docx(Path(pdf_full), Path(out_full), body)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    chapter.docx_path = rel_docx
    db.commit()
    return {"docx_path": rel_docx, "already_exists": False}

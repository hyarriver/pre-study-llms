"""
Notebook 相关路由 - API v1
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.core.dependencies import get_notebook_service, get_chapter_service
from app.services.notebook_service import NotebookService
from app.services.chapter_service import ChapterService

router = APIRouter()


@router.get("/{chapter_id}/content")
async def get_notebook_content(
    chapter_id: int,
    notebook_service: NotebookService = Depends(get_notebook_service),
    chapter_service: ChapterService = Depends(get_chapter_service)
):
    """获取 Notebook 内容（解析为 JSON）"""
    chapter = chapter_service.get_by_id(chapter_id)
    
    if not chapter.notebook_path:
        raise HTTPException(status_code=404, detail="章节没有关联的Notebook")
    
    try:
        notebook_dict = notebook_service.get_notebook_content(chapter.notebook_path)
        return notebook_dict
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{chapter_id}/readme")
async def get_readme(
    chapter_id: int,
    notebook_service: NotebookService = Depends(get_notebook_service),
    chapter_service: ChapterService = Depends(get_chapter_service)
):
    """获取 README 内容"""
    import logging
    logger = logging.getLogger(__name__)
    
    chapter = chapter_service.get_by_id(chapter_id)
    
    if not chapter.readme_path:
        raise HTTPException(status_code=404, detail="章节没有关联的README")
    
    try:
        logger.info(f"读取README: chapter_id={chapter_id}, path={chapter.readme_path}")
        content = notebook_service.get_readme_content(chapter.readme_path)
        logger.info(f"README内容长度: {len(content) if content else 0}")
        return {"content": content}
    except FileNotFoundError as e:
        logger.error(f"README文件未找到: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"读取README时出错: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"读取README失败: {str(e)}")


@router.get("/{chapter_id}/pdf")
async def get_pdf(
    chapter_id: int,
    notebook_service: NotebookService = Depends(get_notebook_service),
    chapter_service: ChapterService = Depends(get_chapter_service)
):
    """获取 PDF 文件"""
    chapter = chapter_service.get_by_id(chapter_id)
    
    if not chapter.pdf_path:
        raise HTTPException(status_code=404, detail="章节没有关联的PDF")
    
    try:
        pdf_path = notebook_service.get_pdf_path(chapter.pdf_path)
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=pdf_path.name
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

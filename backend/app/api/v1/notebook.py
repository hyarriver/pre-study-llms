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
    """获取章节文档（PDF 或 DOCX）。优先返回 pdf_path 指向的文件；若前端需要 Word 请使用 GET /docx。"""
    chapter = chapter_service.get_by_id(chapter_id)
    path_to_use = chapter.pdf_path
    if not path_to_use:
        raise HTTPException(status_code=404, detail="章节没有关联的文档")
    try:
        doc_path = notebook_service.get_pdf_path(path_to_use)
        ext = doc_path.suffix.lower()
        if ext == ".docx":
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            media_type = "application/pdf"
        return FileResponse(
            path=str(doc_path),
            media_type=media_type,
            filename=doc_path.name
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{chapter_id}/docx")
async def get_docx(
    chapter_id: int,
    notebook_service: NotebookService = Depends(get_notebook_service),
    chapter_service: ChapterService = Depends(get_chapter_service)
):
    """获取章节 Word 文档（.docx）。仅当章节已转换出 DOCX 时可用。"""
    chapter = chapter_service.get_by_id(chapter_id)
    docx_path = getattr(chapter, "docx_path", None)
    if not docx_path:
        raise HTTPException(status_code=404, detail="本章节暂无 Word 文档，请先在管理端使用「转为 Word」生成")
    try:
        doc_path = notebook_service.get_pdf_path(docx_path)
        if not doc_path.exists():
            raise HTTPException(status_code=404, detail="Word 文档文件不存在")
        return FileResponse(
            path=str(doc_path),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=doc_path.name,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Word 文档文件不存在")

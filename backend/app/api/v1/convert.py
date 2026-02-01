"""
PDF → Markdown → AI → DOCX 转换 API

POST /upload: 上传 PDF，返回 task_id
GET /status/{task_id}: 查询任务状态
GET /download/{task_id}: 下载 DOCX
"""
import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import settings
from app.services.pdf_ai_pipeline import (
    STATUS_DONE,
    STATUS_FAILED,
    STATUS_PENDING,
    STATUS_PROCESSING,
    create_task_id,
    get_task_status,
    run_pipeline,
    set_task_pending,
)

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf"}
MAX_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _get_convert_dirs():
    """获取 convert 相关目录"""
    from app.services.pdf_ai_pipeline import _get_convert_dirs as get_dirs

    return get_dirs()


def _run_pipeline_background(pdf_path: Path, task_id: str, insert_exam_questions: bool):
    """后台执行流水线"""
    try:
        run_pipeline(
            pdf_path=pdf_path,
            task_id=task_id,
            insert_exam_questions=insert_exam_questions,
        )
    except Exception as e:
        logger.exception("流水线执行失败: %s", e)
    finally:
        # 清理上传的 PDF（任务完成后删除）
        try:
            if pdf_path.exists():
                pdf_path.unlink()
        except OSError as e:
            logger.warning("清理上传文件失败: %s", e)


@router.post("/upload")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    insert_exam_questions: str = Form("false"),
):
    """
    上传 PDF，返回 task_id。后台异步执行 PDF → Markdown → AI → DOCX 流水线。
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="仅支持 PDF 格式")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件大小不能超过 {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    task_id = create_task_id()
    set_task_pending(task_id)

    uploads_dir, _, _ = _get_convert_dirs()
    uploads_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = uploads_dir / f"{task_id}.pdf"
    pdf_path.write_bytes(content)

    insert_exam = str(insert_exam_questions or "").strip().lower() in ("1", "true", "yes")

    background_tasks.add_task(
        _run_pipeline_background,
        pdf_path=pdf_path,
        task_id=task_id,
        insert_exam_questions=insert_exam,
    )

    return {"task_id": task_id, "status": STATUS_PENDING}


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    """查询任务状态：pending / processing / done / failed"""
    info = get_task_status(task_id)
    if not info:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "task_id": task_id,
        "status": info["status"],
        "error": info.get("error"),
    }


@router.get("/download/{task_id}")
async def download_docx(task_id: str):
    """下载生成的 DOCX 文件，仅 status=done 时可用"""
    info = get_task_status(task_id)
    if not info:
        raise HTTPException(status_code=404, detail="任务不存在")
    if info["status"] == STATUS_FAILED:
        raise HTTPException(
            status_code=400,
            detail=f"转换失败: {info.get('error', '未知错误')}",
        )
    if info["status"] in (STATUS_PENDING, STATUS_PROCESSING):
        raise HTTPException(
            status_code=202,
            detail="任务尚未完成，请稍后重试",
        )
    if info["status"] != STATUS_DONE:
        raise HTTPException(status_code=400, detail="任务状态异常")

    output_path = info.get("output_path")
    if not output_path:
        _, _, outputs_dir = _get_convert_dirs()
        output_path = outputs_dir / f"{task_id}.docx"

    path = Path(output_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="输出文件不存在")

    return FileResponse(
        path=str(path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{task_id}.docx",
    )

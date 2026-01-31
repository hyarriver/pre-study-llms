"""
材料提交与审核 API
"""
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

logger = logging.getLogger(__name__)
from typing import List, Optional

from app.models import User
from app.schemas.material import MaterialSubmissionResponse, MaterialSubmissionWithUser, RejectRequest
from app.core.auth import get_current_user, get_current_admin
from app.core.dependencies import get_db
from app.services.material_service import MaterialService
from app.core.config import settings

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def get_material_service(db=Depends(get_db)) -> MaterialService:
    return MaterialService(db)


@router.post("/submit", response_model=MaterialSubmissionResponse)
async def submit_material(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
):
    """用户上传学习材料（PDF 或 DOCX）"""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"仅支持 PDF 和 DOCX 格式")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件大小不能超过 {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        submission = service.submit(
            user_id=current_user.id,
            title=title.strip(),
            description=description.strip() if description else None,
            file_path=tmp_path,
            file_ext=ext,
        )
        return submission
    except OSError as e:
        logger.exception("上传文件保存失败: %s", e)
        raise HTTPException(status_code=500, detail=f"无法保存上传文件: {str(e)}")
    except Exception as e:
        from sqlalchemy.exc import SQLAlchemyError
        if isinstance(e, SQLAlchemyError):
            logger.exception("数据库错误: %s", e)
            raise HTTPException(status_code=500, detail="数据库操作失败，请检查服务是否已正确初始化")
        logger.exception("材料提交失败: %s", e)
        if settings.DEBUG:
            raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail="服务器内部错误，请稍后重试")
    finally:
        tmp_path.unlink(missing_ok=True)


@router.get("/my-submissions", response_model=List[MaterialSubmissionResponse])
def get_my_submissions(
    current_user: User = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
):
    """获取当前用户的提交列表"""
    return service.get_my_submissions(current_user.id)


@router.get("/admin/pending", response_model=List[MaterialSubmissionWithUser])
def get_pending_submissions(
    current_user: User = Depends(get_current_admin),
    service: MaterialService = Depends(get_material_service),
):
    """管理员：获取待审核列表"""
    submissions = service.get_pending_submissions()
    result = []
    for s in submissions:
        data = MaterialSubmissionWithUser(
            **MaterialSubmissionResponse.model_validate(s).model_dump(),
            user_nickname=s.user.nickname if s.user else None,
            user_username=s.user.username if s.user else None,
        )
        result.append(data)
    return result


@router.post("/admin/{submission_id}/approve")
def approve_submission(
    submission_id: int,
    current_user: User = Depends(get_current_admin),
    service: MaterialService = Depends(get_material_service),
):
    """管理员：通过审核"""
    try:
        chapter = service.approve(submission_id, current_user.id)
        return {"message": "审核通过", "chapter_id": chapter.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/{submission_id}/reject")
def reject_submission(
    submission_id: int,
    body: Optional[RejectRequest] = None,
    current_user: User = Depends(get_current_admin),
    service: MaterialService = Depends(get_material_service),
):
    """管理员：驳回"""
    try:
        reason = body.reason if body else None
        service.reject(submission_id, current_user.id, reason)
        return {"message": "已驳回"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/{submission_id}/preview")
def preview_submission_file(
    submission_id: int,
    current_user: User = Depends(get_current_admin),
    service: MaterialService = Depends(get_material_service),
):
    """管理员：预览文档（返回文件流）"""
    from fastapi.responses import FileResponse

    submission = service.get_by_id(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="提交不存在")
    path = service.get_file_path(submission)
    if not path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    media_type = "application/pdf" if submission.file_type == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(path=str(path), media_type=media_type, filename=f"preview{'.pdf' if submission.file_type == 'pdf' else '.docx'}")

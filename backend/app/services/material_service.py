"""
材料提交与审核服务层
"""
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import MaterialSubmission, Chapter, User, Question
from app.schemas.material import MaterialSubmissionResponse, MaterialSubmissionWithUser
from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
FILE_TYPE_MAP = {".pdf": "pdf", ".docx": "docx"}


def _get_base_dir() -> Path:
    """获取项目根目录（与 NotebookService 逻辑一致）"""
    if settings.BASE_DIR:
        return Path(settings.BASE_DIR)
    backend_dir = Path(__file__).resolve().parent.parent.parent
    if (backend_dir / "documents").exists():
        return backend_dir
    if (backend_dir.parent / "documents").exists():
        return backend_dir.parent
    return backend_dir


def _get_uploads_base() -> Path:
    """获取上传根目录（使用 data/uploads，Docker 中 data 挂载可写）"""
    base = _get_base_dir()
    subdir = getattr(settings, "UPLOADS_SUBDIR", "data/uploads")
    return base / subdir


class MaterialService:
    """材料提交与审核服务"""

    def __init__(self, db: Session):
        self.db = db
        self.base_dir = _get_base_dir()
        self.uploads_base = _get_uploads_base()
        self.pending_dir = self.uploads_base / "pending"

    def _ensure_upload_dirs(self):
        """确保上传目录存在"""
        try:
            self.pending_dir.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            logger.error("无法创建上传目录 %s: %s（请检查目录权限）", self.pending_dir, e)
            raise

    def submit(
        self,
        user_id: int,
        title: str,
        description: Optional[str],
        file_path: Path,
        file_ext: str,
    ) -> MaterialSubmission:
        """用户提交材料：创建记录并保存文件"""
        file_type = FILE_TYPE_MAP.get(file_ext, file_ext.lstrip("."))
        self._ensure_upload_dirs()

        # 先创建记录以获取 id
        submission = MaterialSubmission(
            user_id=user_id,
            title=title,
            description=description or "",
            file_path="",  # 稍后更新
            file_type=file_type,
            status="pending",
        )
        self.db.add(submission)
        self.db.flush()  # 获取 id

        # 保存文件到 uploads/pending/{id}/document.{ext}
        dest_dir = self.pending_dir / str(submission.id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / f"document{file_ext}"
        shutil.copy2(file_path, dest_file)

        # 相对路径（data/uploads 在 Docker 中可写）
        subdir = getattr(settings, "UPLOADS_SUBDIR", "data/uploads")
        rel_path = f"{subdir}/pending/{submission.id}/document{file_ext}"
        submission.file_path = rel_path
        self.db.commit()
        self.db.refresh(submission)
        return submission

    def get_my_submissions(self, user_id: int) -> List[MaterialSubmission]:
        """获取当前用户的提交列表"""
        return (
            self.db.query(MaterialSubmission)
            .filter(MaterialSubmission.user_id == user_id)
            .order_by(MaterialSubmission.created_at.desc())
            .all()
        )

    def get_pending_submissions(self) -> List[MaterialSubmission]:
        """获取待审核列表"""
        return (
            self.db.query(MaterialSubmission)
            .options(joinedload(MaterialSubmission.user))
            .filter(MaterialSubmission.status == "pending")
            .order_by(MaterialSubmission.created_at.asc())
            .all()
        )

    def get_by_id(self, submission_id: int) -> Optional[MaterialSubmission]:
        """根据 ID 获取提交"""
        return self.db.query(MaterialSubmission).filter(MaterialSubmission.id == submission_id).first()

    def get_file_path(self, submission: MaterialSubmission) -> Path:
        """获取提交文件的绝对路径"""
        return self.base_dir / submission.file_path

    def approve(self, submission_id: int, admin_id: int) -> Chapter:
        """审核通过：创建章节、移动文件、生成考核题"""
        submission = self.get_by_id(submission_id)
        if not submission:
            raise ValueError("提交不存在")
        if submission.status != "pending":
            raise ValueError("该提交已处理")

        src_path = self.get_file_path(submission)
        if not src_path.exists():
            raise ValueError("上传文件不存在")

        # 获取下一个章节号
        max_num = self.db.query(func.max(Chapter.chapter_number)).scalar() or 0
        next_num = max_num + 1
        chapter_dir = self.base_dir / "documents" / f"chapter_user_{next_num}"
        chapter_dir.mkdir(parents=True, exist_ok=True)

        ext = ".pdf" if submission.file_type == "pdf" else ".docx"
        dest_file = chapter_dir / f"document{ext}"
        shutil.move(str(src_path), str(dest_file))

        # 删除空目录
        try:
            src_path.parent.rmdir()
        except OSError:
            pass

        rel_path = f"documents/chapter_user_{next_num}/document{ext}"
        chapter = Chapter(
            chapter_number=next_num,
            title=submission.title,
            description=submission.description or "",
            notebook_path=None,
            readme_path=None,
            pdf_path=rel_path,
            source_type="user_submitted",
            submission_id=submission.id,
        )
        self.db.add(chapter)
        self.db.flush()

        # 生成考核题
        self._generate_exam_questions(chapter, submission)

        submission.status = "approved"
        submission.chapter_id = chapter.id
        submission.reviewed_by = admin_id
        submission.reviewed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(chapter)
        return chapter

    def reject(self, submission_id: int, admin_id: int, reason: Optional[str] = None):
        """审核驳回"""
        submission = self.get_by_id(submission_id)
        if not submission:
            raise ValueError("提交不存在")
        if submission.status != "pending":
            raise ValueError("该提交已处理")

        submission.status = "rejected"
        submission.reject_reason = reason
        submission.reviewed_by = admin_id
        submission.reviewed_at = datetime.utcnow()

        # 删除上传文件
        src_path = self.get_file_path(submission)
        if src_path.exists():
            try:
                shutil.rmtree(src_path.parent)
            except OSError as e:
                logger.warning("删除上传文件失败: %s", e)

        self.db.commit()

    def _generate_exam_questions(self, chapter: Chapter, submission: MaterialSubmission):
        """从文档提取文本并生成考核题"""
        try:
            from app.services.exam_generator import generate_questions_from_document
            doc_path = self.base_dir / chapter.pdf_path
            questions_data = generate_questions_from_document(
                doc_path,
                chapter.chapter_number,
                chapter.title,
            )
            for idx, q in enumerate(questions_data):
                self.db.add(
                    Question(
                        chapter_id=chapter.id,
                        question_type=q.get("type", "single_choice"),
                        content=q["content"],
                        options=q.get("options"),
                        answer=q["answer"],
                        explanation=q.get("explanation"),
                        score=10,
                        order_index=idx + 1,
                    )
                )
        except Exception as e:
            logger.warning("生成考核题失败，章节仍会创建: %s", e)

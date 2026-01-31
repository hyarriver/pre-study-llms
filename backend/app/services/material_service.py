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
        generate_docx: bool = False,
    ) -> MaterialSubmission:
        """用户提交材料：创建记录并保存文件。仅 PDF 时 generate_docx 有效，审核通过后会同时生成 DOCX。"""
        file_type = FILE_TYPE_MAP.get(file_ext, file_ext.lstrip("."))
        self._ensure_upload_dirs()

        # 先创建记录以获取 id
        submission = MaterialSubmission(
            user_id=user_id,
            title=title,
            description=description or "",
            file_path="",  # 稍后更新
            file_type=file_type,
            generate_docx=1 if generate_docx else 0,
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
        """获取当前用户的提交列表（不含用户已软删除的）"""
        return (
            self.db.query(MaterialSubmission)
            .filter(MaterialSubmission.user_id == user_id)
            .filter(MaterialSubmission.deleted_by_user_at.is_(None))
            .order_by(MaterialSubmission.created_at.desc())
            .all()
        )

    def delete_my_submission(self, submission_id: int, user_id: int) -> None:
        """用户软删除自己的提交记录"""
        submission = self.get_by_id(submission_id)
        if not submission:
            raise ValueError("提交不存在")
        if submission.user_id != user_id:
            raise ValueError("无权操作")
        submission.deleted_by_user_at = datetime.utcnow()
        self.db.commit()

    def get_pending_submissions(self) -> List[MaterialSubmission]:
        """获取待审核列表"""
        return (
            self.db.query(MaterialSubmission)
            .options(joinedload(MaterialSubmission.user))
            .filter(MaterialSubmission.status == "pending")
            .order_by(MaterialSubmission.created_at.asc())
            .all()
        )

    def get_all_submissions(self) -> List[MaterialSubmission]:
        """管理员：获取全部提交记录（含用户已软删除的）"""
        return (
            self.db.query(MaterialSubmission)
            .options(joinedload(MaterialSubmission.user))
            .order_by(MaterialSubmission.created_at.desc())
            .all()
        )

    def admin_delete_submission(self, submission_id: int) -> None:
        """管理员：彻底删除提交记录。pending 时删除文件；approved 时仅删记录，章节保留。"""
        submission = self.get_by_id(submission_id)
        if not submission:
            raise ValueError("提交不存在")
        if submission.status == "pending":
            src_path = self.get_file_path(submission)
            if src_path.exists():
                try:
                    shutil.rmtree(src_path.parent)
                except OSError as e:
                    logger.warning("删除上传文件失败: %s", e)
        self.db.delete(submission)
        self.db.commit()

    def get_by_id(self, submission_id: int) -> Optional[MaterialSubmission]:
        """根据 ID 获取提交"""
        return self.db.query(MaterialSubmission).filter(MaterialSubmission.id == submission_id).first()

    def get_file_path(self, submission: MaterialSubmission) -> Path:
        """获取提交文件的绝对路径（仅对未审核/驳回有效；已通过后文件已移至章节目录）"""
        return self.base_dir / submission.file_path

    def get_preview_file_path(self, submission: MaterialSubmission) -> Path:
        """
        获取用于预览的文档绝对路径。
        已通过审核的提交，文件已移至章节目录，从关联章节的 pdf_path/docx_path 取；
        否则从提交时的 file_path 取。
        """
        if submission.status == "approved" and submission.chapter_id:
            chapter = self.db.query(Chapter).filter(Chapter.id == submission.chapter_id).first()
            if chapter:
                # 优先使用 PDF/文档路径（章节里 pdf_path 存的是主文档，可能是 .pdf 或 .docx）
                for rel in (chapter.pdf_path, getattr(chapter, "docx_path", None)):
                    if rel:
                        path = self.base_dir / rel
                        if path.exists():
                            return path
        return self.get_file_path(submission)

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

        # 从文档生成 README 并写入章节目录
        readme_rel = self._generate_readme(
            chapter_dir=chapter_dir,
            doc_path=dest_file,
            title=submission.title,
            description=submission.description or "",
            next_num=next_num,
        )
        if readme_rel:
            chapter.readme_path = readme_rel

        # 从文档生成 Notebook 并写入章节目录
        notebook_rel = self._generate_notebook(
            chapter_dir=chapter_dir,
            doc_path=dest_file,
            title=submission.title,
            description=submission.description or "",
            next_num=next_num,
        )
        if notebook_rel:
            chapter.notebook_path = notebook_rel

        # 生成考核题
        self._generate_exam_questions(chapter, submission)

        # 若用户勾选「同时生成 Word」且为 PDF，则转换并写入 docx_path
        if submission.file_type == "pdf" and getattr(submission, "generate_docx", 0):
            try:
                from app.services.pdf_to_docx_service import convert_pdf_to_docx
                out_docx = chapter_dir / "document.docx"
                convert_pdf_to_docx(Path(dest_file), Path(out_docx))
                chapter.docx_path = f"documents/chapter_user_{next_num}/document.docx"
            except Exception as e:
                logger.warning("审核通过时生成 DOCX 失败: %s", e)

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

    def _generate_readme(
        self,
        chapter_dir: Path,
        doc_path: Path,
        title: str,
        description: str,
        next_num: int,
    ) -> Optional[str]:
        """从文档生成 README.md 并写入章节目录，返回相对路径或 None。"""
        try:
            from app.services.exam_generator import generate_readme_from_document
            content = generate_readme_from_document(doc_path, title, description)
            if not content:
                return None
            readme_file = chapter_dir / "README.md"
            readme_file.write_text(content, encoding="utf-8")
            return f"documents/chapter_user_{next_num}/README.md"
        except Exception as e:
            logger.warning("生成或写入 README 失败: %s", e)
            return None

    def _generate_notebook(
        self,
        chapter_dir: Path,
        doc_path: Path,
        title: str,
        description: str,
        next_num: int,
    ) -> Optional[str]:
        """从文档生成 Notebook 并写入章节目录，返回相对路径或 None。失败时写入占位 notebook（仅标题）。"""
        from app.services.exam_generator import (
            generate_notebook_from_document,
            write_notebook_to_file,
        )
        output_path = chapter_dir / "content.ipynb"
        cells_content = None
        try:
            cells_content = generate_notebook_from_document(doc_path, title, description)
        except Exception as e:
            logger.warning("生成 Notebook 内容失败: %s", e)
        if cells_content and write_notebook_to_file(cells_content, output_path):
            return f"documents/chapter_user_{next_num}/content.ipynb"
        # 兜底：写入仅含标题的占位 notebook
        placeholder_cells = [f"# {title}\n\n{description or '本章节为上传文档，可于 PDF/文档 标签查看原文。'}"]
        if write_notebook_to_file(placeholder_cells, output_path):
            return f"documents/chapter_user_{next_num}/content.ipynb"
        return None

    def regenerate_chapter_content(self, chapter_id: int) -> None:
        """管理员：为已有用户提交章节补生成 README、Notebook、考核题。仅对 source_type=user_submitted 且 pdf_path 存在的章节有效。"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ValueError("章节不存在")
        if getattr(chapter, "source_type", None) != "user_submitted":
            raise ValueError("仅支持用户提交的章节")
        if not chapter.pdf_path:
            raise ValueError("章节无文档路径")
        doc_path = self.base_dir / chapter.pdf_path
        if not doc_path.exists():
            raise ValueError("文档文件不存在")
        chapter_dir = doc_path.parent
        next_num = chapter.chapter_number

        readme_rel = self._generate_readme(
            chapter_dir=chapter_dir,
            doc_path=doc_path,
            title=chapter.title,
            description=chapter.description or "",
            next_num=next_num,
        )
        if readme_rel:
            chapter.readme_path = readme_rel

        notebook_rel = self._generate_notebook(
            chapter_dir=chapter_dir,
            doc_path=doc_path,
            title=chapter.title,
            description=chapter.description or "",
            next_num=next_num,
        )
        if notebook_rel:
            chapter.notebook_path = notebook_rel

        self.db.query(Question).filter(Question.chapter_id == chapter_id).delete()
        self._generate_exam_questions(chapter, None)
        self.db.commit()

    def _generate_exam_questions(self, chapter: Chapter, submission: Optional[MaterialSubmission]):
        """从文档提取文本并生成考核题。优先文档；若未生成题目或文档抛错且已有 notebook，则从 notebook 兜底生成。"""
        from app.services.exam_generator import (
            generate_questions_from_document,
            generate_questions_from_notebook,
        )

        # 优先使用已转换的 DOCX（与转换后文档一致），否则用 PDF
        doc_path = None
        if getattr(chapter, "docx_path", None):
            candidate = self.base_dir / chapter.docx_path
            if candidate.exists():
                doc_path = candidate
        if not doc_path and chapter.pdf_path:
            doc_path = self.base_dir / chapter.pdf_path

        questions_data = []
        # 1) 尝试从文档生成；若抛错也继续走 notebook 兜底
        if doc_path and doc_path.exists():
            try:
                questions_data = generate_questions_from_document(
                    doc_path,
                    chapter.chapter_number,
                    chapter.title,
                    use_enhanced=True,
                )
            except Exception as e:
                logger.warning(
                    "从文档生成考核题异常（章节 %s），将尝试从 Notebook 兜底: %s",
                    chapter.chapter_number,
                    e,
                )
        else:
            logger.warning("章节 %s 无文档路径或文件不存在，尝试从 Notebook 生成考核题", chapter.chapter_number)

        # 2) 兜底：若文档未生成任何题目且本章已有 notebook，则从 notebook 生成
        if not questions_data and chapter.notebook_path:
            nb_path = self.base_dir / chapter.notebook_path
            if nb_path.exists():
                try:
                    questions_data = generate_questions_from_notebook(
                        nb_path,
                        chapter.chapter_number,
                        chapter.title,
                    )
                except Exception as e:
                    logger.warning("从 Notebook 兜底生成考核题失败（章节 %s）: %s", chapter.chapter_number, e)

        if not questions_data:
            logger.warning(
                "生成考核题失败：未生成任何题目（章节 %s）。可能原因：OPENAI_API_KEY 未设置、文档/Notebook 无有效文本、或 LLM 调用失败。请检查后端日志与环境配置。",
                chapter.chapter_number,
            )
            return

        try:
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
            logger.warning("写入考核题到数据库失败（章节 %s）: %s", chapter.chapter_number, e)

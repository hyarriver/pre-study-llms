"""
PDF → Markdown → AI → DOCX 流水线

流程：PDF → marker → raw.md → LLM 增强 → enhanced.md → Pandoc → DOCX
"""
import logging
import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger(__name__)

# 任务状态
STATUS_PENDING = "pending"
STATUS_PROCESSING = "processing"
STATUS_DONE = "done"
STATUS_FAILED = "failed"

# 任务存储：task_id -> {"status": str, "error": str | None, "output_path": Path | None}
_task_store: dict[str, dict] = {}


def _get_base_dir() -> Path:
    """获取项目根目录"""
    from app.core.config import settings

    if settings.BASE_DIR:
        return Path(settings.BASE_DIR)
    backend_dir = Path(__file__).resolve().parent.parent.parent
    if (backend_dir / "documents").exists():
        return backend_dir
    if (backend_dir.parent / "documents").exists():
        return backend_dir.parent
    return backend_dir


def _get_convert_dirs() -> tuple[Path, Path, Path]:
    """返回 (uploads_dir, temp_dir, outputs_dir)"""
    base = _get_base_dir()
    # 使用 config 中的 CONVERT_* 或默认路径
    from app.core.config import settings

    uploads = getattr(settings, "CONVERT_UPLOADS_DIR", "data/convert/uploads")
    temp = getattr(settings, "CONVERT_TEMP_DIR", "data/convert/temp")
    outputs = getattr(settings, "CONVERT_OUTPUTS_DIR", "data/convert/outputs")
    return (
        base / uploads,
        base / temp,
        base / outputs,
    )


def _pdf_to_markdown(pdf_path: Path, output_md: Path) -> None:
    """
    PDF → Markdown，使用 marker-pdf；失败则回退到 extract_pdf_text_enhanced。
    """
    output_md = Path(output_md)
    output_md.parent.mkdir(parents=True, exist_ok=True)

    # 1. 尝试 marker-pdf
    try:
        from marker.converters.pdf import PdfConverter
        from marker.models import create_model_dict

        converter = PdfConverter(artifact_dict=create_model_dict())
        rendered = converter(str(pdf_path))
        text = None
        if hasattr(rendered, "markdown"):
            text = rendered.markdown or ""
        else:
            try:
                from marker.output import text_from_rendered

                text, _, _ = text_from_rendered(rendered)
            except (ImportError, AttributeError):
                text = getattr(rendered, "markdown", None) or ""
        if text and str(text).strip():
            output_md.write_text(str(text).strip(), encoding="utf-8")
            logger.info("PDF 经 marker 转 Markdown 完成: %s -> %s", pdf_path, output_md)
            return
    except ImportError as e:
        logger.warning("marker-pdf 未安装，回退到 OCR 提取: %s", e)
    except Exception as e:
        logger.warning("marker 转换失败，回退到 OCR 提取: %s", e)

    # 2. Fallback: extract_pdf_text_enhanced（纯文本转简易 Markdown）
    from app.services.exam_generator import extract_pdf_text_enhanced

    text = extract_pdf_text_enhanced(pdf_path)
    if not text.strip():
        raise ValueError("PDF 无有效文本内容，无法生成 Markdown")
    # 纯文本即有效 Markdown（段落由空行分隔）
    output_md.write_text(text.strip(), encoding="utf-8")
    logger.info("PDF 经 OCR 兜底转 Markdown 完成: %s -> %s", pdf_path, output_md)


def _llm_enhance_markdown(
    raw_md_path: Path,
    enhanced_md_path: Path,
    insert_exam_questions: bool = False,
) -> None:
    """
    对 raw Markdown 调用 LLM 增强：修复断句、合并碎段、优化标题、可选插入考核题。
    未配置 OPENAI_API_KEY 时直接复制 raw → enhanced。
    """
    raw_md_path = Path(raw_md_path)
    enhanced_md_path = Path(enhanced_md_path)
    raw_content = raw_md_path.read_text(encoding="utf-8").strip()
    if not raw_content:
        enhanced_md_path.write_text("", encoding="utf-8")
        return

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.info("未配置 OPENAI_API_KEY，跳过 LLM 增强")
        shutil.copy2(raw_md_path, enhanced_md_path)
        return

    from app.core.config import settings

    timeout = getattr(settings, "LLM_TIMEOUT_SECONDS", 120)
    max_retries = getattr(settings, "LLM_MAX_RETRIES", 2)

    exam_rule = (
        "在每个二级标题（##）后插入 2 道理解题，格式：\n"
        "**理解题 1**：题干\n- A. 选项A\n- B. 选项B\n- C. 选项C\n- D. 选项D\n**答案**：X\n\n"
        if insert_exam_questions
        else ""
    )

    system = """你是一个专业教材结构化助手。
请对以下 Markdown 内容进行处理。

规则：
- 保留原有标题层级（# / ## / ###）
- 修复被拆散的段落
- 提升语言通顺度
- 不改变原始含义
"""
    if exam_rule:
        system += exam_rule
    system += """
输出仍为 Markdown。禁止输出解释性文字，只返回 Markdown。"""

    user = f"请处理以下 Markdown：\n\n{raw_content}"

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, timeout=timeout)
        base_url = os.environ.get("OPENAI_BASE_URL")
        if base_url:
            client = OpenAI(api_key=api_key, base_url=base_url, timeout=timeout)

        last_error: Optional[Exception] = None
        for attempt in range(max_retries + 1):
            try:
                resp = client.chat.completions.create(
                    model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    temperature=0.3,
                )
                raw = (resp.choices[0].message.content or "").strip()
                if raw:
                    # 去除可能的代码块包裹
                    raw = raw.replace("```markdown", "").replace("```md", "").replace("```", "").strip()
                    enhanced_md_path.parent.mkdir(parents=True, exist_ok=True)
                    enhanced_md_path.write_text(raw, encoding="utf-8")
                    logger.info("LLM 增强 Markdown 完成")
                    return
            except Exception as e:
                last_error = e
                logger.warning("LLM 调用失败 (尝试 %d/%d): %s", attempt + 1, max_retries + 1, e)
                if attempt < max_retries:
                    time.sleep(3)

        # 重试耗尽，使用 raw
        logger.warning("LLM 增强失败，使用原始 Markdown: %s", last_error)
        shutil.copy2(raw_md_path, enhanced_md_path)
    except ImportError:
        logger.warning("openai 未安装，跳过 LLM 增强")
        shutil.copy2(raw_md_path, enhanced_md_path)


def _markdown_to_docx(md_path: Path, output_docx: Path, reference_doc: Optional[Path] = None) -> None:
    """
    使用 Pandoc 将 Markdown 转为 DOCX。
    """
    md_path = Path(md_path)
    output_docx = Path(output_docx)
    output_docx.parent.mkdir(parents=True, exist_ok=True)

    pandoc = shutil.which("pandoc")
    if not pandoc:
        raise RuntimeError("未找到 pandoc，请安装: https://pandoc.org")

    cmd = [pandoc, str(md_path), "-o", str(output_docx)]
    if reference_doc and reference_doc.exists():
        cmd.extend(["--reference-doc", str(reference_doc)])

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
        logger.info("Pandoc 转 DOCX 完成: %s -> %s", md_path, output_docx)
    except subprocess.CalledProcessError as e:
        logger.error("Pandoc 失败: %s, stderr: %s", e, e.stderr or "")
        raise RuntimeError(f"Pandoc 转换失败: {e.stderr or str(e)}") from e
    except subprocess.TimeoutExpired:
        raise RuntimeError("Pandoc 转换超时") from None


def run_pipeline(
    pdf_path: Path,
    task_id: str,
    insert_exam_questions: bool = False,
    on_status_change: Optional[Callable[[str, str], None]] = None,
) -> Path:
    """
    执行完整流水线：PDF → marker → raw.md → LLM → enhanced.md → Pandoc → DOCX。

    on_status_change: 可选回调 (task_id, status)
    """
    _, temp_dir, outputs_dir = _get_convert_dirs()
    task_temp = temp_dir / task_id
    raw_md = task_temp / "raw.md"
    enhanced_md = task_temp / "enhanced.md"
    output_docx = outputs_dir / f"{task_id}.docx"

    def _set_status(status: str, error: Optional[str] = None):
        _task_store[task_id] = {
            "status": status,
            "error": error,
            "output_path": str(output_docx) if output_docx.exists() else None,
        }
        if on_status_change:
            try:
                on_status_change(task_id, status)
            except Exception:
                pass

    _set_status(STATUS_PROCESSING)

    try:
        # 1. PDF → raw.md
        _pdf_to_markdown(Path(pdf_path), raw_md)

        # 2. LLM 增强
        _llm_enhance_markdown(raw_md, enhanced_md, insert_exam_questions=insert_exam_questions)

        # 3. Pandoc → DOCX
        base = _get_base_dir()
        reference_doc = base / "data" / "convert" / "reference.docx"
        _markdown_to_docx(enhanced_md, output_docx, reference_doc=reference_doc)

        _set_status(STATUS_DONE)

        # 清理 temp
        try:
            if raw_md.exists():
                raw_md.unlink()
            if enhanced_md.exists():
                enhanced_md.unlink()
            if task_temp.exists():
                task_temp.rmdir()
        except OSError as e:
            logger.warning("清理临时文件失败: %s", e)

        return output_docx
    except Exception as e:
        logger.exception("流水线失败: %s", e)
        _set_status(STATUS_FAILED, str(e))
        raise


def create_task_id() -> str:
    """生成唯一 task_id"""
    return str(uuid.uuid4())


def get_task_status(task_id: str) -> Optional[dict]:
    """获取任务状态"""
    return _task_store.get(task_id)


def set_task_pending(task_id: str) -> None:
    """设置任务为 pending"""
    _task_store[task_id] = {"status": STATUS_PENDING, "error": None, "output_path": None}

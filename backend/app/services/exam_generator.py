"""
从文档（PDF/DOCX）提取文本并调用 LLM 生成考核题
"""
import json
import logging
import os
import re
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)
MAX_MATERIAL_CHARS = 14000
MAX_README_MATERIAL_CHARS = 12000


def extract_pdf_text(pdf_path: Path) -> str:
    """从 PDF 提取文本"""
    if not pdf_path.exists():
        return ""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n\n".join(text_parts)
    except ImportError:
        logger.warning("pdfplumber 未安装，无法提取 PDF 文本")
        return ""
    except Exception as e:
        logger.warning("提取 PDF 文本失败: %s", e)
        return ""


def extract_docx_text(docx_path: Path) -> str:
    """从 DOCX 提取文本"""
    if not docx_path.exists():
        return ""
    try:
        from docx import Document
        doc = Document(docx_path)
        parts = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(parts)
    except ImportError:
        logger.warning("python-docx 未安装，无法提取 DOCX 文本")
        return ""
    except Exception as e:
        logger.warning("提取 DOCX 文本失败: %s", e)
        return ""


def extract_document_text(doc_path: Path) -> str:
    """根据扩展名从 PDF 或 DOCX 提取文本"""
    ext = doc_path.suffix.lower()
    if ext == ".pdf":
        return extract_pdf_text(doc_path)
    if ext in (".docx", ".doc"):
        return extract_docx_text(doc_path)
    return ""


def _call_llm(material: str, chapter_number: int, title: str) -> List[dict]:
    """调用 LLM 生成题目"""
    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("openai 未安装")
        return []

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("未设置 OPENAI_API_KEY，跳过考核题生成")
        return []

    client = OpenAI(api_key=api_key)
    base_url = os.environ.get("OPENAI_BASE_URL")
    if base_url:
        client = OpenAI(api_key=api_key, base_url=base_url)

    system = """你是一个出题助手。根据用户提供的「章节材料」文本，生成章节考核题。
要求：
1. 只输出一个 JSON 数组，不要其他说明。
2. 每题格式：
   - type: "single_choice" 或 "true_false"
   - content: 题干（字符串）
   - options: 选项列表。单选题为 [{"key":"A","value":"选项A"}, ...] 至少4项；判断题为 [{"key":"true","value":"正确"},{"key":"false","value":"错误"}]
   - answer: 正确答案的 key，如 "B" 或 "true"
   - explanation: 简短解析（字符串）
3. 至少生成 4 道单选题、2 道判断题；题目需基于材料内容，不要编造。
4. 输出必须是合法 JSON，且仅为数组。"""

    user = f"章节 {chapter_number}：{title}\n\n材料：\n{material}"

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
    except Exception as e:
        logger.warning("LLM 调用失败: %s", e)
        return []

    raw = raw.replace("```json", "").replace("```", "").strip()
    m = re.search(r"\[[\s\S]*\]", raw)
    if not m:
        return []
    try:
        questions = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []

    result = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        t = (q.get("type") or "single_choice").strip().lower()
        if t not in ("single_choice", "true_false"):
            t = "single_choice"
        content = (q.get("content") or "").strip()
        if not content:
            continue
        options = q.get("options")
        if not options or not isinstance(options, list):
            if t == "true_false":
                options = [{"key": "true", "value": "正确"}, {"key": "false", "value": "错误"}]
            else:
                continue
        answer = (q.get("answer") or "").strip()
        explanation = (q.get("explanation") or "").strip()
        result.append({
            "type": t,
            "content": content,
            "options": options,
            "answer": answer,
            "explanation": explanation,
        })
    return result


def generate_questions_from_document(
    doc_path: Path,
    chapter_number: int,
    title: str,
) -> List[dict]:
    """从文档生成考核题"""
    material = extract_document_text(doc_path)
    if not material.strip():
        logger.warning(
            "文档无有效文本内容，无法生成考核题。可能原因：PDF 为扫描件/图片、pdfplumber 未安装、或文件损坏。请确认已安装 pdfplumber 且文档为可选中文本的 PDF。"
        )
        return []
    if len(material) > MAX_MATERIAL_CHARS:
        material = material[:MAX_MATERIAL_CHARS] + "\n\n[内容已截断]"
    return _call_llm(material, chapter_number, title)


def generate_readme_from_document(
    doc_path: Path,
    title: str,
    description: str = "",
) -> Optional[str]:
    """从文档提取文本并调用 LLM 生成 README 内容（Markdown）。失败返回 None。"""
    material = extract_document_text(doc_path)
    if not material.strip():
        logger.warning("文档无有效文本内容，跳过 README 生成")
        return None
    if len(material) > MAX_README_MATERIAL_CHARS:
        material = material[:MAX_README_MATERIAL_CHARS] + "\n\n[内容已截断]"

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("openai 未安装，跳过 README 生成")
        return None

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("未设置 OPENAI_API_KEY，跳过 README 生成")
        return None

    client = OpenAI(api_key=api_key)
    base_url = os.environ.get("OPENAI_BASE_URL")
    if base_url:
        client = OpenAI(api_key=api_key, base_url=base_url)

    system = """你是一个学习资料助手。根据用户提供的「章节文档」文本，生成一份简短的 README.md。
要求：
1. 使用 Markdown 格式，直接输出正文，不要用代码块包裹。
2. 包含：标题（与章节标题一致）、简短摘要（2–4 句）、学习要点（3–6 条列表）。
3. 语言与文档一致（中文文档用中文，英文用英文）。
4. 内容基于文档，不要编造。"""

    user = f"章节标题：{title}\n"
    if description:
        user += f"章节描述：{description}\n\n"
    user += f"文档内容：\n{material}"

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
        if not raw:
            return None
        raw = raw.replace("```markdown", "").replace("```md", "").replace("```", "").strip()
        return raw
    except Exception as e:
        logger.warning("LLM 生成 README 失败: %s", e)
        return None


MAX_NOTEBOOK_MATERIAL_CHARS = 14000


def _material_to_cells_fallback(material: str, title: str, description: str) -> List[str]:
    """
    当 LLM 不可用时，从文档正文按段落切分生成 markdown cells。
    确保 notebook 包含完整文档内容，而非仅标题和简介。
    """
    cells = []
    # 第一个 cell：标题 + 简介
    header = f"# {title}\n\n"
    if description.strip():
        header += f"{description.strip()}\n\n---\n\n"
    cells.append(header.strip())

    # 按段落切分正文（双换行或单换行+空行）
    blocks = re.split(r"\n\s*\n", material.strip())
    blocks = [b.strip() for b in blocks if b.strip()]

    # 合并过短段落，控制每个 cell 约 800–1500 字
    CHUNK_SIZE = 1200
    current_chunk = []
    current_len = 0

    for block in blocks:
        block_len = len(block) + 2  # +2 for \n\n
        if current_len + block_len > CHUNK_SIZE and current_chunk:
            cells.append("\n\n".join(current_chunk))
            current_chunk = [block]
            current_len = block_len
        else:
            current_chunk.append(block)
            current_len += block_len

    if current_chunk:
        cells.append("\n\n".join(current_chunk))

    return cells


def generate_notebook_from_document(
    doc_path: Path,
    title: str,
    description: str = "",
) -> Optional[List[str]]:
    """
    从文档提取文本并生成 Jupyter Notebook 的 markdown cells。
    优先调用 LLM 结构化生成；若 LLM 不可用或失败，则按文档正文切分生成，确保包含完整内容。
    """
    material = extract_document_text(doc_path)
    if not material.strip():
        logger.warning("文档无有效文本内容，跳过 Notebook 生成")
        return None
    if len(material) > MAX_NOTEBOOK_MATERIAL_CHARS:
        material = material[:MAX_NOTEBOOK_MATERIAL_CHARS] + "\n\n[内容已截断]"

    # 尝试 LLM 生成
    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("openai 未安装，使用文档正文切分生成 Notebook")
        return _material_to_cells_fallback(material, title, description)

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("未设置 OPENAI_API_KEY，使用文档正文切分生成 Notebook")
        return _material_to_cells_fallback(material, title, description)

    client = OpenAI(api_key=api_key)
    base_url = os.environ.get("OPENAI_BASE_URL")
    if base_url:
        client = OpenAI(api_key=api_key, base_url=base_url)

    system = """你是一个学习资料助手。根据用户提供的「章节文档」文本，生成 Jupyter Notebook 的 markdown cells。
要求：
1. 按文档结构分节，每个小节或段落对应一个 markdown 单元格。
2. 第一个单元格必须包含标题（# 格式）和简短导读。
3. 后续单元格按文档逻辑分段，使用合适的 markdown 格式（标题、列表、代码块等）。
4. 输出纯 JSON 数组，每个元素为单个 markdown 单元格的字符串内容，如：["# 标题\\n\\n导读...", "## 第一节\\n\\n内容...", ...]
5. 不要输出代码块包裹，直接输出 JSON 数组。
6. 语言与文档一致（中文文档用中文，英文用英文）。
7. 必须完整保留文档核心内容，不要缩写或省略。"""

    user = f"章节标题：{title}\n"
    if description:
        user += f"章节描述：{description}\n\n"
    user += f"文档内容：\n{material}"

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
        if not raw:
            return _material_to_cells_fallback(material, title, description)
        raw = raw.replace("```json", "").replace("```", "").strip()
        m = re.search(r"\[[\s\S]*\]", raw)
        if not m:
            return _material_to_cells_fallback(material, title, description)
        cells_data = json.loads(m.group(0))
        if not isinstance(cells_data, list):
            return _material_to_cells_fallback(material, title, description)
        result = []
        for item in cells_data:
            if isinstance(item, str) and item.strip():
                result.append(item.strip())
            elif isinstance(item, (int, float)):
                result.append(str(item))
        if not result:
            return _material_to_cells_fallback(material, title, description)
        return result
    except Exception as e:
        logger.warning("LLM 生成 Notebook 失败，使用文档正文切分: %s", e)
        return _material_to_cells_fallback(material, title, description)


def write_notebook_to_file(cells_content: List[str], output_path: Path) -> bool:
    """将 markdown cells 写入 .ipynb 文件。"""
    try:
        import nbformat as nbf
        nb = nbf.v4.new_notebook()
        for content in cells_content:
            nb.cells.append(nbf.v4.new_markdown_cell(content))
        with open(output_path, "w", encoding="utf-8") as f:
            nbf.write(nb, f)
        return True
    except Exception as e:
        logger.warning("写入 Notebook 文件失败: %s", e)
        return False

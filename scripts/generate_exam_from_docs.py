#!/usr/bin/env python3
"""
从章节 PDF + README 提取文本，调用 LLM 生成章节考核题（单选/判断），
输出到 documents/exam_questions_generated.json，供人工校对后合并到 exam_questions.json。

依赖（脚本独立使用时可安装）:
  pip install pdfplumber openai

环境变量:
  OPENAI_API_KEY  必填；或通过 .env 配置
  OPENAI_BASE_URL 可选，用于国内代理等
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

# 项目根目录（脚本在 scripts/ 下）
ROOT = Path(__file__).resolve().parent.parent
DOCUMENTS = ROOT / "documents"
CONFIG_FILE = DOCUMENTS / "chapters_config.json"
OUTPUT_FILE = DOCUMENTS / "exam_questions_generated.json"
MAX_MATERIAL_CHARS = 14000  # 单章材料截断长度，避免超长上下文


def load_chapters_config() -> list[dict]:
    if not CONFIG_FILE.exists():
        print(f"未找到 {CONFIG_FILE}，请先创建章节配置。", file=sys.stderr)
        return []
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def read_readme(readme_path: str) -> str:
    p = ROOT / readme_path if not Path(readme_path).is_absolute() else Path(readme_path)
    if not p.exists():
        return ""
    with open(p, "r", encoding="utf-8") as f:
        return f.read()


def extract_pdf_text(pdf_path: str) -> str:
    p = ROOT / pdf_path if not Path(pdf_path).is_absolute() else Path(pdf_path)
    if not p.exists():
        return ""
    try:
        import pdfplumber
    except ImportError:
        print("提示: 安装 pdfplumber 后可提取 PDF 文本: pip install pdfplumber", file=sys.stderr)
        return ""
    text_parts = []
    with pdfplumber.open(p) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return "\n\n".join(text_parts)


def extract_docx_text(docx_path: str) -> str:
    """从 DOCX 提取文本"""
    p = ROOT / docx_path if not Path(docx_path).is_absolute() else Path(docx_path)
    if not p.exists():
        return ""
    try:
        from docx import Document
    except ImportError:
        print("提示: 安装 python-docx 后可提取 DOCX 文本: pip install python-docx", file=sys.stderr)
        return ""
    doc = Document(p)
    parts = [para.text for para in doc.paragraphs if para.text.strip()]
    return "\n\n".join(parts)


def build_material(chapter: dict) -> str:
    readme_path = chapter.get("readme_path") or ""
    pdf_path = chapter.get("pdf_path") or ""
    parts = []
    if readme_path:
        parts.append("## README\n" + read_readme(readme_path))
    if pdf_path:
        p = ROOT / pdf_path if not Path(pdf_path).is_absolute() else Path(pdf_path)
        ext = p.suffix.lower()
        if ext == ".docx":
            doc_text = extract_docx_text(pdf_path)
            if doc_text:
                parts.append("## 文档正文\n" + doc_text)
        else:
            pdf_text = extract_pdf_text(pdf_path)
            if pdf_text:
                parts.append("## PDF 正文\n" + pdf_text)
    material = "\n\n".join(parts).strip()
    if len(material) > MAX_MATERIAL_CHARS:
        material = material[:MAX_MATERIAL_CHARS] + "\n\n[内容已截断]"
    return material


def call_llm_generate_questions(chapter_number: int, title: str, material: str) -> list[dict]:
    """调用 LLM 生成题目，返回与 exam_questions.json 中单章格式一致的题目列表。"""
    try:
        from openai import OpenAI
    except ImportError:
        print("请安装 openai: pip install openai", file=sys.stderr)
        return []

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("请设置环境变量 OPENAI_API_KEY 或在 .env 中配置。", file=sys.stderr)
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
        print(f"LLM 调用失败: {e}", file=sys.stderr)
        return []

    # 尝试从回复中抽出 JSON 数组
    raw = raw.replace("```json", "").replace("```", "").strip()
    m = re.search(r"\[[\s\S]*\]", raw)
    if not m:
        print("无法从回复中解析出 JSON 数组。", file=sys.stderr)
        return []
    try:
        questions = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        print(f"JSON 解析失败: {e}", file=sys.stderr)
        return []

    # 规范化每题字段
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


def main():
    parser = argparse.ArgumentParser(description="从 PDF/README 生成章节考核题（LLM）")
    parser.add_argument("--chapter", type=int, default=None, help="仅处理指定章节号；不指定则处理全部")
    parser.add_argument("--output", type=str, default=None, help=f"输出文件路径，默认 {OUTPUT_FILE}")
    parser.add_argument("--dry-run", action="store_true", help="只提取材料不调 LLM")
    args = parser.parse_args()

    chapters = load_chapters_config()
    if not chapters:
        sys.exit(1)

    if args.chapter is not None:
        chapters = [c for c in chapters if c.get("chapter_number") == args.chapter]
        if not chapters:
            print(f"未找到章节 {args.chapter}", file=sys.stderr)
            sys.exit(1)

    output_path = Path(args.output) if args.output else OUTPUT_FILE
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 若已存在生成结果，先读入再按章合并/覆盖
    existing: dict = {}
    if output_path.exists():
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            pass

    for ch in chapters:
        num = ch.get("chapter_number")
        title = ch.get("title", "")
        material = build_material(ch)
        key = f"chapter{num}"
        if args.dry_run:
            print(f"[dry-run] {key} 材料长度: {len(material)} 字符")
            existing[key] = []
            continue
        if not material.strip():
            print(f"跳过 {key}: 无 README/PDF/DOCX 内容", file=sys.stderr)
            continue
        questions = call_llm_generate_questions(num, title, material)
        existing[key] = questions
        print(f"已生成 {key} 共 {len(questions)} 题")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    print(f"已写入 {output_path}，请人工校对后使用 merge_exam_json.py 合并到 exam_questions.json。")


if __name__ == "__main__":
    main()

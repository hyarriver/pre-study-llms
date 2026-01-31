#!/usr/bin/env python3
"""
扫描版 PDF 语义结构恢复 Pipeline 入口。

用法:
  python scripts/run_pdf_pipeline.py INPUT_PDF [OPTIONS]

依赖:
  pip install -r scripts/pdf_semantic_pipeline/requirements.txt
  # 需系统安装 pandoc（用于 docx 输出）
  # 生成 Notebook 题目需 OPENAI_API_KEY

示例:
  python scripts/run_pdf_pipeline.py documents/chapter1/dive-into-llm.pdf
  python scripts/run_pdf_pipeline.py doc.pdf --output-dir ./out --no-notebook
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

# 项目根目录
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from pdf_semantic_pipeline.export import to_markdown
from pdf_semantic_pipeline.notebook_gen import (
    MAX_MATERIAL_CHARS,
    build_exam_notebook,
    call_llm_generate_questions,
    extract_chapters_from_markdown,
)
from pdf_semantic_pipeline.ocr import SuryaOCR
from pdf_semantic_pipeline.postprocess import (
    filter_header_footer_pagenum,
    merge_cross_page_paragraphs,
    ensure_reading_order,
)


def run_ocr(pdf_path: Path, engine: str = "surya"):
    """运行 OCR"""
    if engine == "surya":
        ocr = SuryaOCR()
        return ocr.process(pdf_path)
    if engine == "paddle":
        try:
            from pdf_semantic_pipeline.ocr.paddle_ocr import PaddleOCR as PaddleOCRCls
            return PaddleOCRCls().process(pdf_path)
        except ImportError:
            print("PaddleOCR 未安装，回退到 Surya", file=sys.stderr)
    elif engine == "doctr":
        try:
            from pdf_semantic_pipeline.ocr.doctr_ocr import DocTROCR
            return DocTROCR().process(pdf_path)
        except ImportError:
            print("DocTR 未安装，回退到 Surya", file=sys.stderr)
    return SuryaOCR().process(pdf_path)


def run_pipeline(
    pdf_path: Path,
    output_dir: Path,
    engine: str = "surya",
    gen_docx: bool = True,
    gen_notebook: bool = True,
    questions_per_chapter: int = 4,
) -> dict:
    """执行完整 pipeline"""
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = pdf_path.stem

    # 1. OCR
    print("步骤 1/6: OCR 识别...")
    doc = run_ocr(pdf_path, engine)

    # 2. 后处理
    print("步骤 2/6: 过滤页眉页脚...")
    doc = filter_header_footer_pagenum(doc)
    print("步骤 3/6: 阅读顺序 + 跨页合并...")
    doc = ensure_reading_order(doc)
    doc = merge_cross_page_paragraphs(doc)

    # 3. 保存结构化 JSON
    json_path = output_dir / f"{stem}_structured.json"
    with open(json_path, "w", encoding="utf-8") as f:
        # Pydantic 序列化
        data = {
            "source": doc.source,
            "pages": [
                {
                    "page_num": p.page_num,
                    "blocks": [
                        {
                            "type": b.type.value if hasattr(b.type, "value") else str(b.type),
                            "bbox": b.bbox,
                            "text": b.text,
                            "order": b.order,
                            "page_num": b.page_num,
                        }
                        for b in p.blocks
                    ],
                }
                for p in doc.pages
            ],
        }
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  已保存 {json_path}")

    # 4. 导出 Markdown
    print("步骤 4/6: 导出 Markdown...")
    md_text = to_markdown(doc)
    md_path = output_dir / f"{stem}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_text)
    print(f"  已保存 {md_path}")

    # 5. Pandoc -> DOCX
    docx_path = None
    if gen_docx:
        print("步骤 5/6: 转换为 DOCX...")
        docx_path = output_dir / f"{stem}.docx"
        pandoc = shutil.which("pandoc")
        if pandoc:
            try:
                subprocess.run(
                    [pandoc, str(md_path), "-o", str(docx_path)],
                    check=True,
                    capture_output=True,
                )
                print(f"  已保存 {docx_path}")
            except subprocess.CalledProcessError as e:
                print(f"  Pandoc 失败: {e}", file=sys.stderr)
        else:
            print("  未找到 pandoc，跳过 DOCX 生成。请安装: https://pandoc.org", file=sys.stderr)
    else:
        print("步骤 5/6: 跳过 DOCX（--no-docx）")

    # 6. Notebook
    nb_path = None
    if gen_notebook:
        print("步骤 6/6: 生成考核 Notebook...")
        chapters = extract_chapters_from_markdown(md_text)
        if not chapters:
            chapters = [{"level": 1, "title": "正文", "content": md_text[:MAX_MATERIAL_CHARS]}]
        chapters_with_questions = []
        for i, ch in enumerate(chapters):
            title = ch.get("title", f"第{i+1}章")
            content = ch.get("content", "")
            questions = []
            if content and len(content) > 100:
                questions = call_llm_generate_questions(
                    i + 1, title, content, count=questions_per_chapter
                )
            chapters_with_questions.append({
                "title": title,
                "content": content,
                "questions": questions,
            })
        nb_path = output_dir / f"{stem}_exam.ipynb"
        build_exam_notebook(chapters_with_questions, nb_path)
        print(f"  已保存 {nb_path}")
    else:
        print("步骤 6/6: 跳过 Notebook（--no-notebook）")

    return {
        "json": str(json_path),
        "md": str(md_path),
        "docx": str(docx_path) if docx_path and docx_path.exists() else None,
        "notebook": str(nb_path) if nb_path and nb_path.exists() else None,
    }


def main():
    parser = argparse.ArgumentParser(
        description="扫描版 PDF 语义结构恢复 Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("input_pdf", type=str, help="输入 PDF 路径")
    parser.add_argument("--engine", choices=["surya", "paddle", "doctr"], default="surya")
    parser.add_argument("--output-dir", "-o", type=str, default="./output")
    parser.add_argument("--no-docx", action="store_true", help="不生成 DOCX")
    parser.add_argument("--no-notebook", action="store_true", help="不生成 Notebook")
    parser.add_argument("--questions-per-chapter", type=int, default=4)
    parser.add_argument("--lang", type=str, default="zh")
    args = parser.parse_args()

    pdf_path = Path(args.input_pdf)
    if not pdf_path.is_absolute():
        pdf_path = (ROOT / pdf_path).resolve()
    if not pdf_path.exists():
        print(f"错误: 文件不存在 {pdf_path}", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.output_dir)
    if not out_dir.is_absolute():
        out_dir = (ROOT / out_dir).resolve()

    run_pipeline(
        pdf_path=pdf_path,
        output_dir=out_dir,
        engine=args.engine,
        gen_docx=not args.no_docx,
        gen_notebook=not args.no_notebook,
        questions_per_chapter=args.questions_per_chapter,
    )
    print("完成。")


if __name__ == "__main__":
    main()

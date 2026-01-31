"""
DocTR 适配器（可选）。
需安装: pip install doctr torch
"""
from __future__ import annotations

import logging
from pathlib import Path

from ..schemas import Block, BlockType, Page, StructuredDocument
from .base import OCREngineBase

logger = logging.getLogger(__name__)


class DocTROCR(OCREngineBase):
    """DocTR 引擎实现。DocTR 无显式 layout 标签，按 block 推断。"""

    def process(self, pdf_path: Path) -> StructuredDocument:
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF 不存在: {pdf_path}")

        try:
            from doctr.io import DocumentFile
            from doctr.models import ocr_predictor
        except ImportError as e:
            raise RuntimeError(
                "DocTR 未安装，请执行: pip install doctr torch"
            ) from e

        model = ocr_predictor(pretrained=True)
        doc_file = DocumentFile.from_pdf(str(pdf_path))
        result = model(doc_file)

        doc = StructuredDocument(source=str(pdf_path))
        global_order = 0

        for page_idx, page in enumerate(result.pages):
            blocks = []
            for block in page.blocks:
                lines_text = []
                for line in block.lines:
                    text = " ".join(w.value for w in line.words)
                    if text.strip():
                        lines_text.append(text)
                text = "\n".join(lines_text)
                if not text.strip():
                    continue

                # DocTR 无 block type，按启发式：短文本可能是标题
                block_type = BlockType.PARAGRAPH
                if len(text) < 100 and "\n" not in text.strip():
                    block_type = BlockType.SECTION

                # geometry 转 bbox
                geom = getattr(block, "geometry", None)
                if geom:
                    try:
                        ((x1, y1), (x2, y2)) = geom
                        bbox = [float(x1), float(y1), float(x2), float(y2)]
                    except Exception:
                        bbox = [0, 0, 0, 0]
                else:
                    bbox = [0, 0, 0, 0]

                global_order += 1
                blocks.append(
                    Block(
                        type=block_type,
                        bbox=bbox,
                        text=text,
                        order=global_order,
                        page_num=page_idx + 1,
                    )
                )

            doc.pages.append(
                Page(page_num=page_idx + 1, blocks=blocks)
            )

        return doc

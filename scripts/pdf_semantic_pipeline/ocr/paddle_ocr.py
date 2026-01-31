"""
PaddleOCR PP-Structure 适配器（可选）。
需安装: pip install paddlepaddle paddleocr
"""
from __future__ import annotations

import logging
from pathlib import Path

from ..schemas import Block, BlockType, Page, StructuredDocument
from .base import OCREngineBase

logger = logging.getLogger(__name__)

# PP-Structure 类型映射
PADDLE_TYPE_MAP = {
    "title": BlockType.TITLE,
    "text": BlockType.PARAGRAPH,
    "table": BlockType.TABLE,
    "figure": BlockType.FIGURE,
    "list": BlockType.LIST_ITEM,
}


class PaddleOCR(OCREngineBase):
    """PaddleOCR PP-Structure 引擎实现"""

    def process(self, pdf_path: Path) -> StructuredDocument:
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF 不存在: {pdf_path}")

        try:
            from paddleocr import PPStructure
        except ImportError as e:
            raise RuntimeError(
                "PaddleOCR 未安装，请执行: pip install paddlepaddle paddleocr"
            ) from e

        # PPStructure 支持 PDF 直接输入
        engine = PPStructure(table=False, show_log=False)
        result = engine(str(pdf_path))

        doc = StructuredDocument(source=str(pdf_path))
        global_order = 0

        for page_idx, page_res in enumerate(result):
            blocks = []
            if isinstance(page_res, dict):
                res_list = page_res.get("res", [page_res])
            elif isinstance(page_res, list):
                res_list = page_res
            else:
                res_list = [page_res]

            for i, item in enumerate(res_list):
                if isinstance(item, dict):
                    item_type = item.get("type", "text")
                    bbox = item.get("bbox", [])
                    text = item.get("text", "")
                    if isinstance(text, list):
                        text = "\n".join(str(t) for t in text)
                else:
                    continue

                block_type = PADDLE_TYPE_MAP.get(item_type, BlockType.PARAGRAPH)
                if len(bbox) >= 4:
                    if isinstance(bbox[0], (list, tuple)):
                        xs = [p[0] for p in bbox]
                        ys = [p[1] for p in bbox]
                        bbox = [min(xs), min(ys), max(xs), max(ys)]

                global_order += 1
                blocks.append(
                    Block(
                        type=block_type,
                        bbox=bbox if isinstance(bbox, list) else [0, 0, 0, 0],
                        text=str(text or ""),
                        order=global_order,
                        page_num=page_idx + 1,
                    )
                )

            doc.pages.append(
                Page(page_num=page_idx + 1, blocks=blocks)
            )

        return doc

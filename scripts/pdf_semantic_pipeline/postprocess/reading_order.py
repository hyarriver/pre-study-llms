"""
重建阅读顺序。Surya 已提供 position，此模块主要确保跨页顺序正确。
"""
from __future__ import annotations

from ..schemas import Block, Page, StructuredDocument


def ensure_reading_order(doc: StructuredDocument) -> StructuredDocument:
    """
    确保全局阅读顺序正确。
    - 按 page_num 升序
    - 每页内按 order 升序
    - 重新分配全局 order
    """
    result = StructuredDocument(source=doc.source)
    global_order = 0

    for page in sorted(doc.pages, key=lambda p: p.page_num):
        blocks = sorted(page.blocks, key=lambda b: (b.order, b.bbox[1]))
        for block in blocks:
            global_order += 1
            block.order = global_order
        result.pages.append(
            Page(page_num=page.page_num, blocks=blocks, width=page.width, height=page.height)
        )

    return result

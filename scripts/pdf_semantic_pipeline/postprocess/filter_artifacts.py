"""
删除页眉、页脚、页码。
策略：layout label + bbox 位置（顶部/底部 N%）+ 页码正则。
"""
from __future__ import annotations

import re

from ..schemas import Block, BlockType, Page, StructuredDocument

# 页面顶部/底部 N% 视为页眉/页脚区域（当无明确 label 时）
MARGIN_RATIO = 0.10

# 页码正则：纯数字、罗马数字、短数字（如 - 1 -）
PAGE_NUM_PATTERNS = [
    re.compile(r"^\d{1,5}$"),  # 1, 12, 123
    re.compile(r"^[ivxlcdmIVXLCDM]+$"),  # i, ii, iii, IV
    re.compile(r"^[\-\s]*\d{1,4}[\-\s]*$"),  # - 1 -, 1
]


def _is_page_number(text: str) -> bool:
    """判断文本是否为页码"""
    t = text.strip()
    if len(t) > 15:
        return False
    for pat in PAGE_NUM_PATTERNS:
        if pat.match(t):
            return True
    return False


def _is_in_header_zone(block: Block, page: Page) -> bool:
    """bbox 是否位于页面顶部 N%"""
    if not page.height or page.height <= 0:
        return False
    _, y1, _, _ = block.bbox
    return y1 < page.height * MARGIN_RATIO


def _is_in_footer_zone(block: Block, page: Page) -> bool:
    """bbox 是否位于页面底部 N%"""
    if not page.height or page.height <= 0:
        return False
    _, _, _, y2 = block.bbox
    return y2 > page.height * (1 - MARGIN_RATIO)


def filter_header_footer_pagenum(doc: StructuredDocument) -> StructuredDocument:
    """
    过滤掉页眉、页脚、页码。
    - 明确 type 为 header/footer/page_number 的删除
    - 位于顶部/底部区域的短文本且匹配页码正则的删除
    - 位于顶部/底部区域且 type 为 paragraph 的短行，若像页眉页脚也删除
    """
    result = StructuredDocument(source=doc.source)

    for page in doc.pages:
        kept = []
        for block in page.blocks:
            bt = block.type if isinstance(block.type, str) else getattr(block.type, "value", str(block.type))
            # 明确类型直接删
            if bt in ("header", "footer", "page_number"):
                continue
            # 页码：短文本且匹配正则
            if _is_page_number(block.text) and len(block.text.strip()) < 10:
                continue
            # 位于顶部/底部且像页眉页脚：短文本、单行
            if bt == "paragraph" and len(block.text.strip()) < 50:
                if _is_in_header_zone(block, page) or _is_in_footer_zone(block, page):
                    if "\n" not in block.text.strip() or _is_page_number(block.text):
                        continue
            kept.append(block)

        # 重新编号 order
        for i, b in enumerate(kept):
            b.order = i + 1
        result.pages.append(Page(page_num=page.page_num, blocks=kept, width=page.width, height=page.height))

    return result

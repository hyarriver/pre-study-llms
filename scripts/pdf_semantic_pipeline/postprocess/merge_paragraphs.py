"""
合并跨页段落。
仅在纯 paragraph 且上一段末无句号/下一段首无标题时合并。
"""
from __future__ import annotations

import re

from ..schemas import Block, BlockType, Page, StructuredDocument

# 句号、问号、感叹号等结尾
SENTENCE_END = re.compile(r"[。.!?！？]$")
# 中文/英文句末
ENDS_WITH_PUNCT = re.compile(r".*[。.!?！？:：;；]$")


def _ends_with_sentence_end(text: str) -> bool:
    """段落是否以完整句子结尾"""
    t = text.strip()
    return bool(SENTENCE_END.search(t)) if t else False


def merge_cross_page_paragraphs(doc: StructuredDocument) -> StructuredDocument:
    """
    合并跨页的连续段落。
    条件：相邻两页的末段和首段均为 paragraph，
    且上一段不以句号结尾（可能是被分页打断）。
    """
    result = StructuredDocument(source=doc.source)

    for i, page in enumerate(doc.pages):
        blocks = list(page.blocks)
        # 与上一页末段合并
        if i > 0 and result.pages:
            prev_blocks = result.pages[-1].blocks
            if prev_blocks and blocks:
                last_prev = prev_blocks[-1]
                first_curr = blocks[0]
                lp_t = last_prev.type if isinstance(last_prev.type, str) else getattr(last_prev.type, "value", "")
                fc_t = first_curr.type if isinstance(first_curr.type, str) else getattr(first_curr.type, "value", "")
                if (
                    lp_t == "paragraph"
                    and fc_t == "paragraph"
                    and not _ends_with_sentence_end(last_prev.text)
                ):
                    last_prev.text = last_prev.text.rstrip() + first_curr.text
                    blocks = blocks[1:]

        result.pages.append(
            Page(page_num=page.page_num, blocks=blocks, width=page.width, height=page.height)
        )

    # 重新分配 order
    global_order = 0
    for page in result.pages:
        for block in page.blocks:
            global_order += 1
            block.order = global_order

    return result

"""
将结构化文档导出为规范 Markdown。
- 标题：title -> #，section -> ## 或 ###
- 段落：直接输出，段间空行
- 表格：markdown 表格语法
- 图片：占位
"""
from __future__ import annotations

from ..schemas import Block, BlockType, Page, StructuredDocument


def _escape_md(text: str) -> str:
    """简单转义 Markdown 特殊字符"""
    return text.replace("\\", "\\\\").replace("`", "\\`").replace("*", "\\*").replace("_", "\\_")


def _block_to_md(block: Block, prev_type: BlockType | str | None = None) -> str:
    """单个 block 转 Markdown"""
    text = block.text.strip()
    if not text and block.type != BlockType.TABLE:
        return ""

    t = block.type if isinstance(block.type, str) else block.type.value

    if t == BlockType.TITLE.value:
        return f"# {text}\n\n"
    if t == BlockType.SECTION.value:
        # 简单启发式：较短多为小节标题
        level = "##" if len(text) > 20 else "###"
        return f"{level} {text}\n\n"
    if t == BlockType.PARAGRAPH.value or t == BlockType.LIST_ITEM.value:
        return f"{text}\n\n"
    if t == BlockType.TABLE.value:
        extra = block.extra or {}
        rows = extra.get("rows", [])
        if rows:
            lines = []
            for i, row in enumerate(rows):
                line = "| " + " | ".join(str(c) for c in row) + " |"
                lines.append(line)
                if i == 0:
                    lines.append("| " + " | ".join("---" for _ in row) + " |")
            return "\n".join(lines) + "\n\n"
        return f"```\n{text}\n```\n\n"
    if t in (BlockType.FIGURE.value, BlockType.CAPTION.value):
        return f"![{text or 'image'}]\n\n"
    if t == BlockType.FOOTNOTE.value:
        return f"> {text}\n\n"
    if t == BlockType.FORMULA.value:
        return f"$$\n{text}\n$$\n\n"
    return f"{text}\n\n"


def to_markdown(doc: StructuredDocument) -> str:
    """将 StructuredDocument 转为 Markdown 字符串"""
    parts = []
    prev_type = None

    for page in doc.pages:
        for block in page.blocks:
            md = _block_to_md(block, prev_type)
            if md:
                parts.append(md)
            prev_type = block.type

    return "".join(parts).strip() + "\n"

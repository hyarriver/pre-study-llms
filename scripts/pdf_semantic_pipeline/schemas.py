"""
统一结构化 JSON schema（dataclass，无额外依赖）。
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class BlockType(str, Enum):
    """块类型"""
    TITLE = "title"
    SECTION = "section"
    PARAGRAPH = "paragraph"
    TABLE = "table"
    HEADER = "header"
    FOOTER = "footer"
    PAGE_NUMBER = "page_number"
    LIST_ITEM = "list_item"
    FIGURE = "figure"
    CAPTION = "caption"
    FOOTNOTE = "footnote"
    FORMULA = "formula"


@dataclass
class Block:
    """单个内容块"""
    type: BlockType | str
    bbox: list[float]
    text: str = ""
    order: int = 0
    page_num: int = 1
    extra: Optional[dict[str, Any]] = None


@dataclass
class Page:
    """单页"""
    page_num: int
    blocks: list[Block] = field(default_factory=list)
    width: Optional[float] = None
    height: Optional[float] = None


@dataclass
class StructuredDocument:
    """完整结构化文档"""
    pages: list[Page] = field(default_factory=list)
    source: Optional[str] = None

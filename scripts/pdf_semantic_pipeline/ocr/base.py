"""OCR 引擎抽象接口"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List

from ..schemas import StructuredDocument


class OCREngineBase(ABC):
    """OCR 引擎统一接口"""

    @abstractmethod
    def process(self, pdf_path: Path) -> StructuredDocument:
        """
        处理 PDF，返回统一格式的结构化文档。
        :param pdf_path: PDF 文件路径
        :return: StructuredDocument
        """
        pass

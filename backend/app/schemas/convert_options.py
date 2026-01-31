"""
PDF 转 DOCX 转换选项
"""
from pydantic import BaseModel
from typing import Optional


class ConvertOptions(BaseModel):
    """转换选项"""
    use_ocr: bool = False  # 是否对图像页使用 Tesseract OCR
    use_doctr: bool = False  # 是否使用 DocTR 做版面/表格识别
    language: str = "chi_sim+eng"  # OCR 语言：chi_sim+eng 等
    password: Optional[str] = None  # PDF 密码（加密 PDF）

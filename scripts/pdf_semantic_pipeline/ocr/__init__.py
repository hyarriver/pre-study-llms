"""OCR 引擎适配器"""
from .base import OCREngineBase
from .surya_ocr import SuryaOCR

__all__ = ["OCREngineBase", "SuryaOCR"]

try:
    from .paddle_ocr import PaddleOCR
    __all__.append("PaddleOCR")
except ImportError:
    PaddleOCR = None

try:
    from .doctr_ocr import DocTROCR
    __all__.append("DocTROCR")
except ImportError:
    DocTROCR = None

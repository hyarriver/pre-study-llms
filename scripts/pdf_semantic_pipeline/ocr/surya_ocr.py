"""
Surya OCR 适配器：结合 layout + OCR，输出统一结构化 JSON。
"""
from __future__ import annotations

import io
import logging
from pathlib import Path

from ..schemas import Block, BlockType, Page, StructuredDocument
from .base import OCREngineBase

logger = logging.getLogger(__name__)

# Surya label -> 统一 BlockType 映射
SURYA_LABEL_MAP = {
    "Page-header": BlockType.HEADER,
    "Page-footer": BlockType.FOOTER,
    "Section-header": BlockType.SECTION,
    "Text": BlockType.PARAGRAPH,
    "Text-inline-math": BlockType.PARAGRAPH,
    "Table": BlockType.TABLE,
    "Figure": BlockType.FIGURE,
    "Picture": BlockType.FIGURE,
    "Caption": BlockType.CAPTION,
    "Footnote": BlockType.FOOTNOTE,
    "Formula": BlockType.FORMULA,
    "List-item": BlockType.LIST_ITEM,
    "Table-of-contents": BlockType.PARAGRAPH,
    "Form": BlockType.TABLE,
    "Handwriting": BlockType.PARAGRAPH,
}


def _pdf_to_images(pdf_path: Path, dpi: int = 150) -> list[tuple[int, bytes]]:
    """PDF 转图像，返回 (page_num, image_bytes) 列表"""
    try:
        from pdf2image import convert_from_path
    except ImportError:
        try:
            import fitz  # pymupdf
            doc = fitz.open(str(pdf_path))
            result = []
            for i, page in enumerate(doc):
                pix = page.get_pixmap(dpi=dpi)
                result.append((i + 1, pix.tobytes("png")))
            doc.close()
            return result
        except ImportError:
            raise RuntimeError("需要 pdf2image 或 pymupdf: pip install pdf2image 或 pip install pymupdf")

    images = convert_from_path(str(pdf_path), dpi=dpi)
    result = []
    for i, img in enumerate(images):
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        result.append((i + 1, buf.getvalue()))
    return result


def _bbox_center(bbox: list[float]) -> tuple[float, float]:
    """bbox [x1,y1,x2,y2] 中心点"""
    return (
        (bbox[0] + bbox[2]) / 2,
        (bbox[1] + bbox[3]) / 2,
    )


def _bbox_contains(outer: list[float], inner_center: tuple[float, float], tol: float = 0.1) -> bool:
    """outer bbox 是否包含 inner_center，允许一定容差"""
    x, y = inner_center
    w = outer[2] - outer[0]
    h = outer[3] - outer[1]
    return (
        outer[0] - w * tol <= x <= outer[2] + w * tol
        and outer[1] - h * tol <= y <= outer[3] + h * tol
    )


def _to_dict(obj: object) -> dict:
    """将 Surya 结果对象转为 dict 以便统一处理"""
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    # 对象转 dict（如 dataclass、简单对象）
    if hasattr(obj, "__dict__"):
        return {k: v for k, v in vars(obj).items() if not k.startswith("_")}
    return {}


def _get_text_lines(page_data: dict | object) -> list:
    """从页面数据中提取 text_lines 列表"""
    d = _to_dict(page_data) if not isinstance(page_data, dict) else page_data
    lines = d.get("text_lines") or []
    if not lines and d.get("text_blocks"):
        for tb in d["text_blocks"]:
            lines.extend(_to_dict(tb).get("lines", []))
    return lines


def _merge_text_from_ocr_lines(layout_bbox: list[float], ocr_pages: list, page_idx: int) -> str:
    """根据 layout bbox 从 OCR 结果中提取属于该区域的文本行"""
    texts = []
    if page_idx >= len(ocr_pages):
        return ""

    page_data = ocr_pages[page_idx]
    text_lines = _get_text_lines(page_data)

    for line in text_lines:
        line = _to_dict(line) if not isinstance(line, dict) else line
        bbox = line.get("bbox") or (line.get("polygon") or [[0, 0], [0, 0], [0, 0], [0, 0]])
        if isinstance(bbox, (list, tuple)) and len(bbox) >= 4:
            if isinstance(bbox[0], (list, tuple)):  # polygon 格式
                xs = [p[0] for p in bbox]
                ys = [p[1] for p in bbox]
                cx = sum(xs) / len(xs)
                cy = sum(ys) / len(ys)
                center = (cx, cy)
            else:
                center = _bbox_center(list(bbox))
        else:
            continue

        if _bbox_contains(layout_bbox, center):
            t = line.get("text", "").strip()
            if t:
                texts.append(t)

    return "\n".join(texts)


class SuryaOCR(OCREngineBase):
    """Surya OCR 引擎实现"""

    def __init__(self, lang: str = "zh"):
        self.lang = lang

    def process(self, pdf_path: Path) -> StructuredDocument:
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF 不存在: {pdf_path}")

        try:
            from PIL import Image
            from surya.detection import DetectionPredictor
            from surya.foundation import FoundationPredictor
            from surya.layout import LayoutPredictor
            from surya.recognition import RecognitionPredictor
            from surya.settings import settings
        except ImportError as e:
            raise RuntimeError(
                "Surya 未安装，请执行: pip install surya-ocr torch"
            ) from e

        # PDF -> 图像
        pages_data = _pdf_to_images(pdf_path)
        images = []
        for _, img_bytes in pages_data:
            img = Image.open(__import__("io").BytesIO(img_bytes)).convert("RGB")
            images.append(img)

        if not images:
            return StructuredDocument(pages=[], source=str(pdf_path))

        # 1. Layout 分析
        try:
            layout_foundation = FoundationPredictor(checkpoint=settings.LAYOUT_MODEL_CHECKPOINT)
            layout_predictor = LayoutPredictor(layout_foundation)
            layout_results = layout_predictor(images)
        except Exception as e:
            logger.warning("Layout 预测失败，将仅使用 OCR 结果: %s", e)
            layout_results = [{"bboxes": []} for _ in images]

        # 2. OCR 识别
        det_predictor = DetectionPredictor()
        rec_foundation = FoundationPredictor()
        rec_predictor = RecognitionPredictor(rec_foundation)
        ocr_results = rec_predictor(images, det_predictor=det_predictor)

        # 3. 合并 layout + OCR 为统一结构
        doc = StructuredDocument(source=str(pdf_path))
        global_order = 0

        for page_idx, (page_num, _) in enumerate(pages_data):
            layout_pred = _to_dict(layout_results[page_idx]) if page_idx < len(layout_results) else {}
            ocr_pred_raw = ocr_results[page_idx] if page_idx < len(ocr_results) else None
            ocr_pred = _to_dict(ocr_pred_raw) if ocr_pred_raw is not None else {}

            layout_bboxes = layout_pred.get("bboxes", []) or []
            if not layout_bboxes and ocr_pred:
                layout_bboxes = []
                for line in ocr_pred.get("text_lines", []):
                    b = line.get("bbox")
                    if b and len(b) >= 4:
                        layout_bboxes.append({
                            "bbox": b if isinstance(b[0], (int, float)) else [b[0][0], b[0][1], b[2][0], b[2][1]],
                            "label": "Text",
                            "position": len(layout_bboxes),
                        })

            blocks = []
            sorted_boxes = sorted(
                layout_bboxes,
                key=lambda x: (x.get("position", 999), x.get("bbox", [0, 0, 0, 0])[1]),
            )

            for box in sorted_boxes:
                bbox = box.get("bbox")
                if not bbox or len(bbox) < 4:
                    continue
                if isinstance(bbox[0], (list, tuple)):
                    xs = [p[0] for p in bbox]
                    ys = [p[1] for p in bbox]
                    bbox = [min(xs), min(ys), max(xs), max(ys)]

                label = box.get("label", "Text")
                block_type = SURYA_LABEL_MAP.get(label, BlockType.PARAGRAPH)

                text = _merge_text_from_ocr_lines(bbox, ocr_results, page_idx)
                if not text and label in ("Figure", "Picture"):
                    text = "[图片]"

                global_order += 1
                blocks.append(
                    Block(
                        type=block_type,
                        bbox=list(bbox),
                        text=text,
                        order=global_order,
                        page_num=page_num,
                    )
                )

            doc.pages.append(
                Page(
                    page_num=page_num,
                    blocks=blocks,
                    width=images[page_idx].width if page_idx < len(images) else None,
                    height=images[page_idx].height if page_idx < len(images) else None,
                )
            )

        return doc

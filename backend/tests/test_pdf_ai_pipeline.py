"""
PDF AI 流水线单元测试（mock marker、LLM、pandoc）

运行：python -m unittest discover -s tests -v
需在 backend 目录下且已安装依赖（pip install -r requirements.txt）
"""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

try:
    from app.services.pdf_ai_pipeline import (
    STATUS_DONE,
    STATUS_FAILED,
    STATUS_PENDING,
    STATUS_PROCESSING,
    create_task_id,
    get_task_status,
    run_pipeline,
    set_task_pending,
)
except ImportError:
    run_pipeline = None  # type: ignore


class TestTaskId(unittest.TestCase):
    def test_create_task_id_returns_uuid(self):
        tid = create_task_id()
        self.assertTrue(tid)
        self.assertEqual(len(tid), 36)  # UUID format
        self.assertEqual(tid.count("-"), 4)

    def test_set_and_get_task_pending(self):
        tid = create_task_id()
        set_task_pending(tid)
        info = get_task_status(tid)
        self.assertTrue(info)
        self.assertEqual(info["status"], STATUS_PENDING)
        self.assertIsNone(info["error"])


class TestPipeline(unittest.TestCase):
    def _temp_pdf(self):
        """创建临时 PDF 文件（仅占位，内容无效）"""
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(b"%PDF-1.4 fake content for test\n")
            return Path(f.name)

    @patch("app.services.pdf_ai_pipeline._get_base_dir")
    @patch("app.services.pdf_ai_pipeline._markdown_to_docx")
    @patch("app.services.pdf_ai_pipeline._llm_enhance_markdown")
    @patch("app.services.pdf_ai_pipeline._pdf_to_markdown")
    def test_run_pipeline_full_mock(
        self,
        mock_pdf_to_md,
        mock_llm_enhance,
        mock_md_to_docx,
        mock_get_base_dir,
    ):
        """流水线全程 mock：验证三阶段依次调用"""
        temp_pdf = self._temp_pdf()
        base = Path(tempfile.gettempdir())
        temp_dir = base / "test_temp"
        outputs = base / "test_outputs"
        try:
            uploads = base / "test_uploads"
            uploads.mkdir(parents=True, exist_ok=True)
            temp_dir.mkdir(parents=True, exist_ok=True)
            outputs.mkdir(parents=True, exist_ok=True)

            def _fake_pdf_to_md(pdf_path, output_md):
                output_md = Path(output_md)
                output_md.parent.mkdir(parents=True, exist_ok=True)
                output_md.write_text("# Test\n\nContent", encoding="utf-8")

            def _fake_llm_enhance(raw_path, enhanced_path, **kw):
                Path(enhanced_path).parent.mkdir(parents=True, exist_ok=True)
                Path(enhanced_path).write_text(
                    Path(raw_path).read_text(encoding="utf-8"),
                    encoding="utf-8",
                )

            def _fake_md_to_docx(md_path, output_path, reference_doc=None):
                Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                Path(output_path).touch()

            mock_pdf_to_md.side_effect = _fake_pdf_to_md
            mock_llm_enhance.side_effect = _fake_llm_enhance
            mock_md_to_docx.side_effect = _fake_md_to_docx

            mock_get_base_dir.return_value = base
            with patch("app.services.pdf_ai_pipeline._get_convert_dirs") as mock_dirs:
                mock_dirs.return_value = (uploads, temp_dir, outputs)

                result = run_pipeline(
                    pdf_path=temp_pdf,
                    task_id="test-task",
                    insert_exam_questions=False,
                )

                self.assertEqual(mock_pdf_to_md.call_count, 1)
                self.assertEqual(mock_llm_enhance.call_count, 1)
                self.assertEqual(mock_md_to_docx.call_count, 1)

                self.assertEqual(result, outputs / "test-task.docx")
                info = get_task_status("test-task")
                self.assertEqual(info["status"], STATUS_DONE)
        finally:
            # 清理
            for p in (outputs / "test-task.docx", temp_dir / "test-task" / "raw.md", temp_dir / "test-task" / "enhanced.md"):
                p.unlink(missing_ok=True)
            task_temp = temp_dir / "test-task"
            if task_temp.exists():
                task_temp.rmdir()
            temp_pdf.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()

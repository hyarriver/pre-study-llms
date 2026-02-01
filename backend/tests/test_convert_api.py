"""
Convert API 集成测试（mock pipeline）

运行：python -m unittest discover -s tests -v
需在 backend 目录下且已安装依赖（pip install -r requirements.txt）
"""
import unittest
from io import BytesIO
from unittest.mock import patch

try:
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    client = None

# 简单的 PDF 魔术头（用于测试上传）
FAKE_PDF = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF"


@unittest.skipUnless(HAS_FASTAPI, "需要安装 FastAPI 等依赖")
class TestConvertUpload(unittest.TestCase):
    @patch("app.api.v1.convert._run_pipeline_background")
    def test_upload_pdf_returns_task_id(self, mock_background):
        """POST /convert/upload 返回 task_id 和 status"""
        response = client.post(
            "/api/v1/convert/upload",
            files={"file": ("test.pdf", BytesIO(FAKE_PDF), "application/pdf")},
            data={"insert_exam_questions": "false"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("task_id", data)
        self.assertEqual(data["status"], "pending")

    def test_upload_non_pdf_rejected(self):
        """非 PDF 文件应被拒绝"""
        response = client.post(
            "/api/v1/convert/upload",
            files={"file": ("test.txt", BytesIO(b"hello"), "text/plain")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("PDF", response.json()["detail"])


@unittest.skipUnless(HAS_FASTAPI, "需要安装 FastAPI 等依赖")
class TestConvertStatus(unittest.TestCase):
    def test_status_not_found(self):
        """不存在的 task_id 返回 404"""
        response = client.get("/api/v1/convert/status/non-existent-uuid")
        self.assertEqual(response.status_code, 404)


@unittest.skipUnless(HAS_FASTAPI, "需要安装 FastAPI 等依赖")
class TestConvertDownload(unittest.TestCase):
    def test_download_not_found(self):
        """不存在的 task_id 返回 404"""
        response = client.get("/api/v1/convert/download/non-existent-uuid")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()

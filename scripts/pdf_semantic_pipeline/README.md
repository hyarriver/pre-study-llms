# 扫描版 PDF 语义结构恢复 Pipeline

从扫描版 PDF 恢复文档语义结构，输出结构化 Markdown、DOCX 及可自动评分 Jupyter Notebook。

## 安装

```bash
pip install -r scripts/pdf_semantic_pipeline/requirements.txt
```

- **Pandoc**：需系统安装（用于 DOCX 输出）<https://pandoc.org>
- **生成题目**：需设置环境变量 `OPENAI_API_KEY`

## 用法

```bash
# 基本用法（默认 Surya OCR）
python scripts/run_pdf_pipeline.py INPUT_PDF

# 指定输出目录
python scripts/run_pdf_pipeline.py doc.pdf --output-dir ./output

# 不生成 DOCX
python scripts/run_pdf_pipeline.py doc.pdf --no-docx

# 不生成 Notebook（跳过 LLM 题目生成）
python scripts/run_pdf_pipeline.py doc.pdf --no-notebook

# 切换 OCR 引擎（paddle / doctr，需额外安装）
python scripts/run_pdf_pipeline.py doc.pdf --engine paddle

# 每章题目数量
python scripts/run_pdf_pipeline.py doc.pdf --questions-per-chapter 5
```

## 输出文件

- `{stem}_structured.json`：结构化 JSON（block type、bbox、text）
- `{stem}.md`：规范 Markdown
- `{stem}.docx`：Pandoc 转换的 Word 文档
- `{stem}_exam.ipynb`：可自动评分 Jupyter Notebook

## 模块说明

- **ocr/**：OCR 引擎（Surya / PaddleOCR / DocTR）
- **postprocess/**：过滤页眉页脚、重建阅读顺序、合并跨页段落
- **export/**：导出 Markdown
- **notebook_gen.py**：章节提取、LLM 出题、Notebook 生成

## OCR 引擎

| 引擎 | 安装 | 特点 |
|------|------|------|
| surya | `pip install surya-ocr` | 推荐，布局标签完备，含 Page-header/footer |
| paddle | `pip install paddlepaddle paddleocr` | 中文文档表现好 |
| doctr | `pip install doctr torch` | 项目已有集成 |

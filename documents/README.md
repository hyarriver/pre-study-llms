# 知识文档与章节结构

本目录存放《动手学大模型》各章的知识文档、Notebook、PDF 及考核题数据，供个人学习记录系统使用。

## 目录约定

- **chapter1 ~ chapter11**：每章一个目录，内含：
  - `README.md`：章节导读与要点（Markdown）
  - `*.ipynb`：Jupyter Notebook 实践内容
  - `*.pdf`：讲义或补充材料（可选，由 `chapters_config.json` 中的 `pdf_path` 指定）
  - `assets/` 或 `figs/`：README/Notebook 中引用的图片

- **chapters_config.json**：章节配置表。每条包含：
  - `chapter_number`：章节序号
  - `title`：标题
  - `description`：简介
  - `notebook_path`：Notebook 相对项目根的路径
  - `readme_path`：README 相对项目根的路径
  - `pdf_path`：PDF 相对项目根的路径（可选）

- **exam_questions.json**：章节考核题（单选/判断），启动时由后端导入数据库。格式：`{ "chapter1": [ {...}, ... ], "chapter2": [...] }`。

- **exam_questions_generated.json**：由 `scripts/generate_exam_from_docs.py` 生成的题目，人工校对后可用 `scripts/merge_exam_json.py` 合并进 `exam_questions.json`。

## 添加新 PDF 或新章节

1. **仅更新某章 PDF**：将新 PDF 放入对应章节目录（如 `documents/chapter1/`），在 `chapters_config.json` 中把该章的 `pdf_path` 改为新文件名（或保持原名并替换文件）。重启后端即可。
2. **新增一章**：在 `chapters_config.json` 中追加一条，填写 `chapter_number`、`title`、`description`、`readme_path`、`notebook_path`、`pdf_path`；在 `documents/` 下新建 `chapterN/`，放入 README、Notebook、PDF。重启后端后，init_db 会从配置同步新章节到数据库。

课程内容版权归原教程作者所有。

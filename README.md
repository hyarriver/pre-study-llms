# 动手学大模型 · 个人学习记录系统

<p align="center">
  <strong>个人项目 · 自学大模型 · 记录进度与章节考核</strong>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-v1.0.0-blue" />
  <img alt="React" src="https://img.shields.io/badge/React-18.3-61dafb" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178c6" />
</p>

---

## 项目定位

本项目为**个人学习项目**，基于上海交通大学开源教程《动手学大模型》，搭建了一套**学习记录系统**，用于：

- 系统学习大模型相关章节（Notebook + README + PDF）
- **记录学习进度**：每章完成度、学习时长、章节考核成绩
- **笔记与复习**：支持章节笔记，配合章节考核巩固知识
- **扩展与维护**：支持添加新 PDF、从文档自动生成章节考核题（脚本 + 人工校对）

课程内容版权归原教程作者所有；本仓库侧重**个人使用的 Web 端与学习记录能力**。

---

## 功能概览

| 功能 | 说明 |
|------|------|
| **学习进度** | 按章节记录完成度、学习时长，综合进度 = 学习时长(50%) + 考核成绩(50%) |
| **笔记** | 每章可写多篇笔记，支持编辑与删除 |
| **章节考核** | 每章配套单选/判断题，成绩计入进度；支持从 PDF/README 自动生成题目（见下） |
| **PDF** | 每章可配置 PDF，在章节详情页下载或打开阅读 |
| **Notebook / README** | 在线阅读 Jupyter Notebook 与章节 README |

---

## 课程大纲

本系统当前涵盖 **11 个章节**（来自《动手学大模型》），从入门到进阶：

| 章节 | 主题 | 简介 |
|:---:|:---|:---|
| 01 | 微调与部署 | 预训练模型微调与部署指南，将微调后的模型部署成 Demo |
| 02 | 提示学习与思维链 | 大模型 API 调用与推理，掌握 Prompt Engineering |
| 03 | 知识编辑 | 语言模型的编辑方法，操控模型对特定知识的记忆 |
| 04 | 数学推理 | 让大模型学会数学推理，快速蒸馏迷你 R1 |
| 05 | 模型水印 | 在模型生成内容中嵌入人类不可见的水印 |
| 06 | 越狱攻击 | 了解越狱攻击如何撬开大模型的嘴，学习安全攻防 |
| 07 | 大模型隐写 | "看不见的墨水"，让模型悄悄携带隐藏信息 |
| 08 | 多模态模型 | 多模态理解与生成，探索通向 AGI 的可能 |
| 09 | GUI 智能体 | AI Agent 操作指南，让 AI 替你完成日常任务 |
| 10 | 智能体安全 | 大模型在开放智能体场景中的风险识别 |
| 11 | RLHF 安全对齐 | 基于 PPO 的 RLHF 实验，理解大模型对齐技术 |

---

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/hyarriver/pre-study-llms.git
cd pre-study-llms

# 安装前端依赖
cd web
npm install

# 安装后端依赖（含 Tesseract OCR、Poppler，用于 PDF 转 Word 与扫描件识别）
# Linux/macOS：自动安装系统依赖 + Python 包
./scripts/install_deps.sh
# 或仅安装 Python 包：
# cd backend && pip install -r requirements.txt
# Windows PowerShell：.\scripts\install_deps.ps1

# 启动后端（需在 backend 目录下）
cd backend
uvicorn app.main:app --reload --port 8000

# 启动前端（新终端）
cd ../web
npm run dev
```

访问 http://localhost:5173 即可开始学习并记录进度。

---

## 添加新 PDF 与章节

- **现有章节**：将新 PDF 放入对应目录，例如 `documents/chapter1/`，文件名与 `documents/chapters_config.json` 中该章的 `pdf_path` 一致（或修改 config 中 `pdf_path` 指向新文件名）。重启后端后，章节详情页「PDF」入口即可下载/打开新文件。
- **新增章节**：在 `documents/chapters_config.json` 中增加一条（`chapter_number`, `title`, `description`, `readme_path`, `notebook_path`, `pdf_path`），将 PDF、README、Notebook 放到 `documents/chapterN/` 下，重启后端。首次启动时 init_db 会从该配置同步章节到数据库。

详见 [documents/README.md](documents/README.md)（如已添加）或仓库内 `chapters_config.json` 示例。

---

## 章节考核生成与校对

题目以 `documents/exam_questions.json` 为准，启动时导入数据库。若要**从 PDF/README 自动生成题目**：

1. **生成**：在项目根目录执行  
   `python scripts/generate_exam_from_docs.py --chapter 1`（或指定其他章节、或全部）。  
   脚本会提取该章 PDF + README 文本，调用 LLM 生成单选/判断题，输出到 `documents/exam_questions_generated.json`（或按章文件）。  
   需配置 LLM API Key（如 `OPENAI_API_KEY`）；脚本依赖：`pip install pdfplumber openai`，详见脚本内注释。
2. **校对**：人工检查生成结果，修正答案与解析。
3. **合并**：使用 `python scripts/merge_exam_json.py` 将校对后的结果合并进 `exam_questions.json`（或手动复制）。  
4. **生效**：重新初始化试题或清空试题表后重启，使 `init_db` 再次从 `exam_questions.json` 导入。

生成题目仅供辅助，以人工校对后的结果为准。

若**补生成失败**或出现「本章节暂无考核试题」，可参见 [README.Docker.md](README.Docker.md) 中 **「考核题无法生成（补生成失败）与后端日志」** 和 **「查看详细日志」**（含 Docker 与 PM2 的查看方式及排查顺序）。

---

## 技术栈

- **前端**：React 18、TypeScript、Tailwind CSS、React Query、Three.js（背景）
- **后端**：FastAPI、SQLite

---

## 致谢

本项目的课程内容来源于上海交通大学的开源项目 **《动手学大模型》**，在此特别感谢原作者团队的无私奉献。

- **原项目地址**：[https://github.com/Lordog/dive-into-llms](https://github.com/Lordog/dive-into-llms)  
- 原项目由上海交通大学张倬胜老师团队开发，基于《自然语言处理前沿技术》、《人工智能安全技术》课程讲义拓展而来，是一套优秀的大模型入门编程实践教程。

---

## 许可证

本项目仅用于个人学习与交流，课程内容版权归原作者所有。

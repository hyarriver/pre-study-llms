<p align="center">
  <h1 align="center">动手学大模型 - 可视化学习平台</h1>
</p>

<p align="center">
  <strong>让大模型学习更直观、更高效</strong>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-v1.0.0-blue" />
  <img alt="React" src="https://img.shields.io/badge/React-18.3-61dafb" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-3D-black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178c6" />
</p>

---

## 🎯 项目初心

在学习大模型的过程中，我们发现现有的教程虽然内容丰富，但学习体验还有提升空间：

- **阅读体验**：传统的 Markdown 文档和 Jupyter Notebook 在浏览器中的展示效果有限
- **学习追踪**：难以记录和追踪自己的学习进度
- **交互性**：缺乏沉浸式的学习体验

因此，我们基于上海交通大学的优秀开源教程《动手学大模型》，开发了这个**可视化学习平台**：

- 🌟 **炫酷的 3D 界面**：使用 Three.js 打造神经网络动态背景，营造科技感十足的学习氛围
- 📖 **优化的阅读体验**：Notebook 内容以更友好的方式呈现，代码高亮、图片优化
- 📊 **学习进度追踪**：记录每个章节的学习状态，清晰了解学习进展
- 📝 **笔记功能**：支持在学习过程中记录笔记，方便复习回顾

## 📚 课程大纲

本平台涵盖 **11 个精心设计的章节**，从入门到进阶，系统掌握大模型核心技术：

| 章节 | 主题 | 简介 |
|:---:|:---|:---|
| 01 | **微调与部署** | 预训练模型微调与部署指南，将微调后的模型部署成 Demo |
| 02 | **提示学习与思维链** | 大模型 API 调用与推理，掌握 Prompt Engineering |
| 03 | **知识编辑** | 语言模型的编辑方法，操控模型对特定知识的记忆 |
| 04 | **数学推理** | 让大模型学会数学推理，快速蒸馏迷你 R1 |
| 05 | **模型水印** | 在模型生成内容中嵌入人类不可见的水印 |
| 06 | **越狱攻击** | 了解越狱攻击如何撬开大模型的嘴，学习安全攻防 |
| 07 | **大模型隐写** | "看不见的墨水"，让模型悄悄携带隐藏信息 |
| 08 | **多模态模型** | 多模态理解与生成，探索通向 AGI 的可能 |
| 09 | **GUI 智能体** | AI Agent 操作指南，让 AI 替你完成日常任务 |
| 10 | **智能体安全** | 大模型在开放智能体场景中的风险识别 |
| 11 | **RLHF 安全对齐** | 基于 PPO 的 RLHF 实验，理解大模型对齐技术 |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/your-repo/dive-into-llms-visual.git
cd dive-into-llms-visual

# 安装前端依赖
cd web
npm install

# 安装后端依赖
cd ../backend
pip install -r requirements.txt

# 启动后端
uvicorn app.main:app --reload --port 8000

# 启动前端（新终端）
cd ../web
npm run dev
```

访问 http://localhost:5173 即可开始学习！

## 🛠️ 技术栈

**前端**
- React 18 + TypeScript
- Three.js（3D 神经网络背景）
- Tailwind CSS（样式）
- React Query（数据管理）

**后端**
- FastAPI
- SQLite

## 🙏 致谢

本项目的课程内容来源于上海交通大学的开源项目 **《动手学大模型》**，在此特别感谢原作者团队的无私奉献！

> 📌 **原项目地址**：[https://github.com/Lordog/dive-into-llms](https://github.com/Lordog/dive-into-llms)
>
> 原项目由上海交通大学张倬胜老师团队开发，基于《自然语言处理前沿技术》、《人工智能安全技术》课程讲义拓展而来，是一套优秀的大模型入门编程实践教程。

感谢原作者团队的辛勤付出，让更多人能够接触和学习大模型技术！

## 📄 许可证

本项目仅用于学习交流，课程内容版权归原作者所有。

---

<p align="center">
  <strong>让我们一起，动手学大模型！</strong>
</p>

# 《动手学大模型》学习网站

## 🎯 项目概述

这是一个基于 **React + FastAPI + SQLite** 的个人学习平台，用于学习和跟踪《动手学大模型》系列教程的进度。

## ✨ 主要功能

- 📚 **章节管理**: 浏览所有 11 个章节，查看详细信息和描述
- 📖 **内容展示**: 在线查看 Jupyter Notebook 和 README 文档
- 📊 **进度跟踪**: 记录和可视化学习进度
- 📝 **笔记功能**: 为每个章节创建和管理笔记（API 已实现）
- 🎨 **现代 UI**: 使用 shadcn/ui 组件库，界面美观易用

## 🚀 快速开始

### 一键启动（推荐）

**Windows 用户：**

双击运行 `启动网站.bat` 或在 PowerShell 中运行：

```powershell
.\启动网站.ps1
```

脚本会自动：
1. ✅ 创建后端虚拟环境并安装依赖
2. ✅ 安装前端依赖
3. ✅ 启动后端服务器（http://localhost:8000）
4. ✅ 启动前端开发服务器（http://localhost:3000）

### 手动启动

#### 后端启动

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```

#### 前端启动

```bash
cd web
npm install
npm run dev
```

## 📁 项目结构

```
pre-study-llms/
├── backend/              # Python 后端
│   ├── app/
│   │   ├── routers/     # API 路由
│   │   └── database.py # 数据库模型
│   ├── main.py          # FastAPI 应用
│   └── requirements.txt
├── web/                 # React 前端
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── pages/       # 页面组件
│   │   └── lib/         # 工具函数和 API
│   └── package.json
├── documents/           # 教程文档（原有）
├── 启动网站.bat         # Windows 启动脚本
└── 网站使用指南.md      # 详细使用说明
```

## 🛠️ 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **shadcn/ui** - UI 组件库
- **Tailwind CSS** - 样式框架
- **React Router** - 路由管理
- **Axios** - HTTP 客户端

### 后端
- **FastAPI** - Web 框架
- **SQLAlchemy** - ORM
- **SQLite** - 数据库
- **Pydantic** - 数据验证
- **nbformat** - Notebook 解析

## 📖 使用说明

1. **启动网站**: 运行启动脚本或手动启动前后端
2. **访问首页**: 打开浏览器访问 http://localhost:3000
3. **浏览章节**: 点击"教程列表"查看所有章节
4. **开始学习**: 点击章节卡片进入详情页
5. **跟踪进度**: 在详情页更新学习进度

## 🔧 开发说明

详细开发文档请查看 [网站使用指南.md](./网站使用指南.md)

## 📝 注意事项

- 确保已安装 **Python 3.8+** 和 **Node.js 16+**
- 首次启动会自动创建数据库并初始化章节数据
- 数据库文件位置：`backend/learning_platform.db`
- 如果端口被占用，可以修改配置文件中的端口号

## 🎨 界面预览

- **首页**: 项目介绍和功能概览
- **章节列表**: 所有章节卡片，显示进度和完成状态
- **章节详情**: Notebook 内容、README、进度管理

## 🔮 未来扩展

- [ ] 用户认证系统
- [ ] 笔记编辑界面
- [ ] 代码在线执行
- [ ] 搜索功能
- [ ] 导出学习报告
- [ ] 暗色模式

## 📄 许可证

本项目基于原《动手学大模型》教程项目，遵循相同的开源协议。

## 🙏 致谢

感谢《动手学大模型》教程团队提供优秀的教学内容！

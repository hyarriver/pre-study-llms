"""
数据库配置和模型定义
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# SQLite 数据库路径
DATABASE_URL = "sqlite:///./learning_platform.db"

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类
Base = declarative_base()


class Chapter(Base):
    """章节模型"""
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    chapter_number = Column(Integer, unique=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    notebook_path = Column(String)
    readme_path = Column(String)
    pdf_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    progress = relationship("Progress", back_populates="chapter", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="chapter", cascade="all, delete-orphan")


class Progress(Base):
    """学习进度模型"""
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    user_id = Column(String, default="default_user")  # 简化版本，使用默认用户
    completion_percentage = Column(Float, default=0.0)
    last_accessed = Column(DateTime, default=datetime.utcnow)
    completed = Column(Integer, default=0)  # 0: 未完成, 1: 已完成
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    chapter = relationship("Chapter", back_populates="progress")


class Note(Base):
    """笔记模型"""
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    user_id = Column(String, default="default_user")
    title = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    chapter = relationship("Chapter", back_populates="notes")


def init_db():
    """初始化数据库，创建所有表"""
    Base.metadata.create_all(bind=engine)
    
    # 初始化章节数据
    db = SessionLocal()
    try:
        # 检查是否已有章节数据
        if db.query(Chapter).count() == 0:
            chapters_data = [
                {
                    "chapter_number": 1,
                    "title": "微调与部署",
                    "description": "预训练模型微调与部署指南：想提升预训练模型在指定任务上的性能？让我们选择合适的预训练模型，在特定任务上进行微调，并将微调后的模型部署成方便使用的Demo！",
                    "notebook_path": "documents/chapter1/dive-tuning.ipynb",
                    "readme_path": "documents/chapter1/README.md",
                    "pdf_path": "documents/chapter1/dive-into-llm.pdf"
                },
                {
                    "chapter_number": 2,
                    "title": "提示学习与思维链",
                    "description": "大模型的API调用与推理指南：\"AI在线求鼓励？大模型对一些问题的回答令人大跌眼镜，但它可能只是想要一句「鼓励」\"",
                    "notebook_path": "documents/chapter2/dive-prompting.ipynb",
                    "readme_path": "documents/chapter2/README.md",
                    "pdf_path": "documents/chapter2/dive-into-prompting.pdf"
                },
                {
                    "chapter_number": 3,
                    "title": "知识编辑",
                    "description": "语言模型的编辑方法和工具：想操控语言模型在对指定知识的记忆？让我们选择合适的编辑方法，对特定知识进行编辑，并将对编辑后的模型进行验证！",
                    "notebook_path": "documents/chapter3/dive_edit.ipynb",
                    "readme_path": "documents/chapter3/README.md",
                    "pdf_path": "documents/chapter3/dive_edit_0410.pdf"
                },
                {
                    "chapter_number": 4,
                    "title": "数学推理",
                    "description": "如何让大模型学会数学推理？让我们快速蒸馏一个迷你R1！",
                    "notebook_path": "documents/chapter4/sft_math.ipynb",
                    "readme_path": "documents/chapter4/README.md",
                    "pdf_path": "documents/chapter4/math.pdf"
                },
                {
                    "chapter_number": 5,
                    "title": "模型水印",
                    "description": "语言模型的文本水印：在语言模型生成的内容中嵌入人类不可见的水印",
                    "notebook_path": "documents/chapter5/watermark.ipynb",
                    "readme_path": "documents/chapter5/README.md",
                    "pdf_path": "documents/chapter5/watermark.pdf"
                },
                {
                    "chapter_number": 6,
                    "title": "越狱攻击",
                    "description": "想要得到更好的安全，要先从学会攻击开始。让我们了解越狱攻击如何撬开大模型的嘴！",
                    "notebook_path": "documents/chapter6/dive-jailbreak.ipynb",
                    "readme_path": "documents/chapter6/README.md",
                    "pdf_path": "documents/chapter6/dive-Jailbreak.pdf"
                },
                {
                    "chapter_number": 7,
                    "title": "大模型隐写",
                    "description": "\"看不见的墨水\"！想让大模型在流畅回答的同时，悄悄携带只有\"自己人\"能识别的信息吗？大模型隐写告诉你！",
                    "notebook_path": "documents/chapter7/llm_stega.ipynb",
                    "readme_path": "documents/chapter7/README.md",
                    "pdf_path": "documents/chapter7/stega.pdf"
                },
                {
                    "chapter_number": 8,
                    "title": "多模态模型",
                    "description": "作为能够更充分模拟真实世界的多模态大语言模型，其如何实现更强大的多模态理解和生成能力？多模态大语言模型是否能够帮助实现AGI？",
                    "notebook_path": "documents/chapter8/mllms.ipynb",
                    "readme_path": "documents/chapter8/README.md",
                    "pdf_path": "documents/chapter8/mllms.pdf"
                },
                {
                    "chapter_number": 9,
                    "title": "GUI智能体",
                    "description": "想要饭来张口、解放双手？那么让我们一起来让AI Agent替你点外卖、回消息、购物比价吧！",
                    "notebook_path": "documents/chapter9/GUIagent.ipynb",
                    "readme_path": "documents/chapter9/README.md",
                    "pdf_path": "documents/chapter9/GUIagent.pdf"
                },
                {
                    "chapter_number": 10,
                    "title": "智能体安全",
                    "description": "大模型智能体迈向了未来操作系统之旅。然而，大模型在开放智能体场景中能意识到风险威胁吗？",
                    "notebook_path": "documents/chapter10/agent.ipynb",
                    "readme_path": "documents/chapter10/README.md",
                    "pdf_path": "documents/chapter10/dive-into-safety.pdf"
                },
                {
                    "chapter_number": 11,
                    "title": "RLHF安全对齐",
                    "description": "基于PPO的RLHF实验指南：本教程\"十分危险\"，阅读后请检查你的大模型是否在冷笑。",
                    "notebook_path": "documents/chapter11/RLHF.ipynb",
                    "readme_path": "documents/chapter11/README.md",
                    "pdf_path": "documents/chapter11/RLHF.pdf"
                }
            ]
            
            for chapter_data in chapters_data:
                chapter = Chapter(**chapter_data)
                db.add(chapter)
            
            db.commit()
            print("章节数据初始化完成")
    except Exception as e:
        print(f"初始化数据库时出错: {e}")
        db.rollback()
    finally:
        db.close()


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

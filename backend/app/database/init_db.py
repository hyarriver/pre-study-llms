"""
数据库初始化
"""
import json
from pathlib import Path
from sqlalchemy import text
from app.database.base import Base
from app.database.session import engine
from app.models import Chapter, Progress, Note, User, Question, ExamRecord
from app.database.session import SessionLocal
from datetime import datetime


def _add_column_if_not_exists(column_name: str, type_: str):
    """对已有 SQLite 表安全添加列（列已存在则忽略）"""
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {type_}"))
            conn.commit()
    except Exception:
        pass  # 如 duplicate column name 等，忽略


def init_db():
    """初始化数据库，创建所有表"""
    Base.metadata.create_all(bind=engine)

    # 兼容已有库：为 users 表添加 nickname、avatar_url（若不存在）
    _add_column_if_not_exists("nickname", "VARCHAR(100)")
    _add_column_if_not_exists("avatar_url", "VARCHAR(500)")

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
        
        # 初始化试题数据
        if db.query(Question).count() == 0:
            init_exam_questions(db)
            
    except Exception as e:
        print(f"初始化数据库时出错: {e}")
        db.rollback()
    finally:
        db.close()


def init_exam_questions(db):
    """初始化考试试题数据"""
    # 试题JSON路径：兼容 Docker（/app/documents）与本地（项目根/documents）
    base = Path(__file__).resolve().parent.parent.parent  # backend 或 /app
    docs = (base / "documents") if (base / "documents").exists() else (base.parent / "documents")
    questions_file = docs / "exam_questions.json"
    if not questions_file.exists():
        print(f"试题文件不存在: {questions_file}")
        return
    
    try:
        with open(questions_file, 'r', encoding='utf-8') as f:
            questions_data = json.load(f)
        
        # 获取章节映射
        chapters = db.query(Chapter).all()
        chapter_map = {f"chapter{c.chapter_number}": c.id for c in chapters}
        
        total_questions = 0
        for chapter_key, questions in questions_data.items():
            chapter_id = chapter_map.get(chapter_key)
            if not chapter_id:
                print(f"未找到章节: {chapter_key}")
                continue
            
            for idx, q in enumerate(questions):
                question = Question(
                    chapter_id=chapter_id,
                    question_type=q["type"],
                    content=q["content"],
                    options=q.get("options"),
                    answer=q["answer"],
                    explanation=q.get("explanation"),
                    score=10,  # 默认10分
                    order_index=idx + 1,
                )
                db.add(question)
                total_questions += 1
        
        db.commit()
        print(f"试题数据初始化完成，共导入 {total_questions} 道试题")
        
    except Exception as e:
        print(f"初始化试题数据时出错: {e}")
        db.rollback()

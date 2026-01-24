"""
Notebook 相关路由
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import nbformat
import json
from typing import Dict, Any

router = APIRouter()

# 项目根目录
BASE_DIR = Path(__file__).parent.parent.parent


@router.get("/{chapter_id}/content")
async def get_notebook_content(chapter_id: int):
    """获取 Notebook 内容（解析为 JSON）"""
    from app.database import SessionLocal, Chapter
    
    db = SessionLocal()
    try:
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=404, detail="章节不存在")
        
        notebook_path = BASE_DIR / chapter.notebook_path
        if not notebook_path.exists():
            raise HTTPException(status_code=404, detail="Notebook 文件不存在")
        
        # 读取并解析 notebook
        with open(notebook_path, 'r', encoding='utf-8') as f:
            notebook = nbformat.read(f, as_version=4)
        
        # 转换为字典
        notebook_dict = {
            "cells": [
                {
                    "cell_type": cell.cell_type,
                    "source": cell.source if isinstance(cell.source, str) else ''.join(cell.source),
                    "metadata": cell.metadata,
                    "outputs": [dict(output) for output in getattr(cell, 'outputs', [])] if cell.cell_type == 'code' else []
                }
                for cell in notebook.cells
            ],
            "metadata": notebook.metadata,
            "nbformat": notebook.nbformat,
            "nbformat_minor": notebook.nbformat_minor
        }
        
        return notebook_dict
    finally:
        db.close()


@router.get("/{chapter_id}/readme")
async def get_readme(chapter_id: int):
    """获取 README 内容"""
    from app.database import SessionLocal, Chapter
    
    db = SessionLocal()
    try:
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=404, detail="章节不存在")
        
        readme_path = BASE_DIR / chapter.readme_path
        if not readme_path.exists():
            raise HTTPException(status_code=404, detail="README 文件不存在")
        
        with open(readme_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {"content": content}
    finally:
        db.close()


@router.get("/{chapter_id}/pdf")
async def get_pdf(chapter_id: int):
    """获取 PDF 文件"""
    from app.database import SessionLocal, Chapter
    
    db = SessionLocal()
    try:
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=404, detail="章节不存在")
        
        pdf_path = BASE_DIR / chapter.pdf_path
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF 文件不存在")
        
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=pdf_path.name
        )
    finally:
        db.close()

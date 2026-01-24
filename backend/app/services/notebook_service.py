"""
Notebook服务层
"""
from pathlib import Path
from typing import Dict, Any
import nbformat
from app.core.config import settings


class NotebookService:
    """Notebook服务"""
    
    def __init__(self):
        # 项目根目录
        if settings.BASE_DIR:
            self.base_dir = Path(settings.BASE_DIR)
        else:
            # 默认从当前文件位置推断
            self.base_dir = Path(__file__).parent.parent.parent.parent
    
    def get_notebook_content(self, notebook_path: str) -> Dict[str, Any]:
        """获取Notebook内容"""
        notebook_file = self.base_dir / notebook_path
        if not notebook_file.exists():
            raise FileNotFoundError(f"Notebook文件不存在: {notebook_path}")
        
        # 读取并解析 notebook
        with open(notebook_file, 'r', encoding='utf-8') as f:
            notebook = nbformat.read(f, as_version=4)
        
        # 转换为字典，保留输出数据
        notebook_dict = {
            "cells": [
                {
                    "cell_type": cell.cell_type,
                    "source": cell.source if isinstance(cell.source, str) else ''.join(cell.source),
                    "metadata": cell.metadata,
                    "outputs": [
                        {
                            "output_type": output.get('output_type', ''),
                            "data": output.get('data', {}),
                            "text": output.get('text', ''),
                            "execution_count": output.get('execution_count'),
                        }
                        for output in getattr(cell, 'outputs', [])
                    ] if cell.cell_type == 'code' and hasattr(cell, 'outputs') else []
                }
                for cell in notebook.cells
            ],
            "metadata": notebook.metadata,
            "nbformat": notebook.nbformat,
            "nbformat_minor": notebook.nbformat_minor
        }
        
        return notebook_dict
    
    def get_readme_content(self, readme_path: str) -> str:
        """获取README内容"""
        readme_file = self.base_dir / readme_path
        if not readme_file.exists():
            raise FileNotFoundError(f"README文件不存在: {readme_path}")
        
        with open(readme_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return content
    
    def get_pdf_path(self, pdf_path: str) -> Path:
        """获取PDF文件路径"""
        pdf_file = self.base_dir / pdf_path
        if not pdf_file.exists():
            raise FileNotFoundError(f"PDF文件不存在: {pdf_path}")
        
        return pdf_file

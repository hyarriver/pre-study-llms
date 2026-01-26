"""
Notebook服务层
"""
from pathlib import Path
from typing import Dict, Any
import nbformat
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class NotebookService:
    """Notebook服务"""
    
    def __init__(self):
        # 项目根目录
        if settings.BASE_DIR:
            self.base_dir = Path(settings.BASE_DIR)
        else:
            # 从 backend 目录位置推断
            # __file__ = /app/app/services/notebook_service.py 或 backend/app/services/notebook_service.py
            backend_dir = Path(__file__).parent.parent.parent  # /app 或 backend 目录
            
            # 检查 documents 目录位置
            # Docker 环境：documents 挂载到 /app/documents
            if (backend_dir / "documents").exists():
                self.base_dir = backend_dir
            # 本地开发：documents 在项目根目录（backend 的父目录）
            elif (backend_dir.parent / "documents").exists():
                self.base_dir = backend_dir.parent
            else:
                # 默认使用 backend 目录（Docker 环境）
                self.base_dir = backend_dir
        
        logger.info(f"NotebookService base_dir: {self.base_dir}")
        
    def get_notebook_content(self, notebook_path: str) -> Dict[str, Any]:
        """获取Notebook内容"""
        notebook_file = self.base_dir / notebook_path
        if not notebook_file.exists():
            logger.error(f"Notebook文件不存在: {notebook_file} (base_dir: {self.base_dir}, path: {notebook_path})")
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
            logger.error(f"README文件不存在: {readme_file} (base_dir: {self.base_dir}, path: {readme_path})")
            raise FileNotFoundError(f"README文件不存在: {readme_path}")
        
        try:
            with open(readme_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if not content:
                logger.warning(f"README文件内容为空: {readme_file}")
            
            logger.debug(f"成功读取README: {readme_file}, 内容长度: {len(content)}")
            return content
        except Exception as e:
            logger.error(f"读取README文件失败: {readme_file}, 错误: {e}")
            raise
    
    def get_pdf_path(self, pdf_path: str) -> Path:
        """获取PDF文件路径"""
        pdf_file = self.base_dir / pdf_path
        if not pdf_file.exists():
            raise FileNotFoundError(f"PDF文件不存在: {pdf_path}")
        
        return pdf_file

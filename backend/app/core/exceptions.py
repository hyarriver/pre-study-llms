"""
自定义异常类
"""
from fastapi import HTTPException, status


class ChapterNotFoundError(HTTPException):
    """章节不存在异常"""
    def __init__(self, chapter_id: int = None):
        detail = "章节不存在"
        if chapter_id:
            detail = f"章节 {chapter_id} 不存在"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class NoteNotFoundError(HTTPException):
    """笔记不存在异常"""
    def __init__(self, note_id: int = None):
        detail = "笔记不存在"
        if note_id:
            detail = f"笔记 {note_id} 不存在"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class ProgressNotFoundError(HTTPException):
    """进度不存在异常"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="学习进度不存在"
        )

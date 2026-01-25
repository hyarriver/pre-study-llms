"""
API v1 路由
"""
from fastapi import APIRouter
from app.api.v1 import auth, chapters, progress, notes, notebook, exam, webhook

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chapters.router, prefix="/chapters", tags=["chapters"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(notebook.router, prefix="/notebook", tags=["notebook"])
api_router.include_router(exam.router, prefix="/exam", tags=["exam"])
api_router.include_router(webhook.router, tags=["webhook"])
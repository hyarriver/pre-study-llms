"""
静态文件服务 - 提供 /api/v1/static 下的图片等资源
当网关只代理 /api 时，/api/v1/static/* 也能抵达后端，无需单独配置 /static
"""
import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

# 与 main.py 相同的 documents 解析逻辑
_def = Path(__file__).resolve().parent.parent.parent.parent
_docs = _def / "documents" if (_def / "documents").exists() else _def.parent / "documents"

# 图片等静态资源缓存 1 天，减轻重复请求与滚动时的抖动
_STATIC_HEADERS = {"Cache-Control": "public, max-age=86400"}


@router.get("/{path:path}")
async def serve_static(path: str):
    if not _docs.exists():
        raise HTTPException(status_code=404, detail="documents 未挂载")
    # 防止路径穿越
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="invalid path")
    file_path = _docs / path
    try:
        file_path.resolve().relative_to(_docs.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid path")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="文件不存在")
    media_type, _ = mimetypes.guess_type(str(file_path))
    return FileResponse(file_path, media_type=media_type, headers=_STATIC_HEADERS)

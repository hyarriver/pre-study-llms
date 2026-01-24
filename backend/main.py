"""
《动手学大模型》学习平台后端 API
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.database.init_db import init_db
from app.api import api_router
from contextlib import asynccontextmanager

# 应用生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    init_db()
    yield
    # 关闭时执行（如果需要）

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    description="《动手学大模型》系列教程学习平台后端",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件（用于提供图片等资源）
documents_path = Path(__file__).parent.parent / "documents"
if documents_path.exists():
    app.mount("/static", StaticFiles(directory=str(documents_path), html=True), name="static")
    print(f"静态文件服务已挂载: {documents_path} -> /static")

# 注册API路由
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}

@app.get("/api/test-image")
async def test_image():
    """测试图片路径"""
    test_image_path = documents_path / "chapter1" / "assets" / "0.png"
    return {
        "image_exists": test_image_path.exists(),
        "image_path": str(test_image_path),
        "static_url": "/static/chapter1/assets/0.png",
        "documents_path": str(documents_path)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
应用配置管理
"""
from pydantic_settings import BaseSettings
from typing import Optional, Union
from pydantic import field_validator


class Settings(BaseSettings):
    """应用配置"""
    # 应用基础配置
    APP_NAME: str = "动手学大模型 API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./learning_platform.db"
    
    # JWT配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS配置（支持逗号分隔的字符串或列表）
    CORS_ORIGINS: Union[str, list] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    # 项目根目录
    BASE_DIR: Optional[str] = None

    # 微信网页授权（公众号 / 接口测试号）
    # 须在公众平台配置网页授权域名，且 WEB_APP_BASE_URL 的域名须在其内
    WECHAT_APP_ID: str = ""
    WECHAT_APP_SECRET: str = ""
    WEB_APP_BASE_URL: str = "http://localhost:3000"  # 前端页面根，用于拼 redirect_uri；生产须 https
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """将逗号分隔的字符串转换为列表"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

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

    # 上传配置
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_UPLOAD_EXTENSIONS: list = [".pdf", ".docx"]
    # 上传目录：data/uploads 可写（Docker 中 data 挂载可写），documents 可能只读
    UPLOADS_SUBDIR: str = "data/uploads"

    # PDF AI 流水线（marker → LLM → pandoc）
    CONVERT_UPLOADS_DIR: str = "data/convert/uploads"
    CONVERT_TEMP_DIR: str = "data/convert/temp"
    CONVERT_OUTPUTS_DIR: str = "data/convert/outputs"
    LLM_TIMEOUT_SECONDS: int = 120
    LLM_MAX_RETRIES: int = 2
    
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

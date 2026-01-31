"""
认证相关 Pydantic 模型
"""
import re
from pydantic import BaseModel, field_validator


class NicknameLoginOrRegister(BaseModel):
    """昵称一体化登录/注册：昵称作为唯一登录标识，注册时校验重复"""

    nickname: str
    password: str

    @field_validator("nickname")
    @classmethod
    def nickname_format(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 20:
            raise ValueError("昵称长度为 2～20 个字符")
        # 允许中文、字母、数字、下划线、短横线
        if not re.match(r"^[\u4e00-\u9fa5a-zA-Z0-9_\-]+$", v):
            raise ValueError("昵称仅支持中文、字母、数字、下划线和短横线")
        return v

    @field_validator("password")
    @classmethod
    def password_format(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("密码至少 6 位")
        return v


class Token(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: str
    nickname: str | None = None
    avatar_url: str | None = None
    role: str = "user"

    class Config:
        from_attributes = True

"""
认证相关 Pydantic 模型
"""
import re
from pydantic import BaseModel, field_validator


class UserRegister(BaseModel):
    """注册请求（用户名/邮箱注册，保留以兼容旧逻辑）"""
    username: str
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("邮箱格式无效")
        return v.lower().strip()


class UserLogin(BaseModel):
    """用户名登录请求"""
    username: str
    password: str


class PhoneLoginOrRegister(BaseModel):
    """手机号一体化登录/注册"""
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str) -> str:
        v = v.strip()
        # 简单手机号校验（11 位数字）
        if not re.match(r"^\d{11}$", v):
            raise ValueError("手机号格式无效")
        return v


class WeChatMockLogin(BaseModel):
    """微信模拟登录请求（使用本地 mock openid）"""
    openid: str


class Token(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True

"""
认证与安全工具
"""
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def _prepare_password(pwd: str) -> bytes:
    """bcrypt 限 72 字节，超出则截断"""
    b = pwd.encode("utf-8")
    return b[:72] if len(b) > 72 else b


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    try:
        return bcrypt.checkpw(
            _prepare_password(plain_password),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """密码哈希"""
    return bcrypt.hashpw(
        _prepare_password(password),
        bcrypt.gensalt(),
    ).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建 JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    raw = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    s = raw.decode("utf-8") if isinstance(raw, bytes) else raw
    return str(s)


def decode_token(token: str) -> Optional[dict]:
    """解码 JWT，失败返回 None"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None

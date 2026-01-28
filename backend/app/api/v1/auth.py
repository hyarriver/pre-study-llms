"""
认证相关路由：昵称登录/注册
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import User
from app.schemas.auth import NicknameLoginOrRegister, Token, UserResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/nickname/login-or-register", response_model=Token)
async def nickname_login_or_register(data: NicknameLoginOrRegister, db: Session = Depends(get_db)):
    """
    昵称一体化登录/注册：
    - 若昵称已存在：校验密码，正确则登录，错误则 401
    - 若昵称不存在：校验无重复后创建账户并登录；密码至少 6 位
    昵称存于 username，唯一；注册时校验重复，并发时以 DB 唯一约束兜底。
    """
    try:
        user = db.query(User).filter(User.username == data.nickname).first()
        if user:
            if not verify_password(data.password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="昵称或密码错误",
                )
        else:
            # 新用户：昵称已通过上面 filter 得知不存在；密码长度、唯一性由 DB 与 IntegrityError 兜底
            if len(data.password) < 6:
                raise HTTPException(status_code=400, detail="密码至少 6 位")
            email = f"{data.nickname}@nickname.local"
            user = User(
                username=data.nickname,
                email=email,
                hashed_password=get_password_hash(data.password),
                nickname=data.nickname,
            )
            db.add(user)
            try:
                db.commit()
                db.refresh(user)
            except IntegrityError:
                db.rollback()
                raise HTTPException(status_code=400, detail="昵称已被使用，请换一个")

        token = create_access_token(data={"sub": str(user.id), "username": user.username})
        return Token(access_token=str(token))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("nickname login/register error: %s", e)
        raise HTTPException(status_code=500, detail="登录服务异常，请稍后重试")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        nickname=getattr(current_user, "nickname", None) or current_user.username,
        avatar_url=getattr(current_user, "avatar_url", None),
    )

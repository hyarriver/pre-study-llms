"""
认证相关路由
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    PhoneLoginOrRegister,
    WeChatCallbackIn,
    Token,
    UserResponse,
)
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.auth import get_current_user
from app.services.wechat_service import get_authorize_url, exchange_code_for_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse)
async def register(data: UserRegister, db: Session = Depends(get_db)):
    """用户注册（用户名/邮箱方式，保留以兼容旧逻辑）"""
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")
    user = User(
        username=data.username,
        email=data.email,
        hashed_password=get_password_hash(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(id=user.id, username=user.username, email=user.email)


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: Session = Depends(get_db)):
    """用户名登录"""
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    return Token(access_token=str(token))


@router.post("/phone/login-or-register", response_model=Token)
async def phone_login_or_register(data: PhoneLoginOrRegister, db: Session = Depends(get_db)):
    """
    手机号一体化登录/注册：
    - 若手机号已存在：校验密码，正确则登录
    - 若手机号不存在：自动创建账户并登录
    """
    try:
        user = db.query(User).filter(User.username == data.phone).first()
        if user:
            if not verify_password(data.password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="手机号或密码错误",
                )
        else:
            auto_email = f"{data.phone}@auto.local"
            if db.query(User).filter(User.email == auto_email).first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="该手机号对应账户已存在，请联系管理员",
                )
            user = User(
                username=data.phone,
                email=auto_email,
                hashed_password=get_password_hash(data.password),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token(data={"sub": str(user.id), "username": user.username})
        return Token(access_token=str(token))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("phone login/register error: %s", e)
        raise HTTPException(status_code=500, detail="登录服务异常，请稍后重试")


@router.get("/wechat/authorize")
async def wechat_authorize(redirect: str = "/chapters"):
    """返回微信网页授权 URL，前端 location.href 跳转"""
    url = get_authorize_url(redirect)
    return {"authorize_url": url}


@router.post("/wechat/callback", response_model=Token)
async def wechat_callback(data: WeChatCallbackIn, db: Session = Depends(get_db)):
    """
    微信 OAuth 回调：用 code 换 openid，拉取昵称/头像，查或建用户后签发 JWT。
    """
    try:
        openid, nickname, headimgurl = await exchange_code_for_user(data.code)
        username = f"wx_{openid}"
        auto_email = f"{openid}@wx.local"
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(
                username=username,
                email=auto_email,
                hashed_password=get_password_hash("wx:" + openid),
                nickname=nickname,
                avatar_url=headimgurl,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if nickname is not None:
                user.nickname = nickname
            if headimgurl is not None:
                user.avatar_url = headimgurl
            db.commit()
            db.refresh(user)
        token = create_access_token(data={"sub": str(user.id), "username": user.username})
        return Token(access_token=token)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("wechat callback error: %s", e)
        raise HTTPException(status_code=500, detail="微信登录服务异常，请稍后重试")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        nickname=getattr(current_user, "nickname", None),
        avatar_url=getattr(current_user, "avatar_url", None),
    )

"""
微信网页授权服务（公众号 OAuth2）
"""
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import settings

WX_OAUTH2_ACCESS_TOKEN = "https://api.weixin.qq.com/sns/oauth2/access_token"
WX_SNS_USERINFO = "https://api.weixin.qq.com/sns/userinfo"


def get_authorize_url(redirect_path: str) -> str:
    """
    生成微信网页授权 URL。
    若未配置 WECHAT_APP_ID，抛出 501。
    """
    if not settings.WECHAT_APP_ID:
        raise HTTPException(status_code=501, detail="微信登录未配置")
    base = settings.WEB_APP_BASE_URL.rstrip("/")
    redirect_uri = f"{base}/login"
    redirect_uri_enc = quote(redirect_uri, safe="")
    state_enc = quote(redirect_path or "/chapters", safe="")
    return (
        f"https://open.weixin.qq.com/connect/oauth2/authorize"
        f"?appid={quote(settings.WECHAT_APP_ID, safe='')}"
        f"&redirect_uri={redirect_uri_enc}"
        f"&response_type=code"
        f"&scope=snsapi_userinfo"
        f"&state={state_enc}"
        "#wechat_redirect"
    )


async def exchange_code_for_user(code: str) -> tuple[str, str | None, str | None]:
    """
    用 code 换取 openid，并拉取昵称、头像（snsapi_userinfo）。
    返回 (openid, nickname, headimgurl)。
    headimgurl 即 avatar_url。
    """
    if not settings.WECHAT_APP_ID or not settings.WECHAT_APP_SECRET:
        raise HTTPException(status_code=501, detail="微信登录未配置")

    async with httpx.AsyncClient() as client:
        # 1. code -> access_token, openid
        r1 = await client.get(
            WX_OAUTH2_ACCESS_TOKEN,
            params={
                "appid": settings.WECHAT_APP_ID,
                "secret": settings.WECHAT_APP_SECRET,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        d1 = r1.json()
        if "errcode" in d1 and d1["errcode"] != 0:
            errcode = d1.get("errcode")
            errmsg = d1.get("errmsg", "未知错误")
            if errcode == 40029:
                raise HTTPException(status_code=400, detail="授权已过期或 code 无效，请重新登录")
            if errcode in (40163, 42002):
                raise HTTPException(status_code=400, detail="授权码已使用或已过期，请重新登录")
            if errcode == 10003:
                raise HTTPException(status_code=400, detail="redirect_uri 与公众号网页授权域名不一致，请检查配置")
            raise HTTPException(status_code=400, detail=f"微信授权失败: {errmsg}")

        if d1.get("is_snapshotuser") == 1:
            raise HTTPException(
                status_code=400,
                detail="请在微信内点击「访问完整网页」后重试",
            )

        openid = d1.get("openid")
        if not openid:
            raise HTTPException(status_code=400, detail="微信未返回 openid")

        access_token = d1.get("access_token")

        # 2. access_token + openid -> userinfo (nickname, headimgurl)
        r2 = await client.get(
            WX_SNS_USERINFO,
            params={"access_token": access_token, "openid": openid, "lang": "zh_CN"},
        )
        d2 = r2.json()
        nickname: str | None = None
        headimgurl: str | None = None
        if "errcode" not in d2 or d2.get("errcode") == 0:
            nickname = d2.get("nickname") or None
            headimgurl = d2.get("headimgurl") or None

        return (openid, nickname, headimgurl)

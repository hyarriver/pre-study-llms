"""
GitHub Webhook 接收端点
用于接收GitHub推送事件并触发自动部署
"""
import hmac
import hashlib
import subprocess
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, Header, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])


class WebhookPayload(BaseModel):
    """GitHub Webhook 负载（部分字段）"""
    ref: Optional[str] = None
    repository: Optional[dict] = None


def verify_webhook_signature(
    payload_body: bytes,
    signature_header: Optional[str],
    secret: str
) -> bool:
    """
    验证GitHub Webhook签名
    
    Args:
        payload_body: 请求体原始字节
        signature_header: X-Hub-Signature-256 请求头
        secret: GitHub Webhook密钥
        
    Returns:
        验证是否通过
    """
    if not signature_header:
        return False
    
    # GitHub发送的签名格式: sha256=<hash>
    if not signature_header.startswith("sha256="):
        return False
    
    signature = signature_header[7:]  # 移除 "sha256=" 前缀
    
    # 计算期望的签名
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    
    # 使用安全比较避免时序攻击
    return hmac.compare_digest(signature, expected_signature)


def execute_deploy_script():
    """
    执行部署脚本
    
    Returns:
        (success: bool, output: str, error: str)
    """
    try:
        # 获取项目根目录（backend的父目录）
        backend_dir = Path(__file__).parent.parent.parent.parent
        project_root = backend_dir.parent
        deploy_script = project_root / "scripts" / "deploy.sh"
        
        # 如果deploy.sh不存在，尝试deploy.ps1（Windows）
        if not deploy_script.exists():
            deploy_script = project_root / "scripts" / "deploy.ps1"
            if deploy_script.exists():
                # Windows PowerShell
                result = subprocess.run(
                    ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(deploy_script)],
                    cwd=str(project_root),
                    capture_output=True,
                    text=True,
                    timeout=300  # 5分钟超时
                )
            else:
                return False, "", "部署脚本不存在"
        else:
            # Linux/Mac Bash
            result = subprocess.run(
                ["bash", str(deploy_script)],
                cwd=str(project_root),
                capture_output=True,
                text=True,
                timeout=300  # 5分钟超时
            )
        
        success = result.returncode == 0
        return success, result.stdout, result.stderr
        
    except subprocess.TimeoutExpired:
        return False, "", "部署脚本执行超时"
    except Exception as e:
        logger.exception("执行部署脚本时出错")
        return False, "", str(e)


@router.post("/github")
async def github_webhook(
    request: Request,
    x_github_event: Optional[str] = Header(None),
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256")
):
    """
    接收GitHub Webhook事件
    
    配置说明:
    1. 在GitHub仓库设置中添加Webhook
    2. Payload URL: https://your-domain.com/api/v1/webhook/github
    3. Content type: application/json
    4. Secret: 设置一个密钥，并在环境变量WEBHOOK_SECRET中配置
    5. 选择事件: 至少选择 "push" 事件
    """
    # 读取请求体
    body = await request.body()
    
    # 从环境变量获取Webhook密钥（需要在.env中配置）
    import os
    webhook_secret = os.getenv("WEBHOOK_SECRET", "")
    
    # 验证签名（如果配置了密钥）
    if webhook_secret:
        if not verify_webhook_signature(body, x_hub_signature_256, webhook_secret):
            logger.warning("Webhook签名验证失败")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature"
            )
    
    # 解析JSON负载
    try:
        import json
        payload = json.loads(body.decode('utf-8'))
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    
    # 只处理push事件
    if x_github_event != "push":
        return {
            "status": "ignored",
            "event": x_github_event,
            "message": "只处理push事件"
        }
    
    # 检查是否是主分支（main或master）
    ref = payload.get("ref", "")
    if ref not in ["refs/heads/main", "refs/heads/master"]:
        return {
            "status": "ignored",
            "ref": ref,
            "message": "只处理main/master分支的推送"
        }
    
    # 执行部署
    logger.info(f"收到push事件，开始部署: {ref}")
    success, output, error = execute_deploy_script()
    
    if success:
        logger.info("部署成功")
        return {
            "status": "success",
            "message": "部署已触发并完成",
            "output": output
        }
    else:
        logger.error(f"部署失败: {error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"部署失败: {error}"
        )


@router.get("/test")
async def test_webhook():
    """
    测试Webhook端点是否可访问
    """
    return {
        "status": "ok",
        "message": "Webhook端点正常工作",
        "endpoint": "/api/v1/webhook/github"
    }

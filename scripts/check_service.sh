#!/bin/bash
# 检查后端服务运行状态

echo "🔍 检查后端服务状态..."
echo ""

# 检查服务是否在运行（通过端口）
echo "=== 检查 8000 端口 ==="
PORT_CHECK=$(lsof -i :8000 2>/dev/null || netstat -tlnp 2>/dev/null | grep :8000)
if [ ! -z "$PORT_CHECK" ]; then
    echo "✅ 8000 端口已被占用："
    echo "$PORT_CHECK"
    echo ""
    
    # 尝试访问健康检查端点
    echo "=== 测试服务健康状态 ==="
    HEALTH=$(curl -s http://localhost:8000/api/health 2>/dev/null)
    if [ ! -z "$HEALTH" ]; then
        echo "✅ 服务正在运行，健康检查响应："
        echo "$HEALTH"
    else
        echo "⚠️  端口被占用但服务可能未正常响应"
    fi
else
    echo "❌ 8000 端口未被占用，服务可能未运行"
fi

echo ""
echo "=== 检查运行中的 uvicorn 进程 ==="
UVICORN_PROCESS=$(ps aux | grep "uvicorn.*app.main:app" | grep -v grep)
if [ ! -z "$UVICORN_PROCESS" ]; then
    echo "✅ 找到 uvicorn 进程："
    echo "$UVICORN_PROCESS"
else
    echo "❌ 未找到 uvicorn 进程"
fi

echo ""
echo "=== 检查 systemd 服务 ==="
SYSTEMD_SERVICES=$(systemctl list-units --type=service --all | grep -E "api|backend|uvicorn|llm|dive")
if [ ! -z "$SYSTEMD_SERVICES" ]; then
    echo "找到相关 systemd 服务："
    echo "$SYSTEMD_SERVICES"
else
    echo "未找到相关 systemd 服务"
fi

#!/bin/bash
# 自动查找并重启后端服务

echo "🔍 正在查找后端服务..."
echo ""

# 检查 PM2
echo "=== 检查 PM2 进程 ==="
PM2_PROCESS=$(pm2 list | grep -E "api|backend|uvicorn|llm|dive" | head -1 | awk '{print $4}')
if [ ! -z "$PM2_PROCESS" ]; then
    echo "✅ 找到 PM2 进程: $PM2_PROCESS"
    echo ""
    echo "正在重启服务..."
    pm2 restart "$PM2_PROCESS" --update-env
    echo ""
    echo "✅ 服务已重启！"
    echo ""
    echo "查看状态："
    pm2 list
    exit 0
fi

# 检查 systemd
echo "=== 检查 systemd 服务 ==="
SYSTEMD_SERVICE=$(systemctl list-units --type=service --all | grep -E "api|backend|uvicorn|llm|dive" | awk '{print $1}' | head -1)
if [ ! -z "$SYSTEMD_SERVICE" ]; then
    echo "✅ 找到 systemd 服务: $SYSTEMD_SERVICE"
    echo ""
    echo "正在重启服务..."
    sudo systemctl restart "$SYSTEMD_SERVICE"
    echo ""
    echo "✅ 服务已重启！"
    echo ""
    echo "查看状态："
    sudo systemctl status "$SYSTEMD_SERVICE" --no-pager
    exit 0
fi

# 检查直接运行的进程
echo "=== 检查运行中的 uvicorn 进程 ==="
UVICORN_PID=$(ps aux | grep "uvicorn.*app.main:app" | grep -v grep | awk '{print $2}' | head -1)
if [ ! -z "$UVICORN_PID" ]; then
    echo "✅ 找到 uvicorn 进程 PID: $UVICORN_PID"
    echo ""
    echo "⚠️  检测到直接运行的进程，建议使用 PM2 管理"
    echo ""
    read -p "是否要停止当前进程并使用 PM2 启动？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $UVICORN_PID
        cd ~/i/dive-into-llms/backend
        pm2 start uvicorn --name "dive-into-llms-api" -- app.main:app --host 0.0.0.0 --port 8000
        pm2 save
        echo "✅ 已使用 PM2 启动服务！"
    else
        echo "请手动重启服务"
    fi
    exit 0
fi

# 没有找到服务
echo "❌ 未找到运行中的后端服务"
echo ""
echo "请选择："
echo "1. 使用 PM2 启动服务"
echo "2. 查看详细诊断信息"
echo "3. 退出"
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        cd ~/i/dive-into-llms/backend
        pm2 start uvicorn --name "dive-into-llms-api" -- app.main:app --host 0.0.0.0 --port 8000
        pm2 save
        echo "✅ 服务已启动！"
        ;;
    2)
        echo ""
        echo "=== 详细诊断信息 ==="
        echo ""
        echo "PM2 进程列表："
        pm2 list
        echo ""
        echo "systemd 服务："
        systemctl list-units --type=service | grep -E "api|backend|uvicorn|llm|dive"
        echo ""
        echo "运行中的进程："
        ps aux | grep -E "uvicorn|python.*main" | grep -v grep
        echo ""
        echo "端口占用："
        lsof -i :8000 2>/dev/null || netstat -tlnp | grep 8000
        ;;
    3)
        exit 0
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

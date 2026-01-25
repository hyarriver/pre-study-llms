#!/bin/bash
# 诊断 PM2 服务问题

echo "🔍 诊断 PM2 服务问题..."
echo ""

# 查看错误日志
echo "=== 错误日志（最近50行）==="
pm2 logs dive-into-llms-api --lines 50 --err

echo ""
echo "=== 所有日志（最近30行）==="
pm2 logs dive-into-llms-api --lines 30

echo ""
echo "=== 检查虚拟环境 ==="
cd ~/i/dive-into-llms/backend
if [ -d "venv" ]; then
    echo "✅ 虚拟环境存在"
    echo "Python 路径: $(pwd)/venv/bin/python"
    echo "Python 版本:"
    venv/bin/python --version
    echo ""
    echo "检查 uvicorn:"
    venv/bin/python -m uvicorn --help 2>&1 | head -3
else
    echo "❌ 虚拟环境不存在"
fi

echo ""
echo "=== 手动测试启动 ==="
echo "尝试手动运行命令..."
cd ~/i/dive-into-llms/backend
venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
TEST_PID=$!
sleep 3
if ps -p $TEST_PID > /dev/null; then
    echo "✅ 手动启动成功，进程 ID: $TEST_PID"
    kill $TEST_PID 2>/dev/null
else
    echo "❌ 手动启动失败"
fi

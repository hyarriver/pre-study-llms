#!/bin/bash
# 修复 PM2 服务启动问题

echo "🔍 诊断 PM2 服务问题..."
echo ""

# 1. 查看错误日志
echo "=== 查看错误日志 ==="
pm2 logs dive-into-llms-api --lines 50 --err

echo ""
echo "=== 查看所有日志 ==="
pm2 logs dive-into-llms-api --lines 30

echo ""
echo "=== 检查 Python 和 uvicorn ==="
echo "Python 版本:"
python3 --version 2>/dev/null || python --version 2>/dev/null

echo ""
echo "检查 uvicorn:"
python3 -m uvicorn --help 2>&1 | head -5 || python -m uvicorn --help 2>&1 | head -5

echo ""
echo "=== 检查项目文件 ==="
cd ~/i/dive-into-llms/backend
if [ -f "app/main.py" ]; then
    echo "✅ app/main.py 存在"
else
    echo "❌ app/main.py 不存在"
fi

if [ -f "requirements.txt" ]; then
    echo "✅ requirements.txt 存在"
else
    echo "❌ requirements.txt 不存在"
fi

echo ""
echo "=== 建议的修复步骤 ==="
echo "1. 删除错误的 PM2 进程"
echo "2. 检查依赖是否安装"
echo "3. 手动测试启动命令"
echo "4. 重新使用正确的命令启动"

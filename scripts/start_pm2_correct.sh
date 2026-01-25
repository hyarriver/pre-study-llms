#!/bin/bash
# 正确的 PM2 启动方式

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 使用正确方式启动 PM2 服务...${NC}"
echo ""

# 获取项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "❌ 虚拟环境不存在，请先运行:"
    echo "  cd ~/i/dive-into-llms"
    echo "  chmod +x scripts/setup_venv.sh"
    echo "  ./scripts/setup_venv.sh"
    exit 1
fi

# 删除旧进程
pm2 delete dive-into-llms-api 2>/dev/null || true

echo "使用正确的 PM2 启动方式..."
echo ""

# 方法1: 使用启动脚本（最可靠，确保工作目录正确）
if [ -f "start.sh" ]; then
    chmod +x start.sh
    pm2 start start.sh --name "dive-into-llms-api" --cwd "$BACKEND_DIR"
else
    # 方法2: 使用 --interpreter 和 --cwd 指定工作目录
    pm2 start venv/bin/python \
        --name "dive-into-llms-api" \
        --interpreter none \
        --cwd "$BACKEND_DIR" \
        -- \
        -m uvicorn app.main:app --host 0.0.0.0 --port 8000
fi

# 或者方法2: 使用 ecosystem.config.js
# cd "$PROJECT_ROOT"
# pm2 start ecosystem.config.js

pm2 save

echo ""
echo -e "${GREEN}✅ 服务启动完成！${NC}"
echo ""
echo "查看状态:"
pm2 list

echo ""
echo "查看日志:"
echo "  pm2 logs dive-into-llms-api"
echo ""
echo "测试服务:"
echo "  curl http://localhost:8000/api/health"

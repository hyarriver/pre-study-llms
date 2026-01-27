#!/bin/bash
# 启动后端服务的智能脚本

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 启动后端服务...${NC}"
echo ""

# 获取项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

# 检查虚拟环境
VENV_DIR="$BACKEND_DIR/venv"
if [ -d "$VENV_DIR" ]; then
    echo "✅ 找到虚拟环境: $VENV_DIR"
    PYTHON_CMD="$VENV_DIR/bin/python"
    UVICORN_CMD="$VENV_DIR/bin/python -m uvicorn"
    echo "使用虚拟环境中的 Python: $PYTHON_CMD"
else
    echo "⚠️  未找到虚拟环境，检查系统 Python..."
    # 检查是否需要创建虚拟环境
    if python3 -m pip install --help 2>&1 | grep -q "externally-managed"; then
        echo "❌ 系统 Python 受保护，需要创建虚拟环境"
        echo "运行以下命令创建虚拟环境："
        echo "  cd ~/i/dive-into-llms"
        echo "  chmod +x scripts/setup_venv.sh"
        echo "  ./scripts/setup_venv.sh"
        exit 1
    fi
    
    # 检查 uvicorn 是否可用
    if command -v uvicorn &> /dev/null; then
        echo "✅ 找到 uvicorn 命令"
        UVICORN_CMD="uvicorn"
    elif python3 -m uvicorn --help &> /dev/null; then
        echo "✅ 找到 uvicorn 模块"
        UVICORN_CMD="python3 -m uvicorn"
    elif python -m uvicorn --help &> /dev/null; then
        echo "✅ 找到 uvicorn 模块"
        UVICORN_CMD="python -m uvicorn"
    else
        echo "❌ 未找到 uvicorn"
        exit 1
    fi
fi

echo ""
echo "使用命令: $UVICORN_CMD"
echo ""

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 未安装，正在安装..."
    npm install -g pm2
fi

# 检查服务是否已运行
EXISTING_PROCESS=$(pm2 list | grep "dive-into-llms-api" | awk '{print $4}')
if [ ! -z "$EXISTING_PROCESS" ]; then
    echo "⚠️  服务已存在，正在重启..."
    pm2 restart dive-into-llms-api --update-env
else
    echo "启动新服务..."
    
    # 使用正确的 PM2 启动方式
    if [ -d "$VENV_DIR" ]; then
        # 使用虚拟环境，确保工作目录正确
        if [ -f "start.sh" ]; then
            chmod +x start.sh
            pm2 start start.sh --name "dive-into-llms-api" --cwd "$BACKEND_DIR"
        else
            pm2 start venv/bin/python --name "dive-into-llms-api" --interpreter none --cwd "$BACKEND_DIR" -- -m uvicorn main:app --host 0.0.0.0 --port 8000
        fi
    elif [ "$UVICORN_CMD" = "uvicorn" ]; then
        pm2 start uvicorn --name "dive-into-llms-api" -- main:app --host 0.0.0.0 --port 8000
    else
        # 使用 Python 模块方式（需要解析命令）
        if [[ "$UVICORN_CMD" == *"python3"* ]]; then
            pm2 start python3 --name "dive-into-llms-api" --interpreter none --cwd "$BACKEND_DIR" -- -m uvicorn main:app --host 0.0.0.0 --port 8000
        else
            pm2 start python --name "dive-into-llms-api" --interpreter none --cwd "$BACKEND_DIR" -- -m uvicorn main:app --host 0.0.0.0 --port 8000
        fi
    fi
fi

# 保存 PM2 配置
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

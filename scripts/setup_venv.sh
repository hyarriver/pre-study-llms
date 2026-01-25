#!/bin/bash
# 设置 Python 虚拟环境

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 设置 Python 虚拟环境...${NC}"
echo ""

# 获取项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"
VENV_DIR="$BACKEND_DIR/venv"

cd "$BACKEND_DIR"

# 检查是否已存在虚拟环境
if [ -d "$VENV_DIR" ]; then
    echo "⚠️  虚拟环境已存在: $VENV_DIR"
    read -p "是否要重新创建？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "删除旧虚拟环境..."
        rm -rf "$VENV_DIR"
    else
        echo "使用现有虚拟环境"
        exit 0
    fi
fi

# 创建虚拟环境
echo "创建虚拟环境..."
python3 -m venv venv

# 激活虚拟环境并安装依赖
echo "激活虚拟环境并安装依赖..."
source venv/bin/activate

echo "升级 pip..."
pip install --upgrade pip

echo "安装项目依赖..."
pip install -r requirements.txt

echo ""
echo -e "${GREEN}✅ 虚拟环境设置完成！${NC}"
echo ""
echo "虚拟环境位置: $VENV_DIR"
echo ""
echo "激活虚拟环境:"
echo "  source $VENV_DIR/bin/activate"
echo ""
echo "使用虚拟环境中的 Python:"
echo "  $VENV_DIR/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

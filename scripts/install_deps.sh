#!/usr/bin/env bash
# 自动安装项目所需框架与包（Python 依赖 + 系统依赖 Tesseract/Poppler）
# 用法：在项目根目录执行 ./scripts/install_deps.sh 或 bash scripts/install_deps.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
VENV_DIR="$BACKEND_DIR/venv"

echo -e "${GREEN}📦 安装项目依赖（Python + 系统）...${NC}"
echo ""

# 1. 系统依赖：Tesseract OCR、Poppler（pdf2image 需要）
install_system_deps() {
    if command -v apt-get &>/dev/null; then
        echo "检测到 Debian/Ubuntu，安装 tesseract-ocr 与 poppler-utils..."
        sudo apt-get update -qq
        sudo apt-get install -y -qq \
            tesseract-ocr \
            tesseract-ocr-chi-sim \
            poppler-utils \
            || true
    elif command -v brew &>/dev/null; then
        echo "检测到 macOS (Homebrew)，安装 tesseract 与 poppler..."
        brew install tesseract tesseract-lang poppler 2>/dev/null || true
    elif command -v dnf &>/dev/null; then
        echo "检测到 Fedora/RHEL，安装 tesseract 与 poppler-utils..."
        sudo dnf install -y tesseract tesseract-langpack-chi_sim poppler-utils 2>/dev/null || true
    elif command -v pacman &>/dev/null; then
        echo "检测到 Arch，安装 tesseract 与 poppler..."
        sudo pacman -Sy --noconfirm tesseract tesseract-data-chi_sim poppler 2>/dev/null || true
    else
        echo -e "${YELLOW}未检测到包管理器，请手动安装：${NC}"
        echo "  - Tesseract OCR（及 chi_sim 语言包）"
        echo "  - Poppler（pdf2image 依赖）"
    fi
}

install_system_deps
echo ""

# 2. Python 依赖（必须在虚拟环境中安装，避免 PEP 668 externally-managed-environment）
cd "$BACKEND_DIR"
VENV_ACTIVATE="$VENV_DIR/bin/activate"
if [ -f "$VENV_ACTIVATE" ]; then
    echo "使用已有虚拟环境: $VENV_DIR"
elif [ -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}检测到不完整的 venv 目录，正在重建...${NC}"
    rm -rf "$VENV_DIR"
    python3 -m venv "$VENV_DIR"
else
    echo "正在创建虚拟环境: $VENV_DIR ..."
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_ACTIVATE"

echo "升级 pip..."
pip install --upgrade pip -q

echo "安装 Python 依赖 (backend/requirements.txt)..."
pip install -r requirements.txt

echo ""
echo -e "${GREEN}✅ 依赖安装完成。${NC}"
echo ""
echo "可选：启用 DocTR（版面/表格识别，体积较大）："
echo "  source $VENV_DIR/bin/activate && pip install doctr torch"
echo ""
echo "启动后端："
echo "  source $VENV_DIR/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""

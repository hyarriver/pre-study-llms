#!/bin/bash
# 自动部署脚本 - 当GitHub代码更新时执行
# 使用方法: ./deploy.sh

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

log_info "项目根目录: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# 1. 拉取最新代码
log_info "正在拉取最新代码..."
git fetch origin
git reset --hard origin/main  # 或 origin/master，根据你的主分支名称调整
log_info "代码更新完成"

# 2. 更新后端依赖（如果需要）
if [ -f "backend/requirements.txt" ]; then
    log_info "检查后端依赖..."
    cd backend
    
    # 检查虚拟环境
    if [ -d "venv" ]; then
        log_info "使用虚拟环境安装依赖..."
        venv/bin/pip install --upgrade pip --quiet
        venv/bin/pip install -r requirements.txt --quiet
    else
        log_warn "未找到虚拟环境 venv，尝试系统 pip..."
        for pip_cmd in "python3 -m pip" "python -m pip" "pip3" "pip"; do
            if $pip_cmd --version &>/dev/null; then
                $pip_cmd install -r requirements.txt --quiet --break-system-packages 2>/dev/null || \
                $pip_cmd install -r requirements.txt --quiet 2>/dev/null || true
                break
            fi
        done
        if ! python3 -c "import fastapi" 2>/dev/null; then
            log_warn "依赖可能未完全安装。建议: cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt"
        fi
    fi
    
    cd ..
    log_info "后端依赖检查完成"
fi

# 3. 更新前端依赖并构建
if [ -f "web/package.json" ]; then
    log_info "更新前端依赖..."
    cd web
    npm install --silent
    log_info "构建前端..."
    npm run build
    
    # 同步到 Caddy 容器挂载的目录
    CADDY_SITE_DIR="/root/i/caddy/site/pre-study-llms"
    if [ -d "dist" ]; then
        log_info "同步前端到 Caddy 目录: $CADDY_SITE_DIR"
        # 使用 rsync 同步（如果没有 rsync，用 cp）
        if command -v rsync &> /dev/null; then
            rsync -av --delete dist/ "$CADDY_SITE_DIR/"
            log_info "前端同步完成（使用 rsync）"
        else
            log_warn "rsync 未安装，使用 cp 复制..."
            rm -rf "$CADDY_SITE_DIR"/*
            cp -r dist/* "$CADDY_SITE_DIR/"
            log_info "前端同步完成（使用 cp）"
        fi
    else
        log_error "dist 目录不存在，前端构建可能失败"
    fi
    
    cd ..
    log_info "前端构建完成"
fi

# 4. 重启服务（智能检测并重启）
log_info "正在重启后端服务..."

# 智能查找并重启服务
RESTARTED=false
HAS_PM2=$(command -v pm2 2>/dev/null && echo "yes" || echo "no")

# 方式1: 检查 PM2（仅当 pm2 可用时）
if [ "$HAS_PM2" = "yes" ]; then
    PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "api|backend|uvicorn|llm|dive" | awk '{print $4}' | head -1 || true)
    if [ ! -z "$PM2_PROCESS" ]; then
        log_info "在 PM2 中找到服务: $PM2_PROCESS"
        pm2 restart "$PM2_PROCESS" --update-env
        RESTARTED=true
    fi
fi

# 方式2: 检查 Docker Compose
if [ "$RESTARTED" = false ] && [ -f "$PROJECT_ROOT/compose.yml" ]; then
    if command -v docker &> /dev/null; then
        cd "$PROJECT_ROOT"
        if docker compose version &> /dev/null; then
            log_info "使用 Docker Compose 重启后端..."
            docker compose up -d --build backend 2>/dev/null && RESTARTED=true || true
        elif docker-compose version &> /dev/null; then
            log_info "使用 docker-compose 重启后端..."
            docker-compose up -d --build backend 2>/dev/null && RESTARTED=true || true
        fi
    fi
fi

# 方式3: 检查 systemd
if [ "$RESTARTED" = false ]; then
    SYSTEMD_SERVICE=$(systemctl list-units --type=service --all 2>/dev/null | grep -E "api|backend|uvicorn|llm|dive" | awk '{print $1}' | head -1 || true)
    if [ ! -z "$SYSTEMD_SERVICE" ]; then
        log_info "在 systemd 中找到服务: $SYSTEMD_SERVICE"
        sudo systemctl restart "$SYSTEMD_SERVICE"
        RESTARTED=true
    fi
fi

# 方式4: 检查直接运行的进程
if [ "$RESTARTED" = false ]; then
    UVICORN_PID=$(ps aux | grep "uvicorn.*app.main:app" | grep -v grep | awk '{print $2}' | head -1 || true)
    if [ ! -z "$UVICORN_PID" ]; then
        log_info "找到运行中的进程 PID: $UVICORN_PID，正在重启..."
        kill $UVICORN_PID 2>/dev/null || true
        sleep 2
        cd "$PROJECT_ROOT/backend"
        if [ -f "venv/bin/python" ]; then
            nohup venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> /tmp/dive-llms.log 2>&1 &
        elif command -v uvicorn &> /dev/null; then
            nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 >> /tmp/dive-llms.log 2>&1 &
        else
            nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> /tmp/dive-llms.log 2>&1 &
        fi
        RESTARTED=true
    fi
fi

# 方式5: 使用 PM2 启动（仅当 pm2 可用时）
if [ "$RESTARTED" = false ] && [ "$HAS_PM2" = "yes" ]; then
    log_info "使用 PM2 启动新服务..."
    cd "$PROJECT_ROOT/backend"
    if [ -f "venv/bin/python" ]; then
        pm2 start venv/bin/python --name "dive-into-llms-api" --interpreter none --cwd "$PROJECT_ROOT/backend" -- -m uvicorn app.main:app --host 0.0.0.0 --port 8000
    elif command -v uvicorn &> /dev/null; then
        pm2 start uvicorn --name "dive-into-llms-api" -- app.main:app --host 0.0.0.0 --port 8000
    else
        pm2 start "python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000" --name "dive-into-llms-api"
    fi
    pm2 save 2>/dev/null || true
    RESTARTED=true
fi

# 方式6: pm2 不可用时的后备方案
if [ "$RESTARTED" = false ]; then
    if [ "$HAS_PM2" = "no" ]; then
        log_warn "未找到 pm2，尝试直接启动后端..."
        cd "$PROJECT_ROOT/backend"
        if [ -f "venv/bin/python" ]; then
            nohup venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> /tmp/dive-llms.log 2>&1 &
        elif command -v uvicorn &> /dev/null; then
            nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 >> /tmp/dive-llms.log 2>&1 &
        else
            nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> /tmp/dive-llms.log 2>&1 &
        fi
        sleep 2
        if pgrep -f "uvicorn.*app.main:app" > /dev/null; then
            RESTARTED=true
            log_info "后端已启动，日志: /tmp/dive-llms.log（建议安装 pm2: npm i -g pm2）"
        fi
    fi
fi

if [ "$RESTARTED" = true ]; then
    log_info "服务重启/启动完成"
else
    log_warn "无法自动重启服务。请手动执行: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    log_warn "或安装 pm2: npm i -g pm2"
fi

log_info "部署完成！"
log_info "时间: $(date)"

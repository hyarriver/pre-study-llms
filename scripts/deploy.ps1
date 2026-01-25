# PowerShell 自动部署脚本 - 当GitHub代码更新时执行
# 使用方法: .\deploy.ps1

$ErrorActionPreference = "Stop"

# 日志函数
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Log-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 获取脚本所在目录的父目录（项目根目录）
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Log-Info "项目根目录: $ProjectRoot"
Set-Location $ProjectRoot

# 1. 拉取最新代码
Log-Info "正在拉取最新代码..."
git fetch origin
git reset --hard origin/main  # 或 origin/master，根据你的主分支名称调整
Log-Info "代码更新完成"

# 2. 更新后端依赖（如果需要）
if (Test-Path "backend\requirements.txt") {
    Log-Info "检查后端依赖..."
    Set-Location backend
    pip install -r requirements.txt --quiet
    Set-Location ..
    Log-Info "后端依赖检查完成"
}

# 3. 更新前端依赖并构建
if (Test-Path "web\package.json") {
    Log-Info "更新前端依赖..."
    Set-Location web
    npm install --silent
    Log-Info "构建前端..."
    npm run build
    Set-Location ..
    Log-Info "前端构建完成"
}

# 4. 重启服务（根据你的实际部署方式调整）
# 方式1: 如果使用Windows服务
# Log-Info "重启后端服务..."
# Restart-Service -Name "DiveIntoLLMs-Backend"
# Restart-Service -Name "DiveIntoLLMs-Frontend"

# 方式2: 如果使用PM2
# Log-Info "重启服务..."
# pm2 restart dive-into-llms-backend
# pm2 restart dive-into-llms-frontend

# 方式3: 如果使用Docker
# Log-Info "重启Docker容器..."
# docker-compose down
# docker-compose up -d --build

Log-Info "部署完成！"
Log-Info "时间: $(Get-Date)"

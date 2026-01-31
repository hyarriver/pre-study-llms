# 自动安装项目所需框架与包（Windows）
# 用法：在项目根目录执行 .\scripts\install_deps.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host "📦 安装项目依赖（Python + 可选 Tesseract）..." -ForegroundColor Green
Write-Host ""

# 1. 可选：尝试安装 Tesseract（OCR）
function Install-Tesseract {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "使用 winget 安装 Tesseract OCR..."
        winget install UB-Mannheim.TesseractOCR --accept-package-agreements --accept-source-agreements 2>$null
        return $?
    }
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "使用 Chocolatey 安装 Tesseract OCR..."
        choco install tesseract -y
        return $?
    }
    Write-Host "请手动安装 Tesseract 并添加到 PATH: https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor Yellow
    return $false
}
Install-Tesseract | Out-Null
Write-Host ""

# 2. Python 依赖
Set-Location $BackendDir
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "使用已有虚拟环境: backend\venv"
    & "venv\Scripts\Activate.ps1"
}

Write-Host "升级 pip..."
python -m pip install --upgrade pip -q

Write-Host "安装 Python 依赖 (backend/requirements.txt)..."
pip install -r requirements.txt

Write-Host ""
Write-Host "✅ 依赖安装完成。" -ForegroundColor Green
Write-Host ""
Write-Host "可选：启用 DocTR（版面/表格识别）： pip install doctr torch"
Write-Host ""

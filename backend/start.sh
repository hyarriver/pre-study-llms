#!/bin/bash
# 后端服务启动脚本（用于 PM2）

cd "$(dirname "$0")"
source venv/bin/activate
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000

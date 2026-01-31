#!/bin/bash
# 在 Docker 容器内设置管理员（依赖在容器内已安装）
# 用法: ./scripts/set_admin_docker.sh <用户名>

USERNAME="${1:-}"
if [ -z "$USERNAME" ]; then
    echo "用法: $0 <用户名>"
    echo "示例: $0 hyarriver"
    exit 1
fi

CONTAINER="dive-into-llms-backend"
docker exec -it "$CONTAINER" python -c "
from app.database.session import SessionLocal
from app.models import User
db = SessionLocal()
user = db.query(User).filter(User.username=='$USERNAME').first()
if user:
    user.role = 'admin'
    db.commit()
    print('已将 $USERNAME 设为管理员')
else:
    print('未找到用户 $USERNAME，请先登录注册')
db.close()
"

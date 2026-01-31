#!/usr/bin/env python3
"""
将指定用户设置为管理员。用法:
  python3 scripts/set_admin.py <username>
  python3 scripts/set_admin.py <user_id>

Docker 部署时在容器内执行:
  docker exec -it dive-into-llms-backend python -c "..."

需要从项目根目录运行。
"""
import sys
import os
from pathlib import Path

# 确保能导入 app
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
os.chdir(ROOT)

from app.database.session import SessionLocal
from app.models import User


def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/set_admin.py <用户名或用户ID>")
        sys.exit(1)
    arg = sys.argv[1].strip()
    db = SessionLocal()
    try:
        user = None
        if arg.isdigit():
            user = db.query(User).filter(User.id == int(arg)).first()
        else:
            user = db.query(User).filter(User.username == arg).first()
        if not user:
            print(f"未找到用户: {arg}")
            sys.exit(1)
        user.role = "admin"
        db.commit()
        print(f"已将用户 {user.username} (id={user.id}) 设为管理员")
    finally:
        db.close()


if __name__ == "__main__":
    main()

#!/bin/bash
# 快速添加 WEBHOOK_SECRET 到 backend/.env 文件

SECRET="604e8503763d14285e416f07904667acfb31c49c541e326249ccc5fcaf0d28fc"
ENV_FILE="backend/.env"

# 检查文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "创建 $ENV_FILE 文件..."
    touch "$ENV_FILE"
fi

# 检查是否已存在 WEBHOOK_SECRET
if grep -q "^WEBHOOK_SECRET=" "$ENV_FILE"; then
    echo "检测到已存在 WEBHOOK_SECRET，正在更新..."
    # 使用 sed 替换（Linux）
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sed -i "s|^WEBHOOK_SECRET=.*|WEBHOOK_SECRET=$SECRET|" "$ENV_FILE"
    # macOS 使用不同的 sed 命令
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^WEBHOOK_SECRET=.*|WEBHOOK_SECRET=$SECRET|" "$ENV_FILE"
    fi
    echo "✅ WEBHOOK_SECRET 已更新"
else
    echo "添加 WEBHOOK_SECRET..."
    echo "" >> "$ENV_FILE"
    echo "# GitHub Webhook 配置（用于自动部署）" >> "$ENV_FILE"
    echo "WEBHOOK_SECRET=$SECRET" >> "$ENV_FILE"
    echo "✅ WEBHOOK_SECRET 已添加"
fi

echo ""
echo "当前 WEBHOOK_SECRET 配置："
grep "^WEBHOOK_SECRET=" "$ENV_FILE"

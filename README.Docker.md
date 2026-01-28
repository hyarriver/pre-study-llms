# Docker 部署指南

本文档介绍如何使用 Docker 部署《动手学大模型》学习平台后端服务。

## 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 网关服务（用于反向代理，已配置）

## 快速开始

### 1. 配置环境变量

复制并编辑环境变量文件：

```bash
# 后端环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，设置 SECRET_KEY 等配置
```

**重要**: 生产环境请务必修改 `SECRET_KEY` 和 `WEBHOOK_SECRET`！

### 2. 构建和启动服务

```bash
# 构建并启动后端服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 前端部署

前端需要单独打包部署：

```bash
# 进入前端目录
cd web

# 安装依赖
npm install

# 构建前端
npm run build

# 构建产物在 web/dist 目录
# 将 dist 目录部署到你的网关/Web 服务器
```

### 4. 网关配置

后端容器不直接对外暴露，需在网关把 **`/api`** 反向代理到后端。  
**图片等静态资源**已改为通过 **`/api/v1/static/*`** 提供，因此**只需代理 `/api`，图片即可加载**，无需单独配置 `/static`。

**要点：**
- 后端服务：`dive-into-llms-backend:8000`（若网关与 compose 同网，如 `caddy-network`，可直接用容器名）
- **必须**：`/api` → 后端（`/api/v1/static` 会一并转发）

**Nginx 示例：**

```nginx
location /api {
    proxy_pass http://dive-into-llms-backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Caddy 示例：**

```caddy
/api/*  { reverse_proxy dive-into-llms-backend:8000 }
```

（仍保留根路径的 `/static` 挂载时，可额外代理 `location /static` 作为备用，非必须。）

### 5. 访问应用

- 前端: 通过网关配置的域名访问（部署的 dist 目录）
- 后端 API: 通过网关配置的域名 + `/api` 访问
- API 文档: 通过网关配置的域名 + `/api/docs` 访问

## 常用命令

### 启动和停止

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 停止并删除数据卷（注意：会删除数据库）
docker-compose down -v

# 重启服务
docker-compose restart
```

### 查看日志

```bash
# 查看服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
```

### 重建服务

```bash
# 重新构建并启动
docker-compose up -d --build

# 只重建后端服务
docker-compose up -d --build backend
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend bash
```

## 数据持久化

- 数据库文件: `backend/data/` 目录（SQLite）
- 文档和资源: `documents/` 和 `pics/` 目录已挂载为只读

## 故障排查

### 检查服务健康状态

```bash
# 查看服务状态
docker-compose ps

# 检查健康检查
docker inspect dive-into-llms-backend | grep -A 10 Health
```

### 常见问题

1. **网关无法连接到容器**: 
   - 确保网关和容器在同一 Docker 网络中
   - 检查容器名称是否正确（`dive-into-llms-backend`）
   - 使用 `docker network inspect dive-into-llms-network` 查看网络详情

2. **CORS 错误**: 
   - 后端已配置为允许所有来源，无需额外配置

3. **端口冲突**: 
   - 容器已配置为不暴露端口，所有流量通过网关

4. **图片不加载、Notebook/README 中图片 404**:
   - 图片已走 **`/api/v1/static/*`**，只要网关将 **`/api`** 转发到后端即可，无需单独配置 `/static`。
   - 确认 `documents` 目录可用：Docker 需挂载 `./documents:/app/documents`；非 Docker 需在项目根存在 `documents/` 且后端从 `backend` 目录启动。
   - 自检：`GET /api/test-image` 中 `image_exists: true`；再直接请求 `GET /api/v1/static/chapter1/assets/0.png` 应返回图片。

5. **章节考核显示「本章节暂无考核试题」**:
   - 试题来自 `documents/exam_questions.json`，初次启动时写入数据库。若该文件在首次启动时不存在或路径错误，试题不会被导入。
   - 处理：确认 `documents/exam_questions.json` 存在且后端能读取；**部署修复后需重启后端**，使 `init_db` 再次执行。若之前已误建库且 `Question` 一直为空，重启后会自动补导。
   - 若仍无试题：可删库重建（会清空所有数据）  
     `rm backend/data/learning_platform.db`，然后重启后端。

6. **权限问题**: 确保 Docker 有权限访问项目目录

7. **数据库初始化失败**: 检查 `backend/data/` 目录权限

### 查看详细日志

```bash
# 查看容器详细日志
docker logs dive-into-llms-backend
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动后端
docker-compose up -d --build

# 重新构建前端（如果需要）
cd web
npm run build
# 然后重新部署 dist 目录

# 或只重启服务（代码已更新）
docker-compose restart
```

## 备份和恢复

### 备份数据库

```bash
# 备份 SQLite 数据库
docker-compose exec backend cp /app/data/learning_platform.db /app/data/learning_platform.db.backup
# 或从主机备份
cp backend/data/learning_platform.db backend/data/backup-$(date +%Y%m%d).db
```

### 恢复数据库

```bash
# 停止服务
docker-compose down

# 恢复数据库文件
cp backend/data/backup-YYYYMMDD.db backend/data/learning_platform.db

# 启动服务
docker-compose up -d
```

## 微信登录

微信登录使用**微信公众号网页授权**（仅支持微信内置浏览器 H5），需**已认证服务号**或[微信公众平台接口测试号](https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login)。

### 配置步骤

1. 在公众号（或接口测试号）后台配置 **网页授权域名**：  
   - 路径：设置与开发 → 接口权限 → 网页授权  
   - 填写域名（不含 `http://`），如 `yourdomain.com` 或 `xxx.ngrok.io`

2. 在 `backend/.env` 中增加：

   ```env
   WECHAT_APP_ID=你的公众号AppID
   WECHAT_APP_SECRET=你的公众号AppSecret
   WEB_APP_BASE_URL=https://yourdomain.com
   ```

   `WEB_APP_BASE_URL` 须与网页授权域名一致（协议 + 域名，可含端口）；生产环境须使用 **HTTPS**。

3. **Docker 部署**：使用 `compose.yml` 时，上述三项需通过 `backend` 的 `environment` 传入。可在**项目根**创建 `.env`，写入 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`、`WEB_APP_BASE_URL`，compose 会自动用其做变量替换；或在运行 `docker-compose` 前 `export` 这三个变量。

### 本地开发

微信不支持 `http://localhost` 作为回调。需用 **内网穿透**（如 [ngrok](https://ngrok.com/)、[natapp](https://natapp.cn/)）将前端暴露为 `https://xxx.ngrok.io`，在公众号网页授权域名中配置该域名，并设置：

```env
WEB_APP_BASE_URL=https://xxx.ngrok.io
```

不配置上述三项环境变量时，`GET /auth/wechat/authorize` 会返回 501「微信登录未配置」。

### 微信扫码登录（开放平台-网站应用）

**微信扫码登录**适用于 **PC / 非微信浏览器**：用户点击「微信扫码登录」后跳转至微信开放平台页面，用手机微信扫码并确认，即可在电脑端完成登录。与上述「微信一键登录」不同：扫码使用**微信开放平台-网站应用**的 AppID/AppSecret，与公众号为两套配置。

1. 在 [微信开放平台](https://open.weixin.qq.com/) 注册并认证，创建 **网站应用**，申请 **微信登录** 并通过审核，获得网站应用的 **AppID** 和 **AppSecret**。

2. 在开放平台该网站应用下配置 **授权回调域**：填写 `WEB_APP_BASE_URL` 的域名（仅域名，如 `yourdomain.com`），须与公众号网页授权域名可同可不同，但须能访问到 `{WEB_APP_BASE_URL}/login`。

3. 在 `backend/.env` 或项目根 `.env`（Docker 时）中增加：

   ```env
   WECHAT_OPEN_APP_ID=你的开放平台网站应用AppID
   WECHAT_OPEN_APP_SECRET=你的开放平台网站应用AppSecret
   ```

   `WEB_APP_BASE_URL` 与公众号共用；Docker 下同样通过 compose 的 `environment` 或项目根 `.env` 传入 `WECHAT_OPEN_APP_ID`、`WECHAT_OPEN_APP_SECRET`。

4. 不配置时，`GET /auth/wechat-qr/authorize` 返回 501「微信扫码登录未配置」；非微信浏览器下登录页会显示「微信扫码登录」按钮，配置后点击即跳转扫码页。

---

## 安全建议

1. ✅ 修改默认的 `SECRET_KEY` 和 `WEBHOOK_SECRET`
2. ✅ 使用强密码和 HTTPS
3. ✅ 定期更新 Docker 镜像
4. ✅ 限制容器资源使用
5. ✅ 配置防火墙规则
6. ✅ 定期备份数据

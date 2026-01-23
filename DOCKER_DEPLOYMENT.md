# Docker 部署指南

## 快速开始

### 方式一：使用 Docker Compose（推荐）

1. **创建数据目录并设置权限** ⚠️ **重要！**

   ```bash
   # 创建数据目录
   mkdir -p data backups
   
   # 设置目录权限（非常重要！）
   chmod -R 755 data backups
   ```
   
   **⚠️ 权限问题说明：**
   - 如果遇到 `SQLITE_CANTOPEN` 错误，90% 都是因为目录权限不正确
   - 确保 `data` 和 `backups` 目录有正确的读写权限
   - 如果容器内使用非 root 用户，可能需要调整权限：
     ```bash
     # 如果容器内用户ID是1000，可以设置：
     sudo chown -R 1000:1000 data backups
     chmod -R 755 data backups
     ```

2. **配置环境变量**

   复制环境变量模板并修改配置：
   ```bash
   # 复制模板文件
   cp .env.example .env
   
   # 编辑 .env 文件，修改以下配置：
   # 默认管理员账号为：admin
   # ADMIN_PASSWORD=your_secure_password_here  # 修改为强密码
   # ADMIN_TOKEN=your_random_token_here         # 修改为随机 token
   ```
   
   使用文本编辑器编辑 `.env` 文件：
   ```bash
   nano .env
   # 或
   vi .env
   ```
   
   **环境变量说明：**
   - `ADMIN_PASSWORD`: 管理员登录密码（生产环境必须修改）
     - **默认管理员账号为：admin**
   - `ADMIN_TOKEN`: 管理员认证 Token（生产环境必须修改为随机字符串）
   - `PORT`: 服务端口（默认 3000，可根据需要修改）
   - `NODE_ENV`: 运行环境（默认 production）

3. **启动服务**

   ```bash
   docker-compose up -d
   ```

3. **查看日志**

   ```bash
   docker-compose logs -f
   ```

4. **停止服务**

   ```bash
   docker-compose down
   ```

### 方式二：使用 Docker 命令

1. **构建镜像**

   ```bash
   docker build -t gods-bookmark:latest .
   ```

2. **运行容器**

   ```bash
   docker run -d \
     --name gods-bookmark \
     --restart unless-stopped \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/backups:/app/backups \
     -e NODE_ENV=production \
     -e PORT=3000 \
     -e ADMIN_PASSWORD=your_secure_password \
     -e ADMIN_TOKEN=your_random_token \
     gods-bookmark:latest
# 注意：默认管理员账号为：admin
   ```

## 访问应用

- **本地访问**：http://localhost:3000
- **局域网访问**：http://<NAS_IP>:3000
- **公网访问**：需要配置端口转发和域名（可选）

## 数据持久化

数据存储在挂载的 volume 中：
- `./data` - 数据库文件（SQLite）
- `./backups` - 备份文件

### 目录权限设置 ⚠️ **非常重要！**

**在首次部署前，必须创建目录并设置正确的权限：**

```bash
# 1. 创建数据目录
mkdir -p data backups

# 2. 设置目录权限（必须执行！）
chmod -R 755 data backups

# 3. 如果容器内使用非 root 用户，可能需要设置所有者
# 查看容器内用户ID（通常是1000）
docker run --rm gods-bookmark id

# 根据容器内用户ID设置所有者（示例：用户ID为1000）
sudo chown -R 1000:1000 data backups
chmod -R 755 data backups
```

**常见权限问题：**

1. **SQLITE_CANTOPEN 错误**
   - **原因**：90% 都是因为目录权限不正确
   - **解决**：确保 `data` 目录有读写权限（755 或 775）
   - **检查**：`ls -la data` 应该显示 `drwxr-xr-x` 或 `drwxrwxr-x`

2. **Permission denied 错误**
   - **原因**：容器内用户无法写入挂载的目录
   - **解决**：使用 `chown` 设置正确的所有者，或使用 `chmod 777`（不推荐，安全性较低）

3. **目录不存在错误**
   - **原因**：未创建目录就直接启动容器
   - **解决**：先执行 `mkdir -p data backups` 创建目录

## 环境变量说明

环境变量通过 `.env` 文件配置，模板文件为 `.env.example`。

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | `production` | 是 |
| `PORT` | 服务端口 | `3000` | 否 |
| `ADMIN_PASSWORD` | 管理员密码 | `admin` | 是（生产环境必须修改） |
| | | **默认管理员账号为：admin** | |
| `ADMIN_TOKEN` | 管理员 Token | `secret-admin-token-123` | 是（生产环境必须修改） |

**配置步骤：**
1. 复制模板：`cp .env.example .env`
2. 编辑配置：`nano .env` 或 `vi .env`
3. 修改 `ADMIN_PASSWORD` 和 `ADMIN_TOKEN` 为安全的值
4. 保存文件，Docker Compose 会自动加载 `.env` 文件中的环境变量

## 健康检查

容器包含健康检查，可以通过以下命令查看状态：
```bash
docker ps  # 查看容器状态
docker inspect --format='{{.State.Health.Status}}' gods-bookmark
```

## 更新应用

1. **停止容器**
   ```bash
   docker-compose down
   ```

2. **拉取最新代码并重新构建**
   ```bash
   git pull
   docker-compose build --no-cache
   ```

3. **启动新容器**
   ```bash
   docker-compose up -d
   ```

## 备份和恢复

### 备份数据

```bash
# 备份数据库
cp -r data/database.sqlite backups/database_backup_$(date +%Y%m%d).sqlite

# 或使用 Docker 命令
docker exec gods-bookmark tar czf /app/backups/backup_$(date +%Y%m%d).tar.gz /app/data
```

### 恢复数据

```bash
# 停止容器
docker-compose down

# 恢复数据库文件
cp backups/database_backup_YYYYMMDD.sqlite data/database.sqlite

# 启动容器
docker-compose up -d
```

## 故障排查

### 查看日志

```bash
# Docker Compose
docker-compose logs -f

# Docker 命令
docker logs -f gods-bookmark
```

### 进入容器调试

```bash
docker exec -it gods-bookmark sh
```

### 常见问题

1. **端口被占用**
   - 修改 `docker-compose.yml` 中的端口映射：`"8080:3000"`

2. **权限问题（最常见）**
   - **症状**：出现 `SQLITE_CANTOPEN` 或 `Permission denied` 错误
   - **原因**：90% 都是因为目录权限不正确
   - **解决步骤**：
     ```bash
     # 1. 停止容器
     docker-compose down
     
     # 2. 创建目录（如果不存在）
     mkdir -p data backups
     
     # 3. 设置权限
     chmod -R 755 data backups
     
     # 4. 如果需要，设置所有者（根据容器内用户ID）
     sudo chown -R 1000:1000 data backups
     
     # 5. 重新启动容器
     docker-compose up -d
     ```
   - **验证**：检查目录权限 `ls -la data`，应该显示 `drwxr-xr-x` 或 `drwxrwxr-x`

3. **无法访问**
   - 检查防火墙设置
   - 确认端口映射正确
   - 检查容器是否正常运行：`docker ps`

## 安全建议

1. **修改默认密码**：生产环境必须修改 `ADMIN_PASSWORD` 和 `ADMIN_TOKEN`
2. **使用 HTTPS**：通过反向代理（如 Nginx）配置 HTTPS
3. **限制访问**：使用防火墙限制访问来源
4. **定期备份**：设置自动备份任务
5. **更新镜像**：定期更新基础镜像和依赖

## 反向代理配置（Nginx 示例）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 资源监控

查看容器资源使用情况：
```bash
docker stats gods-bookmark
```

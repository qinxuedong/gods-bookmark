# Docker 镜像发布指南

本指南说明如何将 God's Bookmark 的 Docker 镜像发布到容器注册表。

## 发布方式

### 方式一：自动发布（推荐）

使用 GitHub Actions 自动构建和发布镜像。当您创建 release 或推送版本标签时，会自动触发构建。

#### 支持的注册表

1. **GitHub Container Registry (ghcr.io)** - 自动配置，无需额外设置
2. **Docker Hub** - 需要配置凭证（可选）

#### 自动触发条件

- 推送版本标签（如 `v1.0.0`）
- 发布 GitHub Release
- 手动触发（在 Actions 页面）

#### 配置 Docker Hub（可选）

如果您想同时发布到 Docker Hub，需要设置以下 GitHub Secrets：

1. 访问：`https://github.com/qinxuedong/gods-bookmark/settings/secrets/actions`
2. 添加以下 Secrets：
   - `DOCKERHUB_USERNAME`: 您的 Docker Hub 用户名
   - `DOCKERHUB_TOKEN`: 您的 Docker Hub Access Token（在 Docker Hub → Account Settings → Security 中创建）

### 方式二：手动发布

#### 发布到 GitHub Container Registry

```bash
# 1. 登录到 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 2. 构建镜像
docker build -t ghcr.io/qinxuedong/gods-bookmark:latest .
docker build -t ghcr.io/qinxuedong/gods-bookmark:v1.0.0 .

# 3. 推送镜像
docker push ghcr.io/qinxuedong/gods-bookmark:latest
docker push ghcr.io/qinxuedong/gods-bookmark:v1.0.0
```

#### 发布到 Docker Hub

```bash
# 1. 登录到 Docker Hub
docker login

# 2. 构建镜像
docker build -t qinxuedong/gods-bookmark:latest .
docker build -t qinxuedong/gods-bookmark:v1.0.0 .

# 3. 推送镜像
docker push qinxuedong/gods-bookmark:latest
docker push qinxuedong/gods-bookmark:v1.0.0
```

## 使用发布的镜像

### 使用 GitHub Container Registry 镜像

```bash
# 拉取镜像
docker pull ghcr.io/qinxuedong/gods-bookmark:latest

# 创建数据目录并设置权限（重要！）
mkdir -p data backups
chmod -R 755 data backups

# 运行容器
# 注意：默认管理员账号为：admin
docker run -d \
  --name gods-bookmark \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  -e ADMIN_PASSWORD=your_password \
  -e ADMIN_TOKEN=your_token \
  ghcr.io/qinxuedong/gods-bookmark:latest
```

### 使用 Docker Hub 镜像

```bash
# 拉取镜像
docker pull qinxuedong/gods-bookmark:latest

# 创建数据目录并设置权限（重要！）
mkdir -p data backups
chmod -R 755 data backups

# 运行容器
# 注意：默认管理员账号为：admin
docker run -d \
  --name gods-bookmark \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  -e ADMIN_PASSWORD=your_password \
  -e ADMIN_TOKEN=your_token \
  qinxuedong/gods-bookmark:latest
```

### 更新 docker-compose.yml

您也可以修改 `docker-compose.yml` 使用发布的镜像：

**重要：首次部署前请先创建数据目录并设置权限：**
```bash
mkdir -p data backups
chmod -R 755 data backups
```

**配置环境变量：**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，修改 ADMIN_PASSWORD 和 ADMIN_TOKEN
# 注意：默认管理员账号为：admin
nano .env
```

**docker-compose.yml 配置：**
```yaml
version: '3.8'

services:
  gods-bookmark:
    # 使用 GitHub Container Registry 镜像
    image: ghcr.io/qinxuedong/gods-bookmark:latest
    # 或使用 Docker Hub 镜像
    # image: qinxuedong/gods-bookmark:latest
    
    container_name: gods-bookmark
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    env_file:
      # 从 .env 文件加载环境变量
      - .env
    networks:
      - gods-bookmark-network

networks:
  gods-bookmark-network:
    driver: bridge
```

**启动服务：**
```bash
docker-compose up -d
```

## 镜像标签说明

- `latest` - 最新版本
- `v1.0.0` - 特定版本
- `1.0.0` - 版本号（不带 v）
- `1.0` - 主版本号
- `1` - 主版本

## 多架构支持

GitHub Actions 工作流会自动构建以下架构的镜像：
- `linux/amd64` - Intel/AMD 64位
- `linux/arm64` - ARM 64位（适用于树莓派、NAS 等）

## 验证镜像

发布后，可以通过以下方式验证：

```bash
# 检查镜像信息
docker inspect ghcr.io/qinxuedong/gods-bookmark:latest

# 测试运行
docker run --rm ghcr.io/qinxuedong/gods-bookmark:latest node --version
```

## 常见问题

### 1. 部署时的权限问题 ⚠️ **重要！**

**症状**：容器启动后出现 `SQLITE_CANTOPEN` 或 `Permission denied` 错误

**原因**：90% 都是因为数据目录权限不正确

**解决步骤**：
```bash
# 1. 停止容器
docker-compose down

# 2. 创建数据目录（如果不存在）
mkdir -p data backups

# 3. 设置目录权限（必须执行！）
chmod -R 755 data backups

# 4. 如果需要，设置所有者（根据容器内用户ID）
sudo chown -R 1000:1000 data backups

# 5. 重新启动容器
docker-compose up -d
```

**验证**：检查目录权限
```bash
ls -la data
# 应该显示 drwxr-xr-x 或 drwxrwxr-x
```

### 2. 发布镜像时的权限问题

如果发布到 GitHub Container Registry 时遇到权限问题：
- 确保仓库设置为公开，或
- 在仓库设置中启用 "Packages" 权限

### 3. Docker Hub 推送失败

如果 Docker Hub 推送失败：
- 检查 Docker Hub 凭证是否正确
- 确认镜像名称格式正确（用户名/仓库名）
- 工作流已设置为 `continue-on-error: true`，不会影响 GitHub Container Registry 的发布

### 4. 镜像大小优化

当前镜像基于 `node:lts-alpine`，已经过优化。如需进一步优化：
- 使用多阶段构建
- 清理不必要的文件
- 使用 `.dockerignore` 排除不需要的文件

## 下一步

1. **创建 Release**：在 GitHub 上创建新的 release，会自动触发镜像构建
2. **添加标签**：推送版本标签（如 `git tag v1.0.0 && git push origin v1.0.0`）
3. **手动触发**：在 GitHub Actions 页面手动触发工作流

## 参考链接

- [GitHub Container Registry 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Hub 文档](https://docs.docker.com/docker-hub/)
- [Docker Buildx 文档](https://docs.docker.com/buildx/)

# 使用 Node.js LTS 版本（Alpine Linux，轻量级）
FROM node:lts-alpine

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖（sqlite3 需要）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装生产依赖（不安装 devDependencies）
RUN npm ci --only=production && \
    npm cache clean --force

# 复制应用代码（.dockerignore 会排除 node_modules）
COPY . .

# 创建必要的目录并设置权限
RUN mkdir -p data backups && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口（支持局域网和公网访问）
EXPOSE 3000

# 设置环境变量为生产模式
ENV NODE_ENV=production \
    PORT=3000

# 健康检查（可选，用于 Docker 健康监控）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/check-auth', (r) => {process.exit(r.statusCode === 200 || r.statusCode === 401 ? 0 : 1)})"

# 启动命令（明确指定 node 命令）
CMD ["node", "server.js"]

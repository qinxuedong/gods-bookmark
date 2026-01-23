FROM node:20-bookworm-slim

WORKDIR /app

# 安装 sqlite3 编译依赖（glibc 环境，稳定）
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN useradd -m -u 1001 nodejs

COPY package*.json ./

# 关键：这里基本不会再炸
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p data backups && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000

CMD ["node", "server.js"]

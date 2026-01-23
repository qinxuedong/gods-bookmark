FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./

ENV npm_config_build_from_source=true

RUN npm ci --only=production && \
    npm cache clean --force

COPY . .

RUN mkdir -p data backups && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/check-auth', r => process.exit([200,401].includes(r.statusCode)?0:1))"

CMD ["node", "server.js"]

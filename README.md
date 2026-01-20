# God's Bookmark

一个现代化的个人书签管理仪表板，具有美观的黑洞背景动画、实时天气显示、待办事项管理和浏览器扩展同步功能。

## 功能特点

- 📚 **书签管理**：分类管理书签，支持导入/导出
- 🌐 **浏览器扩展**：自动同步浏览器书签到网站
- 📝 **待办事项**：便签式待办管理
- 🌍 **世界时间**：显示当前时间和农历
- 🌤️ **天气信息**：实时天气显示
- 📊 **点击统计**：追踪最常用的书签
- 🔒 **管理员认证**：保护数据安全
- 🎨 **现代UI**：黑洞背景动画，玻璃态设计

## 技术栈

- **后端**：Node.js + Express
- **数据库**：SQLite3
- **前端**：原生 JavaScript (ES6+)
- **样式**：CSS3 (自定义变量、Grid、Flexbox)
- **部署**：Docker 支持

## 快速开始

### 环境要求

- Node.js >= 14.0
- npm >= 6.0

### 安装

1. 克隆仓库
```bash
git clone <repository-url>
cd "God's Bookmark"
```

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 默认配置

- **管理员密码**：`admin`（生产环境请通过环境变量修改）
- **端口**：`3000`（可通过环境变量 `PORT` 修改）

## 环境变量

创建 `.env` 文件（可选，用于生产环境）：

```env
PORT=3000
ADMIN_PASSWORD=your_secure_password
ADMIN_TOKEN=your_random_token
NODE_ENV=production
```

## 项目结构

```
God's Bookmark/
├── server.js              # Express 后端服务器
├── database.js            # SQLite 数据库操作
├── package.json           # 项目依赖配置
├── Dockerfile             # Docker 构建配置
├── index.html             # 主页面
├── login.html             # 登录页面
├── css/
│   └── style.css          # 主样式文件
├── js/
│   ├── app.js             # 主应用逻辑
│   ├── data-manager.js    # 数据管理（API 调用）
│   ├── blackhole.js       # 黑洞背景动画
│   ├── datetime-weather.js # 时间天气模块
│   ├── dashboard-layout.js # 仪表板布局管理
│   └── login.js           # 登录逻辑
├── extension/             # 浏览器扩展
│   ├── manifest.json      # 扩展清单
│   ├── background.js      # 后台脚本
│   ├── popup.html/js      # 弹出窗口
│   ├── options.html/js    # 选项页面
│   └── content.js         # 内容脚本
└── data/                  # 数据目录（自动创建）
    └── database.sqlite    # SQLite 数据库文件
```

## API 端点

### 认证
- `POST /api/login` - 管理员登录
- `POST /api/logout` - 登出
- `GET /api/check-auth` - 检查登录状态

### 书签
- `GET /api/bookmarks` - 获取所有书签
- `POST /api/bookmarks` - 保存书签（需认证）
- `POST /api/bookmark/click` - 记录书签点击
- `POST /api/bookmark/sync` - 同步单个书签（扩展用）
- `POST /api/bookmark/sync-all` - 批量同步书签（扩展用）
- `GET /api/bookmark/top` - 获取热门书签

### 配置
- `GET /api/config` - 获取仪表板配置
- `POST /api/config` - 保存配置（需认证）

### 待办事项
- `GET /api/todos` - 获取待办事项（需认证）
- `POST /api/todos` - 保存待办事项（需认证）

## 浏览器扩展

项目包含 Chrome/Edge 浏览器扩展，可自动同步浏览器书签到网站。

### 安装扩展

1. 打开 Chrome/Edge 浏览器
2. 访问 `chrome://extensions/` 或 `edge://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目中的 `extension` 文件夹

### 使用扩展

1. 安装后点击扩展图标
2. 配置服务器地址（默认：`http://localhost:3000`）
3. 点击"测试连接"确保服务器运行
4. 勾选"启用自动同步"
5. 点击"立即同步所有书签"进行初始同步

详细说明请查看 [extension/README.md](extension/README.md)

## Docker 部署

### 构建镜像

```bash
docker build -t gods-bookmark .
```

### 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e ADMIN_PASSWORD=your_password \
  -e ADMIN_TOKEN=your_token \
  --name gods-bookmark \
  gods-bookmark
```

### Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - ADMIN_PASSWORD=your_password
      - ADMIN_TOKEN=your_token
      - NODE_ENV=production
```

运行：
```bash
docker-compose up -d
```

## 开发说明

### 本地开发

1. 启动开发服务器：
```bash
npm start
```

2. 访问 `http://localhost:3000`

3. 登录管理员账户（默认密码：`admin`）

### 数据备份

数据库文件位于 `data/database.sqlite`，建议定期备份此文件。

### 安全注意事项

⚠️ **生产环境部署前必须：**

1. 修改默认管理员密码（设置 `ADMIN_PASSWORD` 环境变量）
2. 修改默认 token（设置 `ADMIN_TOKEN` 环境变量）
3. 配置 HTTPS（启用 cookie `secure` 标志）
4. 设置数据目录的持久化卷（Docker）
5. 配置防火墙规则

## 常见问题

### 服务器无法启动

- 检查端口 3000 是否被占用
- 确认 Node.js 版本 >= 14.0
- 检查 `data` 目录是否存在且可写

### 扩展无法连接服务器

- 确认服务器正在运行（`npm start`）
- 检查服务器地址配置是否正确
- 确认防火墙允许本地连接

### 登录失败

- 确认使用正确的密码（默认：`admin`）
- 检查浏览器控制台是否有错误
- 确认服务器正在运行

## 许可证

本项目采用 MIT 许可证。

## 作者

God's Bookmark 项目

---

**注意**：这是一个个人项目，适合自托管使用。在生产环境部署前，请务必修改默认密码和配置安全设置。

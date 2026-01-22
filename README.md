# God's Bookmark

一个现代化的个人书签管理仪表板，具有美观的黑洞背景动画、待办事项管理、多用户系统和自动备份功能。

## 功能特点

- 📚 **书签管理**：分类管理书签，支持导入/导出（HTML格式）
- 🌐 **浏览器扩展**：自动同步浏览器书签到网站
- 📝 **待办事项**：便签式待办管理，支持图片
- 🌍 **世界时间**：显示当前时间和农历
- 📊 **点击统计**：追踪最常用的书签（Top10）
- 👥 **多用户系统**：支持多用户，数据隔离，管理员可管理用户
- 💾 **自动备份**：支持本地/NAS备份，定时备份（Cron表达式）
- 🔍 **全局搜索**：快速搜索书签和功能
- 🔒 **用户认证**：基于Cookie的认证系统
- 🎨 **现代UI**：黑洞背景动画，玻璃态设计，支持暗色/亮色主题

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

- **管理员用户名**：`admin`
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
│   ├── user-manager.js    # 用户管理模块
│   ├── backup-manager.js  # 备份管理模块
│   ├── blackhole.js       # 黑洞背景动画
│   ├── datetime-weather.js # 时间日期模块
│   ├── dashboard-layout.js # 仪表板布局管理
│   └── login.js           # 登录逻辑
├── extension/             # 浏览器扩展
│   ├── manifest.json      # 扩展清单
│   ├── background.js      # 后台脚本
│   ├── popup.html/js      # 弹出窗口
│   ├── options.html/js    # 选项页面
│   ├── content.js         # 内容脚本
│   ├── content-search.js  # 全局搜索脚本
│   └── README.md          # 扩展说明文档
├── data/                  # 数据目录（自动创建）
│   └── database.sqlite    # SQLite 数据库文件
└── backups/               # 备份目录（自动创建）
    └── backup_*_*/        # 备份文件（按用户和时间戳组织）
```

## API 端点

### 认证（旧版，向后兼容）
- `POST /api/login` - 管理员登录（旧版）
- `POST /api/logout` - 登出（旧版）
- `GET /api/check-auth` - 检查登录状态（旧版）

### 用户管理
- `POST /api/users/login` - 用户登录
- `POST /api/users/logout` - 用户登出
- `GET /api/users/check-auth` - 检查用户登录状态
- `GET /api/users` - 获取用户列表（需管理员权限）
- `POST /api/users` - 创建用户（需管理员权限）
- `PUT /api/users/:id` - 更新用户（管理员可更新任何用户，普通用户只能更新自己的密码）
- `DELETE /api/users/:id` - 删除用户（需管理员权限）

### 书签
- `GET /api/bookmarks` - 获取当前用户的所有书签（需认证）
- `POST /api/bookmarks` - 保存书签（需认证）
- `POST /api/bookmark/click` - 记录书签点击（需认证）
- `POST /api/bookmark/sync` - 同步单个书签（扩展用）
- `POST /api/bookmark/sync-all` - 批量同步书签（扩展用）
- `POST /api/bookmark/sync-folder` - 同步文件夹操作（扩展用）
- `GET /api/bookmark/check-exists` - 检查书签是否存在（扩展用）
- `GET /api/bookmark/get-all` - 获取所有书签（扩展用）
- `GET /api/bookmark/top` - 获取热门书签（需认证）
- `DELETE /api/bookmark/top/all` - 清除所有用户的Top10数据（需管理员权限）

### 配置
- `GET /api/config` - 获取当前用户的仪表板配置（需认证）
- `POST /api/config` - 保存配置（需认证）

### 待办事项
- `GET /api/todos` - 获取当前用户的待办事项（需认证）
- `POST /api/todos` - 保存待办事项（需认证）

### 备份管理
- `GET /api/backup/configs` - 获取备份配置列表（需认证）
- `POST /api/backup/configs` - 创建备份配置（需认证）
- `PUT /api/backup/configs/:id` - 更新备份配置（需认证）
- `DELETE /api/backup/configs/:id` - 删除备份配置（需认证）
- `POST /api/backup/run/:id` - 执行手动备份（需认证）
- `GET /api/backup/history` - 获取备份历史（需认证）
- `POST /api/backup/restore/:id` - 恢复备份（需认证）
- `POST /api/backup/import` - 导入备份文件（需认证）

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

## 备份功能

### 备份类型

目前支持**本地/NAS备份**（仅管理员可配置）：

- 备份文件保存到服务器本地目录或挂载的NAS路径
- 支持定时备份（Cron表达式）
- 备份文件按用户和时间戳组织
- 书签数据同时备份为JSON和HTML格式

### 配置备份

1. 登录系统，进入**控制中心** → **备份管理**
2. 点击**添加备份配置**
3. 选择备份类型：**本地/NAS**
4. 填写备份路径（绝对路径或相对路径）
5. 选择定时计划（可选）：
   - 快捷选择：每天/每周/每月/每3个月
   - 自定义Cron表达式（参考 [BACKUP_CRON_GUIDE.md](BACKUP_CRON_GUIDE.md)）
6. 启用配置并保存

### 备份文件格式

备份文件按功能分类存储：
- `bookmarks.json` - 书签数据（JSON格式）
- `bookmarks.html` - 书签数据（HTML格式，可导入浏览器）
- `todos.json` - 待办事项数据
- `settings.json` - 用户配置数据

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
  -v $(pwd)/backups:/app/backups \
  -e ADMIN_PASSWORD=your_password \
  -e ADMIN_TOKEN=your_token \
  -e NODE_ENV=production \
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
      - ./backups:/app/backups
    environment:
      - ADMIN_PASSWORD=your_password
      - ADMIN_TOKEN=your_token
      - NODE_ENV=production
```

运行：
```bash
docker-compose up -d
```

## 数据存储

### 数据库结构

- `users` - 用户表（用户名、密码哈希、角色）
- `user_data` - 用户数据表（每个用户的数据隔离存储）
- `backup_configs` - 备份配置表
- `backup_history` - 备份历史表
- `app_data` - 应用数据表（向后兼容，用于旧数据）

### 数据目录

- `data/database.sqlite` - SQLite数据库文件
- `backups/` - 备份文件目录（自动创建）

## 安全注意事项

⚠️ **生产环境部署前必须：**

1. 修改默认管理员密码（设置 `ADMIN_PASSWORD` 环境变量）
2. 修改默认 token（设置 `ADMIN_TOKEN` 环境变量）
3. 配置 HTTPS（启用 cookie `secure` 标志）
4. 设置数据目录的持久化卷（Docker）
5. 配置防火墙规则
6. 定期备份数据库文件

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

- 确认使用正确的用户名和密码（默认：admin/admin）
- 检查浏览器控制台是否有错误
- 确认服务器正在运行

### 备份失败

- 检查备份路径是否存在且可写
- 确认备份路径权限正确（Node.js进程需要有读写权限）
- 查看服务器日志了解详细错误信息

## 许可证

本项目采用 MIT 许可证。

## 作者

God's Bookmark 项目

---

**注意**：这是一个个人项目，适合自托管使用。在生产环境部署前，请务必修改默认密码和配置安全设置。

# God's Bookmark

一个现代化的个人书签管理仪表板，支持浏览器扩展自动同步、多用户系统、待办事项管理和自动备份功能。

## 适合人群 / 使用场景

**适合：**
- 需要集中管理浏览器书签的个人用户
- 希望自托管书签数据，保护隐私的用户
- 需要在多设备间同步书签的用户
- 需要管理待办事项和常用链接的用户
- 希望部署在 NAS 或 Docker 环境中的用户

**不适合：**
- 需要云端同步服务（如 Chrome Sync）的用户
- 需要复杂权限管理的企业用户
- 需要移动端原生应用的用户

## 核心功能

- **书签管理**：分类管理书签，支持导入/导出（HTML格式）
- **浏览器扩展**：自动同步浏览器书签到网站（Chrome/Edge 扩展）
- **待办事项**：便签式待办管理，支持图片
- **世界时间**：显示当前时间和农历
- **点击统计**：追踪最常用的书签（Top10）
- **多用户系统**：支持多用户，数据隔离，管理员可管理用户
- **自动备份**：支持本地/NAS备份，定时备份（Cron表达式）
- **全局搜索**：快速搜索书签和功能
- **用户认证**：基于Cookie的认证系统
- **现代UI**：黑洞背景动画，玻璃态设计，支持暗色/亮色主题

## 技术栈

- **后端**：Node.js + Express
- **数据库**：SQLite3
- **前端**：原生 JavaScript (ES6+)
- **样式**：CSS3 (自定义变量、Grid、Flexbox)
- **部署**：Docker 支持

## 快速开始

### 方式一：Node.js 运行

#### 环境要求

- Node.js >= 14.0
- npm >= 6.0

#### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/qinxuedong/gods-bookmark.git
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

#### 首次启动

首次启动时，系统会自动创建默认管理员账户：
- **用户名**：`admin`
- **密码**：`admin`

**重要**：首次登录后，请立即修改管理员密码。生产环境部署前，必须通过环境变量设置强密码。

### 方式二：Docker 部署（推荐用于 NAS）

#### 使用 Docker Compose

1. 修改 `docker-compose.yml` 中的环境变量：
```yaml
environment:
  - ADMIN_PASSWORD=your_secure_password_here
  - ADMIN_TOKEN=your_random_token_here
```

2. 启动服务
```bash
docker-compose up -d
```

详细部署说明请查看 [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)

## 环境变量

创建 `.env` 文件（可选，用于生产环境）：

```env
PORT=3000
ADMIN_PASSWORD=your_secure_password
ADMIN_TOKEN=your_random_token
NODE_ENV=production
```
镜像更新

当有新版本发布时：

docker pull ghcr.io/qinxuedong/gods-bookmark:latest
docker compose up -d



## 浏览器扩展

项目包含 Chrome/Edge 浏览器扩展，可自动同步浏览器书签到网站。这是项目的核心功能之一。

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

## 项目结构

```
God's Bookmark/
├── server.js              # Express 后端服务器
├── database.js            # SQLite 数据库操作
├── package.json           # 项目依赖配置
├── Dockerfile             # Docker 构建配置
├── docker-compose.yml     # Docker Compose 配置
├── index.html             # 主页面
├── login.html             # 登录页面
├── css/                   # 样式文件
├── js/                    # 前端 JavaScript 模块
├── extension/             # 浏览器扩展（核心功能）
├── data/                  # 数据目录（自动创建）
└── backups/               # 备份目录（自动创建）
```

## 文档索引

- [API.md](API.md) - API 端点完整文档
- [DATA_MODEL.md](DATA_MODEL.md) - 数据模型和数据库结构说明
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Docker 部署详细指南
- [BACKUP_CRON_GUIDE.md](BACKUP_CRON_GUIDE.md) - 备份 Cron 表达式使用指南
- [extension/README.md](extension/README.md) - 浏览器扩展使用说明

## 安全注意事项

**生产环境部署前必须：**

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

- 首次启动使用默认账号：`admin` / `admin`
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

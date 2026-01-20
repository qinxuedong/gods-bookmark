# 多用户和自动备份功能实现指南

## 已完成的工作

### 1. 数据库结构更新
- ✅ 已更新 `database.js`，添加了以下表：
  - `users` - 用户表（用户名、密码哈希、角色）
  - `user_data` - 用户数据表（每个用户的数据隔离存储）
  - `backup_configs` - 备份配置表
  - `backup_history` - 备份历史表

### 2. 前端JavaScript模块
- ✅ 已创建 `js/user-manager.js` - 用户管理模块
- ✅ 已创建 `js/backup-manager.js` - 备份管理模块

### 3. 依赖包
- ✅ 已更新 `package.json`，添加了所需依赖：
  - `bcrypt` - 密码加密
  - `ali-oss` - 阿里云OSS
  - `node-cron` - 定时任务
  - `archiver` - 文件压缩

## 需要完成的工作

### 1. 安装依赖
```bash
npm install bcrypt ali-oss node-cron archiver
```

### 2. 修复database.js中的admin用户创建逻辑

在 `database.js` 中，admin用户创建需要使用同步方式，因为bcrypt在初始化时可能还未加载。

### 3. 在server.js中添加用户管理API

需要在 `server.js` 中添加以下API端点：

#### 用户管理API
- `POST /api/users/login` - 用户登录
- `POST /api/users/logout` - 用户登出
- `GET /api/users/check-auth` - 检查登录状态
- `GET /api/users` - 获取用户列表（管理员）
- `POST /api/users` - 创建用户（管理员）
- `PUT /api/users/:id` - 更新用户（管理员）
- `DELETE /api/users/:id` - 删除用户（管理员）

#### 数据隔离
所有数据API需要根据当前登录用户获取数据：
- `GET /api/bookmarks` - 根据userId获取
- `POST /api/bookmarks` - 根据userId保存
- `GET /api/config` - 根据userId获取
- `POST /api/config` - 根据userId保存
- `GET /api/todos` - 根据userId获取
- `POST /api/todos` - 根据userId保存

### 4. 在server.js中添加备份API

- `GET /api/backup/configs` - 获取备份配置列表
- `POST /api/backup/configs` - 创建备份配置
- `PUT /api/backup/configs/:id` - 更新备份配置
- `DELETE /api/backup/configs/:id` - 删除备份配置
- `POST /api/backup/run/:id` - 执行手动备份
- `GET /api/backup/history` - 获取备份历史
- `POST /api/backup/restore/:id` - 恢复备份

### 5. 实现备份功能

#### 本地/NAS备份
- 将用户数据导出为JSON文件
- 压缩为zip文件
- 保存到指定目录

#### 阿里云OSS备份
- 使用ali-oss SDK上传文件
- 配置AccessKey和SecretKey

#### 百度云备份
- 使用百度云API上传文件
- 配置AccessKey和SecretKey

### 6. 实现自动备份调度器

使用 `node-cron` 实现定时备份任务：
- 每天凌晨执行
- 每周执行
- 每月执行
- 自定义cron表达式

### 7. 创建用户管理界面

在设置菜单中添加：
- 用户列表
- 创建用户表单
- 编辑用户表单
- 删除用户功能

### 8. 创建备份配置界面

在设置菜单中添加：
- 备份配置列表
- 添加备份配置表单（支持选择类型：本地/NAS/阿里云/百度云）
- 编辑备份配置
- 删除备份配置
- 手动执行备份
- 查看备份历史

### 9. 更新登录界面

- 修改登录逻辑使用新的用户管理API
- 添加"记住我"功能
- 添加注册功能（如果需要）

### 10. 更新数据访问逻辑

- 修改 `data-manager.js` 使其根据当前用户ID获取数据
- 确保所有数据操作都包含用户ID

## 注意事项

1. **安全性**：
   - 密码必须使用bcrypt加密
   - API需要身份验证
   - 管理员操作需要权限检查
   - 数据隔离必须严格

2. **向后兼容**：
   - 对于现有数据，需要创建默认admin用户
   - 迁移现有数据到user_data表

3. **备份安全**：
   - 云存储凭据需要加密存储
   - 备份文件需要加密（可选）
   - 定期清理旧备份

4. **性能**：
   - 大量用户时考虑分页
   - 备份操作异步执行
   - 使用队列处理备份任务

## 实现步骤建议

1. 首先实现用户管理系统和API
2. 更新所有数据API以支持用户隔离
3. 实现基础备份功能（本地备份）
4. 添加云存储集成
5. 实现自动备份调度器
6. 创建用户界面
7. 测试和优化

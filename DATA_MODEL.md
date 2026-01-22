# 数据模型文档

本文档描述了 God's Bookmark 的数据存储结构和用途。

## 数据库概述

God's Bookmark 使用 SQLite3 作为数据库，数据库文件位于 `data/database.sqlite`。

## 数据表结构

### users 表

**用途**：存储用户账户信息

**字段说明**：
- `id` - 用户ID（主键）
- `username` - 用户名（唯一）
- `password_hash` - 密码哈希值（bcrypt）
- `role` - 用户角色（`admin` 或 `user`）
- `created_at` - 创建时间
- `updated_at` - 更新时间

**说明**：
- 管理员账户拥有系统管理权限
- 普通用户只能访问和管理自己的数据
- 密码使用 bcrypt 加密存储

### user_data 表

**用途**：存储每个用户的数据（书签、待办事项、配置等）

**字段说明**：
- `id` - 记录ID（主键）
- `user_id` - 用户ID（外键关联 users 表）
- `data_type` - 数据类型（`bookmarks`、`todos`、`config` 等）
- `data` - 数据内容（JSON 格式）
- `updated_at` - 更新时间

**说明**：
- 每个用户的数据完全隔离
- 数据以 JSON 格式存储，便于扩展
- 支持多种数据类型：书签、待办事项、用户配置等

### backup_configs 表

**用途**：存储用户的备份配置

**字段说明**：
- `id` - 配置ID（主键）
- `user_id` - 用户ID（外键关联 users 表）
- `type` - 备份类型（`local` 等）
- `path` - 备份路径
- `cron` - Cron 表达式（定时备份计划）
- `enabled` - 是否启用
- `created_at` - 创建时间
- `updated_at` - 更新时间

**说明**：
- 每个用户可以配置多个备份方案
- 支持定时自动备份（Cron 表达式）
- 备份路径可以是本地目录或 NAS 挂载路径

### backup_history 表

**用途**：记录备份历史

**字段说明**：
- `id` - 记录ID（主键）
- `user_id` - 用户ID（外键关联 users 表）
- `config_id` - 备份配置ID（外键关联 backup_configs 表）
- `backup_path` - 备份文件路径
- `backup_size` - 备份文件大小（字节）
- `status` - 备份状态（`success`、`failed`）
- `error_message` - 错误信息（如果失败）
- `created_at` - 备份时间

**说明**：
- 记录每次备份的详细信息
- 可用于备份恢复和审计
- 失败记录包含错误信息便于排查

### app_data 表

**用途**：应用数据表（向后兼容，用于旧版本数据）

**字段说明**：
- `id` - 记录ID（主键）
- `key` - 数据键
- `value` - 数据值（JSON 格式）
- `updated_at` - 更新时间

**说明**：
- 用于向后兼容旧版本数据
- 新版本主要使用 `user_data` 表

## 数据存储位置

### 数据库文件

- **位置**：`data/database.sqlite`
- **说明**：SQLite 数据库文件，包含所有表结构数据

### 备份文件

- **位置**：`backups/` 目录
- **结构**：`backups/{username}/backup_{timestamp}/`
- **文件**：
  - `bookmarks.json` - 书签数据（JSON 格式）
  - `bookmarks.html` - 书签数据（HTML 格式，可导入浏览器）
  - `todos.json` - 待办事项数据
  - `settings.json` - 用户配置数据

## 数据隔离

### 用户数据隔离

- 每个用户的数据完全隔离
- `user_data` 表通过 `user_id` 字段区分用户数据
- 用户只能访问和管理自己的数据
- 管理员可以访问所有用户数据

### 备份数据隔离

- 备份文件按用户名组织目录
- 每个用户的备份文件独立存储
- 备份历史记录关联用户ID

## 数据格式

### 书签数据格式

```json
{
  "bookmarks": {
    "分类名称": [
      {
        "name": "书签名称",
        "url": "https://example.com",
        "icon": "图标URL"
      }
    ]
  }
}
```

### 待办事项数据格式

```json
{
  "todos": [
    {
      "id": "唯一ID",
      "content": "待办内容",
      "image": "图片URL（可选）",
      "created_at": "创建时间",
      "updated_at": "更新时间"
    }
  ]
}
```

### 用户配置数据格式

```json
{
  "theme": "dark|light",
  "layout": {
    "bookmarks": { /* 书签模块布局 */ },
    "todos": { /* 待办模块布局 */ }
  }
}
```

## 数据迁移

### 从旧版本迁移

- 系统启动时自动检测旧版本数据
- 自动迁移到新的 `user_data` 表结构
- 保留 `app_data` 表用于兼容性

### 备份和恢复

- 支持导出 JSON 和 HTML 格式的书签
- 支持从备份文件恢复数据
- 备份文件包含完整的数据结构

## 数据安全

### 密码安全

- 密码使用 bcrypt 加密存储
- 不存储明文密码
- 支持密码修改功能

### 数据备份

- 支持定时自动备份
- 备份文件包含完整数据
- 支持备份恢复功能

### 数据访问控制

- 基于 Cookie 的认证机制
- 用户数据隔离
- 管理员权限控制

## 注意事项

1. **数据库文件**：SQLite 数据库文件需要定期备份
2. **备份路径**：确保备份路径有足够的磁盘空间
3. **权限**：确保数据库文件和备份目录有正确的读写权限
4. **数据迁移**：升级时注意数据迁移和兼容性

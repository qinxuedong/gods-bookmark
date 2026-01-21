# 备份功能部署教程

本文档详细介绍了如何为"上帝的指引"书签系统配置和使用三种备份方式：本地/NAS备份、阿里云OSS备份和百度云BOS备份。

---

## 目录

1. [准备工作](#准备工作)
2. [本地/NAS备份配置](#本地nas备份配置)
3. [阿里云OSS备份配置](#阿里云oss备份配置)
4. [百度云BOS备份配置](#百度云bos备份配置)
5. [定时备份设置](#定时备份设置)
6. [手动备份与恢复](#手动备份与恢复)
7. [故障排查](#故障排查)
8. [安全建议](#安全建议)

---

## 准备工作

### 1. 确保依赖已安装

系统已包含以下备份相关依赖：

```bash
npm install ali-oss node-cron archiver
```

**注意**：百度云备份需要额外安装百度云BOS SDK（详见下文）。

### 2. 了解备份功能

- **本地/NAS备份**：仅管理员可配置，备份文件保存到服务器本地或挂载的NAS路径
- **阿里云OSS备份**：所有用户可配置，需要阿里云账号和OSS存储桶
- **百度云BOS备份**：所有用户可配置，需要百度云账号和BOS存储桶

### 3. 备份文件格式

所有备份文件均为JSON格式，包含用户的完整数据：
- 书签数据
- 用户配置
- 待办事项
- 监控组件数据

备份文件名格式：`backup_{userId}_{timestamp}.json`

---

## 本地/NAS备份配置

### 适用场景

- 服务器本地备份
- 挂载的NAS共享目录
- 局域网内的网络存储

### 配置步骤

#### 1. 确保备份目录可访问

**Linux/Mac系统：**

```bash
# 创建备份目录（如果不存在）
mkdir -p /path/to/backup/directory

# 确保目录权限正确（Node.js进程需要有读写权限）
chmod 755 /path/to/backup/directory

# 如果使用NAS挂载点
mount -t nfs nas-server:/share /mnt/nas-backup
```

**Windows系统：**

```powershell
# 创建备份目录
New-Item -ItemType Directory -Path "D:\Backups\GodsBookmark" -Force

# 或使用网络映射驱动器
net use Z: \\NAS-SERVER\Backup
```

#### 2. 在系统中添加备份配置

1. 登录系统，进入**设置面板**（点击右上角设置图标）
2. 点击**全局设置**下的**备份管理**按钮
3. 点击**添加备份配置**
4. 选择备份类型：**本地/NAS**
5. 填写配置信息：
   - **备份路径**：输入完整的目录路径
     - Linux/Mac示例：`/home/user/backups` 或 `/mnt/nas-backup`
     - Windows示例：`D:\Backups\GodsBookmark` 或 `Z:\Backup`
     - 相对路径示例：`./backups`（相对于项目根目录）
6. 选择**启用状态**：勾选以启用此备份配置
7. 选择**定时计划**：
   - 每天：每天凌晨2点执行
   - 每周：每周日凌晨2点执行
   - 每月：每月1日凌晨2点执行
   - 每3个月：每3个月的1日凌晨2点执行
8. 点击**保存**

#### 3. 验证配置

1. 在备份配置列表中，点击**立即备份**按钮
2. 查看备份历史，确认备份状态为**成功**
3. 检查备份目录，确认文件已生成

### 路径配置示例

| 系统 | 路径示例 | 说明 |
|------|---------|------|
| Linux | `/var/backups/gods-bookmark` | 系统备份目录 |
| Linux | `/mnt/nas-backup/bookmarks` | NAS挂载点 |
| Mac | `/Users/username/Backups` | 用户目录 |
| Windows | `D:\Backups\GodsBookmark` | 本地磁盘 |
| Windows | `\\192.168.1.100\backup` | 网络共享（需要先映射） |
| 相对路径 | `./backups` | 项目目录下的backups文件夹 |

### 注意事项

⚠️ **权限问题**：
- 确保Node.js进程对目标目录有读写权限
- NAS挂载时确保挂载点在服务启动时可用
- Windows网络共享需要提供正确的凭据

⚠️ **磁盘空间**：
- 定期清理旧备份文件
- 建议设置备份保留策略（手动清理或使用脚本）

⚠️ **安全**：
- 本地备份文件包含敏感数据，请设置适当的文件权限
- 建议使用加密文件系统或定期加密备份文件

---

## 阿里云OSS备份配置

### 适用场景

- 云存储备份
- 跨地域容灾
- 需要高可用性的备份方案

### 前置条件

1. **阿里云账号**：注册并实名认证的阿里云账号
2. **开通OSS服务**：登录阿里云控制台，开通对象存储OSS服务
3. **创建存储桶（Bucket）**：在OSS控制台创建用于备份的存储桶

### 创建OSS存储桶步骤

#### 1. 登录阿里云控制台

访问 [阿里云控制台](https://ecs.console.aliyun.com/)

#### 2. 开通OSS服务

1. 进入**产品与服务** → **对象存储OSS**
2. 如果未开通，点击**立即开通**
3. 选择合适的计费方式（按量付费或包年包月）

#### 3. 创建存储桶

1. 在OSS控制台，点击**Bucket列表** → **创建Bucket**
2. 填写配置：
   - **Bucket名称**：例如 `gods-bookmark-backup`（全局唯一）
   - **地域**：选择合适的地域（例如：华东1-杭州）
   - **存储类型**：标准存储（推荐）或低频访问存储
   - **读写权限**：私有（推荐）
   - **服务器端加密**：可选（建议开启）
3. 点击**确定**创建

#### 4. 创建访问密钥（AccessKey）

⚠️ **安全提示**：AccessKey具有账户权限，请妥善保管，不要泄露。

1. 鼠标悬停右上角头像，选择**AccessKey管理**
2. 如果首次使用，需要进行安全验证（手机验证码）
3. 点击**创建AccessKey**
4. **重要**：立即保存AccessKey ID和AccessKey Secret（仅显示一次）

### 配置步骤

#### 1. 在系统中添加备份配置

1. 登录系统，进入**设置面板**
2. 点击**备份管理**
3. 点击**添加备份配置**
4. 选择备份类型：**阿里云OSS**
5. 填写配置信息：
   - **区域（Region）**：填写OSS Bucket所在地域
     - 示例：`oss-cn-hangzhou`（华东1-杭州）
     - 示例：`oss-cn-beijing`（华北2-北京）
     - 示例：`oss-cn-shenzhen`（华南1-深圳）
     - 完整区域列表请参考：[阿里云OSS区域列表](https://help.aliyun.com/document_detail/31837.html)
   - **AccessKey ID**：填入从阿里云控制台获取的AccessKey ID
   - **AccessKey Secret**：填入从阿里云控制台获取的AccessKey Secret
   - **Bucket**：填入创建的存储桶名称（例如：`gods-bookmark-backup`）
   - **路径前缀（可选）**：用于组织备份文件的目录结构
     - 示例：`bookmarks/backups`（会在存储桶中创建此目录）
     - 留空则直接保存到存储桶根目录
6. 选择**启用状态**和**定时计划**
7. 点击**保存**

#### 2. 验证配置

1. 点击**立即备份**测试配置
2. 查看备份历史，确认状态为**成功**
3. 登录阿里云OSS控制台，在存储桶中查看备份文件

### OSS区域代码参考

| 区域名称 | Region代码 | 示例Endpoint |
|---------|-----------|--------------|
| 华东1（杭州） | oss-cn-hangzhou | oss-cn-hangzhou.aliyuncs.com |
| 华东2（上海） | oss-cn-shanghai | oss-cn-shanghai.aliyuncs.com |
| 华北1（青岛） | oss-cn-qingdao | oss-cn-qingdao.aliyuncs.com |
| 华北2（北京） | oss-cn-beijing | oss-cn-beijing.aliyuncs.com |
| 华北3（张家口） | oss-cn-zhangjiakou | oss-cn-zhangjiakou.aliyuncs.com |
| 华南1（深圳） | oss-cn-shenzhen | oss-cn-shenzhen.aliyuncs.com |
| 香港 | oss-cn-hongkong | oss-cn-hongkong.aliyuncs.com |

### 配置示例

```
区域：oss-cn-hangzhou
AccessKey ID：LTAI5txxxxxxxxxxxxxxxxxx
AccessKey Secret：xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Bucket：gods-bookmark-backup
路径前缀：bookmarks/backups
```

### 注意事项

⚠️ **费用**：
- OSS按存储容量和流量计费
- 建议开启生命周期规则，自动删除旧备份
- 选择合适的存储类型（标准/低频/归档）以降低成本

⚠️ **安全**：
- 使用私有存储桶（读写权限：私有）
- 定期轮换AccessKey
- 建议使用RAM子账号和STS临时凭证（高级用法）

⚠️ **网络**：
- 确保服务器可以访问阿里云OSS（需要外网或专线）
- 国内服务器建议选择相同地域的存储桶

---

## 百度云BOS备份配置

### 适用场景

- 使用百度云存储服务
- 需要国内云存储备份方案

### 前置条件

1. **百度云账号**：注册并实名认证的百度云账号
2. **开通BOS服务**：登录百度云控制台，开通对象存储BOS服务
3. **创建存储桶（Bucket）**：在BOS控制台创建用于备份的存储桶

### 创建BOS存储桶步骤

#### 1. 登录百度云控制台

访问 [百度云控制台](https://console.bce.baidu.com/)

#### 2. 开通BOS服务

1. 进入**产品服务** → **对象存储BOS**
2. 如果未开通，按照提示开通服务
3. 选择合适的计费方式

#### 3. 创建存储桶

1. 在BOS控制台，点击**创建Bucket**
2. 填写配置：
   - **Bucket名称**：例如 `gods-bookmark-backup`（全局唯一）
   - **地域**：选择合适的地域（例如：北京）
   - **访问控制**：私有读写（推荐）
   - **存储类型**：标准存储（推荐）
3. 点击**确定**创建

#### 4. 创建访问密钥（AccessKey）

⚠️ **安全提示**：AccessKey具有账户权限，请妥善保管。

1. 进入**用户中心** → **安全认证** → **AccessKey管理**
2. 点击**创建AccessKey**
3. **重要**：立即保存AccessKey ID和Secret AccessKey（仅显示一次）

### 安装百度云BOS SDK

⚠️ **重要**：当前版本的百度云备份功能需要安装百度云BOS SDK才能正常工作。

#### 安装步骤

```bash
npm install baidubce-sdk
```

或使用yarn：

```bash
yarn add baidubce-sdk
```

#### 修改代码（如果需要）

如果使用SDK，需要修改 `server.js` 中的 `backupToBaidu` 函数。当前实现为占位实现，建议更新为：

```javascript
// 备份到百度云BOS（完整实现）
async function backupToBaidu(data, config, fileName) {
    try {
        const BOS = require('baidubce-sdk');
        const BosClient = BOS.BosClient;
        
        const client = new BosClient({
            credentials: {
                ak: config.accessKeyId,
                sk: config.secretKey
            },
            endpoint: config.endpoint || `https://s3.${config.region}.bcebos.com`
        });
        
        // 构建文件路径
        const objectName = config.prefix ? `${config.prefix.replace(/\/$/, '')}/${fileName}` : fileName;
        
        // 将数据转换为Buffer
        const buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
        
        // 上传文件
        const result = await client.putObject(config.bucket, objectName, buffer);
        
        console.log('[BAIDU BOS] Backup uploaded:', result);
        
        // 返回标识符
        return `baidu://${config.bucket}/${objectName}`;
    } catch (err) {
        console.error('[BAIDU BOS] Upload error:', err);
        throw new Error(`百度云BOS上传失败: ${err.message}`);
    }
}
```

### 配置步骤

#### 1. 在系统中添加备份配置

1. 登录系统，进入**设置面板**
2. 点击**备份管理**
3. 点击**添加备份配置**
4. 选择备份类型：**百度云**
5. 填写配置信息：
   - **区域（Region）**：填写BOS Bucket所在地域
     - 示例：`bj`（北京）
     - 示例：`gz`（广州）
     - 示例：`su`（苏州）
   - **AccessKey ID**：填入从百度云控制台获取的AccessKey ID
   - **Secret Key**：填入从百度云控制台获取的Secret AccessKey
   - **Bucket**：填入创建的存储桶名称（例如：`gods-bookmark-backup`）
   - **路径前缀（可选）**：用于组织备份文件的目录结构
6. 选择**启用状态**和**定时计划**
7. 点击**保存**

#### 2. 验证配置

1. 点击**立即备份**测试配置
2. 查看备份历史，确认状态为**成功**
3. 登录百度云BOS控制台，在存储桶中查看备份文件

### BOS区域代码参考

| 区域名称 | Region代码 | 说明 |
|---------|-----------|------|
| 北京 | bj | 华北区域 |
| 广州 | gz | 华南区域 |
| 苏州 | su | 华东区域 |

### 配置示例

```
区域：bj
AccessKey ID：xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Secret Key：xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Bucket：gods-bookmark-backup
路径前缀：backups/bookmarks
```

### 注意事项

⚠️ **SDK依赖**：
- 确保已安装 `baidubce-sdk` 包
- 当前代码可能使用占位实现，需要更新为完整实现

⚠️ **费用**：
- BOS按存储容量和流量计费
- 建议设置生命周期规则，自动删除旧备份

⚠️ **安全**：
- 使用私有存储桶（访问控制：私有读写）
- 定期轮换AccessKey

---

## 定时备份设置

系统支持通过定时计划自动执行备份任务。

### 预设计划

| 计划名称 | Cron表达式 | 执行时间 |
|---------|-----------|---------|
| 每天 | `0 2 * * *` | 每天凌晨2点 |
| 每周 | `0 2 * * 0` | 每周日凌晨2点 |
| 每月 | `0 2 1 * *` | 每月1日凌晨2点 |
| 每3个月 | `0 2 1 */3 *` | 每3个月的1日凌晨2点 |

### 自定义Cron表达式

如果需要自定义执行时间，可以直接编辑备份配置，修改Cron表达式。

**Cron表达式格式**：`分钟 小时 日期 月份 星期`

**示例**：
- `0 3 * * *` - 每天凌晨3点
- `0 */6 * * *` - 每6小时执行一次
- `0 0 * * 1` - 每周一凌晨执行
- `0 0 1,15 * *` - 每月1号和15号执行

**在线Cron表达式生成器**：
- [Crontab Guru](https://crontab.guru/)
- [Cron Expression Generator](https://www.freeformatter.com/cron-expression-generator-quartz.html)

### 启用/禁用定时备份

在备份配置列表中：
- 勾选**启用状态**：备份配置生效，定时任务将按计划执行
- 取消勾选：禁用此备份配置，不会自动执行备份

---

## 手动备份与恢复

### 手动执行备份

1. 进入**备份管理**页面
2. 找到要执行的备份配置
3. 点击**立即备份**按钮
4. 系统将立即执行备份任务（异步执行）
5. 在**备份历史**中查看备份进度和结果

### 查看备份历史

1. 在**备份管理**页面，点击**查看历史**按钮
2. 查看所有备份记录：
   - 备份时间
   - 备份类型
   - 文件大小
   - 备份状态（成功/失败）
   - 错误信息（如果失败）

### 恢复备份

⚠️ **警告**：恢复备份会覆盖当前数据，请谨慎操作！

1. 在**备份历史**中，找到要恢复的备份记录
2. 点击**恢复**按钮
3. 确认恢复操作
4. 系统将使用该备份文件恢复数据
5. 恢复完成后，刷新页面查看数据

### 下载备份文件

#### 本地/NAS备份

备份文件直接保存在配置的路径中，可以通过文件系统访问：
```bash
# Linux/Mac
cd /path/to/backup/directory
ls -lh backup_*.json

# Windows
dir D:\Backups\GodsBookmark\backup_*.json
```

#### 阿里云OSS备份

1. 登录阿里云OSS控制台
2. 进入对应的存储桶
3. 找到备份文件
4. 点击**下载**或使用OSS客户端工具下载

#### 百度云BOS备份

1. 登录百度云BOS控制台
2. 进入对应的存储桶
3. 找到备份文件
4. 点击**下载**或使用BOS客户端工具下载

---

## 故障排查

### 常见问题

#### 1. 本地/NAS备份失败

**问题**：备份状态显示失败

**可能原因**：
- 备份目录不存在或无写权限
- 磁盘空间不足
- NAS挂载点失效

**解决方法**：
1. 检查备份目录是否存在：`ls -ld /path/to/backup`
2. 检查目录权限：`ls -l /path/to/backup`
3. 检查磁盘空间：`df -h /path/to/backup`
4. 检查NAS挂载：`mount | grep nas`
5. 查看服务器日志：`tail -f server.log`

#### 2. 阿里云OSS备份失败

**问题**：上传失败，显示认证错误

**可能原因**：
- AccessKey ID或Secret错误
- 存储桶不存在或名称错误
- 区域代码错误
- 网络连接问题

**解决方法**：
1. 验证AccessKey是否正确
2. 检查存储桶名称和区域是否匹配
3. 测试网络连接：`curl https://oss-cn-hangzhou.aliyuncs.com`
4. 检查OSS控制台中的存储桶状态
5. 查看详细错误信息（在备份历史中）

#### 3. 百度云BOS备份失败

**问题**：上传失败

**可能原因**：
- 未安装 `baidubce-sdk` 包
- AccessKey错误
- 代码未更新为完整实现

**解决方法**：
1. 安装SDK：`npm install baidubce-sdk`
2. 验证AccessKey
3. 检查代码实现（如上述修改建议）
4. 重启服务器

#### 4. 定时备份未执行

**问题**：配置了定时计划，但备份未执行

**可能原因**：
- 备份配置未启用
- Cron表达式错误
- 服务器时间不正确
- 服务器未运行

**解决方法**：
1. 检查备份配置的启用状态
2. 验证Cron表达式是否正确
3. 检查服务器系统时间：`date`
4. 确认服务器正在运行
5. 查看服务器日志

#### 5. 备份文件过大

**问题**：备份文件占用大量空间

**解决方法**：
1. 检查是否有不必要的数据
2. 考虑只备份关键数据
3. 设置备份保留策略，定期删除旧备份
4. 使用压缩（如果系统支持）

### 日志查看

系统备份操作的日志会输出到服务器控制台，包括：
- 备份开始和完成时间
- 文件大小
- 错误信息

查看日志：
```bash
# 如果使用systemd
journalctl -u gods-bookmark -f

# 如果直接运行
node server.js | tee server.log
```

---

## 安全建议

### 1. 访问密钥安全

⚠️ **重要**：AccessKey具有完整的账户权限，请务必妥善保管！

**最佳实践**：
- 不要在代码中硬编码AccessKey
- 使用环境变量或配置文件（不要提交到版本控制）
- 定期轮换AccessKey
- 为不同应用创建不同的AccessKey
- 使用RAM子账号和最小权限原则（高级用法）

**环境变量示例**：
```bash
# .env 文件（不要提交到git）
ALIYUN_ACCESS_KEY_ID=xxx
ALIYUN_ACCESS_KEY_SECRET=xxx
BAIDU_ACCESS_KEY_ID=xxx
BAIDU_ACCESS_KEY_SECRET=xxx
```

### 2. 备份文件加密

**建议**：
- 使用加密文件系统存储本地备份
- 对敏感备份文件进行加密
- 使用云存储的服务器端加密功能

### 3. 备份保留策略

**建议**：
- 定期清理旧备份（例如：保留最近30天）
- 重要备份永久保存
- 设置自动清理规则（云存储生命周期规则）

### 4. 网络安全

**建议**：
- 使用HTTPS上传备份到云存储
- 在私有网络中使用NAS备份
- 限制备份目录的访问权限

### 5. 定期测试恢复

**建议**：
- 定期测试备份文件的恢复功能
- 验证备份文件的完整性
- 在不同环境中测试恢复流程

---

## 附录

### A. 依赖包版本

```json
{
  "ali-oss": "^6.18.1",
  "node-cron": "^3.0.2",
  "archiver": "^6.0.1",
  "baidubce-sdk": "^x.x.x"  // 需要单独安装
}
```

### B. 备份文件结构

备份JSON文件包含以下数据：
```json
{
  "userId": 1,
  "bookmarks": [...],
  "config": {...},
  "todos": [...],
  "monitor": {...},
  "backupTime": "2024-01-01T00:00:00.000Z"
}
```

### C. API端点参考

- `GET /api/backup/configs` - 获取备份配置列表
- `POST /api/backup/configs` - 创建备份配置
- `PUT /api/backup/configs/:id` - 更新备份配置
- `DELETE /api/backup/configs/:id` - 删除备份配置
- `POST /api/backup/run/:id` - 执行手动备份
- `GET /api/backup/history` - 获取备份历史
- `POST /api/backup/restore/:id` - 恢复备份

### D. 相关文档链接

- [阿里云OSS文档](https://help.aliyun.com/product/31815.html)
- [百度云BOS文档](https://cloud.baidu.com/doc/BOS/index.html)
- [Node-cron文档](https://www.npmjs.com/package/node-cron)
- [Cron表达式参考](https://crontab.guru/)

---

## 更新日志

- **2024-01-XX**：初始版本
  - 添加本地/NAS备份支持
  - 添加阿里云OSS备份支持
  - 添加百度云BOS备份支持（占位实现）
  - 添加定时备份功能

---

**如有问题或建议，请参考项目README或联系开发者。**

# God's Bookmark 浏览器扩展

版本：`2.0.1`

这个扩展用于把 Chrome / Edge 书签和 God's Bookmark 网站联动起来，并提供跨页面快捷搜索能力。

## 功能概览

- 浏览器书签新增、删除、更新、移动可同步到网站
- 网站内新增、删除、移动书签与文件夹可回写到浏览器
- 两台设备同时在线时支持实时同步
- `Ctrl+Space` 可在普通网页和书签首页打开搜索浮层
- 图标统一通过服务器 `/api/favicon` 加载
- 书签移动后会自动触发一轮全量对账
- “合并书签”由网站控制中心手动触发，并同步清理浏览器重复项

## 目录说明

```text
extension/
├── manifest.json
├── background.js
├── content.js
├── content-search.js
├── search-modal-injected.js
├── popup.html
├── popup.js
├── options.html
├── options.js
├── icon16.png
├── icon48.png
├── icon128.png
├── icon256.png
└── icon.ico
```

## 安装方式

1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择项目中的 `extension` 目录

详细步骤见 [安装说明.md](安装说明.md)。

## 首次配置

1. 点击浏览器工具栏中的扩展图标
2. 填写服务器地址，例如 `http://localhost:3000`
3. 点击“测试连接”
4. 保存设置
5. 按需开启自动同步、更新同步、删除同步
6. 首次使用建议执行一次“立即同步所有书签”

## 权限说明

- `bookmarks`：读取和更新浏览器书签
- `storage`：保存扩展配置
- `tabs` / `activeTab`：处理当前标签页搜索与同步场景
- `scripting`：在网页中注入搜索脚本
- `host_permissions`：访问目标网页和 God's Bookmark 服务器

## 打包发布

在项目根目录运行：

```bash
npm run build-extension
```

会生成 `extension.zip`，可直接用于本地分发或上传到商店后台。

## 更新记录

### v2.0.1

- Align bookmark board top/left/right outer spacing to half a grid step (12px).
- Fix the issue where a single card shrinks slightly after refresh when resized to the right boundary.
- Unified release version to `2.0.1`.

### v2.0.0

- 全局设置升级为更稳定的自由布局编辑体验，修复卡片点击高亮、右侧联动、拖动偏移、边界限制与关闭后的残留缩放手柄
- 书签卡片背景网格与外层虚线框改为常驻显示，顶部边界与网格起点对齐，整体布局更直观
- 扩展侧同步链路增强上下文失效保护，降低 `Extension context invalidated` 对页面控制台和同步流程的干扰
- 导入与 favicon 加载策略继续优化，减少大批量书签导入时的阻塞感
- 统一发布版本到 `2.0.0`

### v1.1.2

- 修复合并书签需要多次执行、名称和链接错配的问题
- 合并书签增加对比弹窗，支持按来源文件夹手动选择删除项
- 优化卡片内拖动书签排序，减少整块刷新带来的跳动
- 修复导入书签后未实时同步到浏览器后台的问题
- 修复谷歌书签管理器后台批量删除后，网站与服务器未实时同步的问题

### v1.1.1

- 补充 README 头图与文档版本信息
- 整理发布文档并更新检查清单
- 统一当前发布版本号为 `1.1.1`

### v1.1.0

- 更新扩展图标资源
- 统一 `Ctrl+Space` 搜索行为
- 补齐书签与文件夹同步链路
- 切换为服务端 `/api/favicon` 图标接口
- 支持移动后自动全量对账
- 支持网站侧“合并书签”手动工具同步回写浏览器

### v1.0.0

- 初始版本

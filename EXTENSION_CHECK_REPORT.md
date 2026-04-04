# 扩展发布检查报告

最后检查时间：`2026-04-04`

## 目标版本

- 扩展名称：`God's Bookmark 书签同步`
- 扩展版本：`1.1.0`
- Manifest 版本：`3`

## 已完成检查

### 1. manifest.json

- `manifest_version` 为 `3`
- 已配置 `background.service_worker`
- 已配置 `content.js`、`content-search.js`
- 已配置 `popup.html`、`options.html`
- 已配置扩展命令 `open-search`
- 已配置图标 `16 / 48 / 128 / 256`

### 2. 权限与能力

- `bookmarks`
- `storage`
- `tabs`
- `activeTab`
- `scripting`
- `host_permissions` 为 `http://*/*` 与 `https://*/*`

### 3. 发布包文件

`extension.zip` 应包含以下 13 个文件：

1. `manifest.json`
2. `background.js`
3. `content.js`
4. `content-search.js`
5. `search-modal-injected.js`
6. `popup.html`
7. `popup.js`
8. `options.html`
9. `options.js`
10. `icon16.png`
11. `icon48.png`
12. `icon128.png`
13. `icon256.png`

### 4. 当前版本重点功能

- 普通网页与书签首页都支持 `Ctrl+Space` 直接拉起搜索。
- 浏览器内新增、删除书签与文件夹可同步到网站。
- 双设备同时在线时，网站可自动接收实时同步广播。
- 网站与扩展统一使用 `/api/favicon` 加载图标，适配远程部署。

## 发布前实测建议

1. 在 `chrome://extensions/` 中重新加载 `extension` 目录。
2. 测试扩展弹窗保存配置与“测试连接”。
3. 测试新增、删除、移动书签与文件夹同步。
4. 测试普通网页和书签首页中的 `Ctrl+Space`。
5. 测试远程服务器环境下 favicon 是否正常显示。
6. 运行 `npm run build-extension` 并检查 `extension.zip` 根目录结构。

## 本地命令

```bash
node --check extension/background.js
node --check extension/content.js
node --check extension/content-search.js
node --check extension/popup.js
node --check extension/options.js
node --check extension/search-modal-injected.js
node --check server.js
node --check js/app.js
node --check js/dashboard-layout.js
npm run build-extension
```

## 结论

当前代码结构和发布文件已经满足本地加载与打包发布条件。

仍需人工确认的项目：

- Chrome Web Store 页面文案、截图和隐私政策
- 多机在线同步的最终实机验收
- 生产环境域名、HTTPS 和防火墙配置

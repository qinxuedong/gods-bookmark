# God's Bookmark 浏览器扩展

版本：`1.1.1`

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

/**
 * 构建 Chrome/Edge 扩展发布包。
 * 生成的 extension.zip 根目录直接包含 manifest.json，
 * 可直接用于本地加载或提交到 Chrome Web Store。
 */

const fs = require('fs');
const path = require('path');

let archiver;
try {
  archiver = require('archiver');
} catch (error) {
  console.error('错误: 缺少 archiver 依赖。');
  console.error('请先运行: npm install archiver --save-dev');
  process.exit(1);
}

const extensionDir = path.join(__dirname, 'extension');
const outputFile = path.join(__dirname, 'extension.zip');

const includeFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'content-search.js',
  'search-modal-injected.js',
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
  'icon16.png',
  'icon48.png',
  'icon128.png',
  'icon256.png'
];

function fail(message) {
  console.error(`错误: ${message}`);
  process.exit(1);
}

console.log('========================================');
console.log("God's Bookmark 扩展打包工具");
console.log('========================================');

if (!fs.existsSync(extensionDir)) {
  fail('未找到 extension 目录。');
}

const manifestPath = path.join(extensionDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  fail('未找到 extension/manifest.json。');
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`manifest.json 解析失败: ${error.message}`);
}

for (const field of ['manifest_version', 'name', 'version']) {
  if (!manifest[field]) {
    fail(`manifest.json 缺少必填字段: ${field}`);
  }
}

console.log('manifest.json 校验通过');
console.log(`名称: ${manifest.name}`);
console.log(`版本: ${manifest.version}`);
console.log(`Manifest 版本: ${manifest.manifest_version}`);

console.log('\n检查打包文件...');
const missingFiles = [];
for (const file of includeFiles) {
  const filePath = path.join(extensionDir, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
    console.error(`  缺失: ${file}`);
    continue;
  }

  const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(2);
  console.log(`  OK  ${file.padEnd(24)} ${sizeKB} KB`);
}

if (missingFiles.length > 0) {
  fail(`以下文件缺失: ${missingFiles.join(', ')}`);
}

const referencedFiles = new Set();
if (manifest.background?.service_worker) {
  referencedFiles.add(manifest.background.service_worker);
}
for (const script of manifest.content_scripts || []) {
  for (const file of script.js || []) {
    referencedFiles.add(file);
  }
}
if (manifest.action?.default_popup) {
  referencedFiles.add(manifest.action.default_popup);
}
if (manifest.options_page) {
  referencedFiles.add(manifest.options_page);
}
for (const icon of Object.values(manifest.icons || {})) {
  referencedFiles.add(icon);
}
for (const icon of Object.values(manifest.action?.default_icon || {})) {
  referencedFiles.add(icon);
}

console.log('\n检查 manifest 引用...');
for (const file of referencedFiles) {
  const filePath = path.join(extensionDir, file);
  if (!fs.existsSync(filePath)) {
    fail(`manifest 引用了不存在的文件: ${file}`);
  }
  console.log(`  OK  ${file}`);
}

if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
  console.log('\n已删除旧的 extension.zip');
}

console.log('\n开始生成 ZIP...');
const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', () => {
  const sizeKB = (archive.pointer() / 1024).toFixed(2);
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);

  console.log('\n========================================');
  console.log('扩展打包完成');
  console.log('========================================');
  console.log(`文件: ${outputFile}`);
  console.log(`大小: ${sizeKB} KB (${sizeMB} MB)`);
  console.log(`文件数: ${includeFiles.length}`);
  console.log('\n发布前建议:');
  console.log('1. 在 chrome://extensions 中重新加载 extension 目录');
  console.log('2. 手动验证弹窗、选项页、同步、全局搜索');
  console.log('3. 上传 extension.zip 前再次检查版本号与图标');
});

archive.on('error', (error) => {
  fail(`ZIP 构建失败: ${error.message}`);
});

archive.pipe(output);

for (const file of includeFiles) {
  archive.file(path.join(extensionDir, file), { name: file });
}

archive.finalize();

/**
 * 构建 Chrome 扩展发布包
 * 生成符合 Chrome Web Store 规范的 extension.zip
 * 压缩包根目录直接是 manifest.json（无 extension 文件夹）
 */

const fs = require('fs');
const path = require('path');

// 检查 archiver 是否可用
let archiver;
try {
    archiver = require('archiver');
} catch (error) {
    console.error('❌ 错误: archiver 模块未安装');
    console.error('请运行: npm install archiver --save-dev');
    console.error('\n或者使用手动方法创建 ZIP（见 EXTENSION_CHECK_REPORT.md）');
    process.exit(1);
}

// 扩展目录
const extensionDir = path.join(__dirname, 'extension');
const outputFile = path.join(__dirname, 'extension.zip');

// 需要包含的文件（排除文档文件）
const includeFiles = [
    'manifest.json',
    'background.js',
    'content.js',
    'content-search.js',
    'popup.html',
    'popup.js',
    'options.html',
    'options.js',
    'icon16.png',
    'icon48.png',
    'icon128.png'
];

console.log('═══════════════════════════════════════════════════════');
console.log('  Chrome 扩展包构建工具');
console.log('═══════════════════════════════════════════════════════\n');

// 检查扩展目录是否存在
if (!fs.existsSync(extensionDir)) {
    console.error('❌ 错误: extension 目录不存在');
    process.exit(1);
}

// 检查 manifest.json 是否存在
const manifestPath = path.join(extensionDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
    console.error('❌ 错误: manifest.json 不存在');
    process.exit(1);
}

// 读取并验证 manifest.json
let manifest;
try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    console.log('✓ manifest.json 格式正确');
    console.log('  名称:', manifest.name);
    console.log('  版本:', manifest.version);
    console.log('  Manifest V3:', manifest.manifest_version === 3);
    
    // 验证必需字段
    const requiredFields = ['manifest_version', 'name', 'version'];
    for (const field of requiredFields) {
        if (!manifest[field]) {
            console.error(`❌ 错误: manifest.json 缺少必需字段: ${field}`);
            process.exit(1);
        }
    }
} catch (error) {
    console.error('❌ 错误: manifest.json 格式错误:', error.message);
    process.exit(1);
}

// 检查必需文件是否存在
console.log('\n检查必需文件...');
const missingFiles = [];
for (const file of includeFiles) {
    const filePath = path.join(extensionDir, file);
    if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
        console.error(`  ❌ 缺失: ${file}`);
    } else {
        const stats = fs.statSync(filePath);
        console.log(`  ✓ ${file.padEnd(25)} ${(stats.size / 1024).toFixed(2)} KB`);
    }
}

if (missingFiles.length > 0) {
    console.error('\n❌ 错误: 以下必需文件缺失:', missingFiles.join(', '));
    process.exit(1);
}

// 验证 manifest.json 中引用的文件是否存在
console.log('\n验证 manifest.json 引用的文件...');
const referencedFiles = [];

if (manifest.background && manifest.background.service_worker) {
    referencedFiles.push(manifest.background.service_worker);
}

if (manifest.content_scripts) {
    manifest.content_scripts.forEach(script => {
        if (script.js) {
            referencedFiles.push(...script.js);
        }
    });
}

if (manifest.action && manifest.action.default_popup) {
    referencedFiles.push(manifest.action.default_popup);
}

if (manifest.options_page) {
    referencedFiles.push(manifest.options_page);
}

if (manifest.icons) {
    Object.values(manifest.icons).forEach(icon => {
        referencedFiles.push(icon);
    });
}

if (manifest.action && manifest.action.default_icon) {
    Object.values(manifest.action.default_icon).forEach(icon => {
        referencedFiles.push(icon);
    });
}

// 验证引用的文件是否存在
const missingReferenced = [];
for (const file of referencedFiles) {
    const filePath = path.join(extensionDir, file);
    if (!fs.existsSync(filePath)) {
        missingReferenced.push(file);
        console.error(`  ❌ manifest.json 引用的文件不存在: ${file}`);
    } else {
        console.log(`  ✓ ${file}`);
    }
}

if (missingReferenced.length > 0) {
    console.error('\n❌ 错误: manifest.json 引用的以下文件不存在:', missingReferenced.join(', '));
    process.exit(1);
}

// 删除旧的 ZIP 文件
if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
    console.log('\n已删除旧的 extension.zip');
}

// 创建 ZIP 文件
console.log('\n创建 ZIP 压缩包...');
const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', {
    zlib: { level: 9 } // 最高压缩级别
});

output.on('close', () => {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    const sizeKB = (archive.pointer() / 1024).toFixed(2);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✓ 扩展包构建成功!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  文件: ${outputFile}`);
    console.log(`  大小: ${sizeKB} KB (${sizeMB} MB)`);
    console.log('  文件数: 11 个');
    console.log('\n可以提交到 Chrome Web Store 了！');
    console.log('\n提示:');
    console.log('  1. 在 Chrome 中访问 chrome://extensions/');
    console.log('  2. 开启"开发者模式"');
    console.log('  3. 点击"加载已解压的扩展程序"');
    console.log('  4. 选择 extension 目录');
    console.log('  或者直接使用生成的 extension.zip 文件');
    console.log('═══════════════════════════════════════════════════════\n');
});

archive.on('error', (err) => {
    console.error('\n❌ 构建失败:', err);
    process.exit(1);
});

archive.pipe(output);

// 添加文件到 ZIP（根目录直接是扩展文件，无 extension 文件夹）
console.log('\n添加文件到压缩包...');
for (const file of includeFiles) {
    const filePath = path.join(extensionDir, file);
    // 直接添加到 ZIP 根目录，不包含 extension 文件夹
    archive.file(filePath, { name: file });
    console.log(`  ✓ ${file}`);
}

// 完成压缩
archive.finalize();

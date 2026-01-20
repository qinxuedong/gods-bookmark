// 选项页面脚本
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:3000',
  enabled: true,
  defaultCategory: '书签栏',
  syncOnCreate: true,
  syncOnUpdate: true,
  syncOnRemove: false
};

// 加载配置
async function loadConfig() {
  const result = await chrome.storage.sync.get(['bookmarkSyncConfig']);
  const config = { ...DEFAULT_CONFIG, ...result.bookmarkSyncConfig };
  
  document.getElementById('enabled').checked = config.enabled;
  document.getElementById('serverUrl').value = config.serverUrl;
  document.getElementById('syncOnCreate').checked = config.syncOnCreate;
  document.getElementById('syncOnUpdate').checked = config.syncOnUpdate;
  document.getElementById('syncOnRemove').checked = config.syncOnRemove;
}

// 保存配置
async function saveConfig() {
  const config = {
    serverUrl: document.getElementById('serverUrl').value || DEFAULT_CONFIG.serverUrl,
    enabled: document.getElementById('enabled').checked,
    defaultCategory: '书签栏',
    syncOnCreate: document.getElementById('syncOnCreate').checked,
    syncOnUpdate: document.getElementById('syncOnUpdate').checked,
    syncOnRemove: document.getElementById('syncOnRemove').checked
  };
  
  await chrome.storage.sync.set({ bookmarkSyncConfig: config });
  
  // 显示保存成功提示
  const btn = document.getElementById('saveBtn');
  const originalText = btn.textContent;
  btn.textContent = '✓ 已保存';
  btn.style.background = '#10b981';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
  }, 2000);
}

// 事件监听
document.addEventListener('DOMContentLoaded', loadConfig);
document.getElementById('saveBtn').addEventListener('click', saveConfig);

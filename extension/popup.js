// 弹出窗口脚本
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
  document.getElementById('syncOnCreate').checked = config.syncOnCreate;
  document.getElementById('syncOnUpdate').checked = config.syncOnUpdate;
  document.getElementById('syncOnRemove').checked = config.syncOnRemove;
  document.getElementById('serverUrl').value = config.serverUrl;
  
  updateStatus(config.enabled);
}

// 更新状态显示
function updateStatus(enabled) {
  const statusEl = document.getElementById('status');
  if (enabled) {
    statusEl.textContent = '✓ 同步已启用';
    statusEl.className = 'status enabled';
  } else {
    statusEl.textContent = '✗ 同步已禁用';
    statusEl.className = 'status disabled';
  }
}

// 保存配置
async function saveConfig() {
  const config = {
    serverUrl: document.getElementById('serverUrl').value || DEFAULT_CONFIG.serverUrl,
    enabled: document.getElementById('enabled').checked,
    syncOnCreate: document.getElementById('syncOnCreate').checked,
    syncOnUpdate: document.getElementById('syncOnUpdate').checked,
    syncOnRemove: document.getElementById('syncOnRemove').checked,
    defaultCategory: '书签栏'
  };
  
  const wasEnabled = (await chrome.storage.sync.get(['bookmarkSyncConfig'])).bookmarkSyncConfig?.enabled;
  
  await chrome.storage.sync.set({ bookmarkSyncConfig: config });
  updateStatus(config.enabled);
  
  // 如果从禁用变为启用，自动执行初始同步
  if (!wasEnabled && config.enabled) {
    console.log('[弹出窗口] 检测到启用同步，触发初始同步...');
    setTimeout(() => {
      syncAllBookmarks();
    }, 500);
  }
  
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

// 测试服务器连接
async function testConnection() {
  const serverUrl = document.getElementById('serverUrl').value || DEFAULT_CONFIG.serverUrl;
  const btn = document.getElementById('testBtn');
  const originalText = btn.textContent;
  
  btn.textContent = '测试中...';
  btn.disabled = true;
  
  try {
    const response = await fetch(`${serverUrl}/api/users/check-auth`, {
      credentials: 'include'
    });
    if (response.ok) {
      btn.textContent = '✓ 连接成功';
      btn.style.background = '#10b981';
    } else {
      btn.textContent = '✗ 连接失败';
      btn.style.background = '#ef4444';
    }
  } catch (error) {
    btn.textContent = '✗ 连接失败';
    btn.style.background = '#ef4444';
    console.error('连接测试失败:', error);
  }
  
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
    btn.disabled = false;
  }, 2000);
}

// 手动同步所有书签
async function syncAllBookmarks() {
  const btn = document.getElementById('syncAllBtn');
  if (!btn) return;
  
  const originalText = btn.textContent;
  btn.textContent = '同步中...';
  btn.disabled = true;
  
  try {
    console.log('[弹出窗口] 发送同步请求...');
    
    // 使用 Promise 方式处理 sendMessage
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'syncAll' }, (response) => {
        // 检查是否有错误
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
    
    console.log('[弹出窗口] 收到响应:', response);
    
    if (response && response.success) {
      const browserToServer = response.result?.browserToServer;
      const serverToBrowser = response.result?.serverToBrowser;
      
      let message = '✓ 同步成功';
      let details = [];
      
      if (browserToServer?.stats) {
        details.push(`上传: ${browserToServer.stats.totalBookmarks}个书签`);
      }
      if (serverToBrowser) {
        const parts = [];
        if (serverToBrowser.added > 0) parts.push(`新增${serverToBrowser.added}个`);
        if (serverToBrowser.updated > 0) parts.push(`更新${serverToBrowser.updated}个`);
        if (serverToBrowser.foldersCreated > 0) parts.push(`创建${serverToBrowser.foldersCreated}个文件夹`);
        if (parts.length > 0) {
          details.push(`下载: ${parts.join(', ')}`);
        }
      }
      
      if (details.length > 0) {
        message += ` (${details.join('; ')})`;
      }
      
      btn.textContent = message;
      btn.style.background = '#10b981';
    } else {
      const errorMsg = response?.error || '未知错误';
      btn.textContent = `✗ 同步失败: ${errorMsg}`;
      btn.style.background = '#ef4444';
      console.error('[弹出窗口] 同步失败:', response);
    }
  } catch (error) {
    btn.textContent = `✗ 同步失败: ${error.message || '未知错误'}`;
    btn.style.background = '#ef4444';
    console.error('[弹出窗口] 同步异常:', error);
  }
  
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
    btn.disabled = false;
  }, 5000);
}

// 事件监听
document.addEventListener('DOMContentLoaded', loadConfig);
document.getElementById('saveBtn').addEventListener('click', saveConfig);
document.getElementById('testBtn').addEventListener('click', testConnection);
document.getElementById('syncAllBtn').addEventListener('click', syncAllBookmarks);
document.getElementById('optionsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById('enabled').addEventListener('change', (e) => {
  updateStatus(e.target.checked);
});

// God's Bookmark 书签同步扩展 - 后台脚本
// 监听浏览器书签变化并自动同步到网站

// 默认配置
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:3000',
  enabled: true,
  defaultCategory: '书签栏',
  syncOnCreate: true,
  syncOnUpdate: true,
  syncOnRemove: false
};

// 获取配置
async function getConfig() {
  const result = await chrome.storage.sync.get(['bookmarkSyncConfig']);
  const config = { ...DEFAULT_CONFIG, ...result.bookmarkSyncConfig };
  // 确保默认分类是"书签栏"（修复旧配置中的"浏览器书签"或任何其他值）
  if (config.defaultCategory !== '书签栏') {
    console.log('[书签同步] 修正默认分类从', config.defaultCategory, '到"书签栏"');
    config.defaultCategory = '书签栏';
    // 自动保存修正后的配置
    await saveConfig(config);
  }
  return config;
}

// 保存配置
async function saveConfig(config) {
  await chrome.storage.sync.set({ bookmarkSyncConfig: config });
}

// 获取网站favicon URL
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // 跳过本地URL（localhost、127.0.0.1、本地IP等）
    if (domain === 'localhost' || 
        domain === '127.0.0.1' || 
        domain.startsWith('192.168.') || 
        domain.startsWith('10.') || 
        domain.startsWith('172.') ||
        domain === '0.0.0.0') {
      return null;
    }
    
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (e) {
    return null;
  }
}

// 将浏览器书签节点转换为网站书签格式
function convertBookmarkNode(bookmarkNode) {
  if (!bookmarkNode.url) {
    // 这是文件夹，不是书签
    return null;
  }
  
  const faviconUrl = getFaviconUrl(bookmarkNode.url);
  const icon = faviconUrl 
    ? `<img src="${faviconUrl}" width="16" height="16" style="vertical-align: middle;"><span style="display: none;">🔗</span>`
    : '🔗';
  
  return {
    name: bookmarkNode.title || '未命名书签',
    url: bookmarkNode.url,
    icon: icon
  };
}

// 获取书签所在的文件夹路径
async function getBookmarkFolderPath(bookmarkId) {
  try {
    const bookmark = await chrome.bookmarks.get(bookmarkId);
    if (!bookmark || bookmark.length === 0) return null;
    
    const node = bookmark[0];
    if (!node.parentId) return null;
    
    // 获取父文件夹
    const parent = await chrome.bookmarks.get(node.parentId);
    if (!parent || parent.length === 0) return null;
    
    const parentNode = parent[0];
    
    // 检查父文件夹是否是书签栏根目录（Bookmarks bar）
    // 书签栏的title通常是"书签栏"或"Bookmarks bar"
    // 或者父节点没有parentId（是根节点）
    const bookmarksBarTitles = ['书签栏', 'Bookmarks bar', '书签管理器', 'Bookmarks', '书签'];
    const isBookmarksBar = bookmarksBarTitles.includes(parentNode.title) || 
                          !parentNode.parentId;
    
    // 如果父文件夹是书签栏根目录，返回null（使用默认分类）
    if (isBookmarksBar) {
      console.log('[书签同步] 书签在书签栏根目录，使用默认分类:', parentNode.title);
      return null;
    }
    
    // 如果父文件夹有URL，说明它不是文件夹，继续向上查找
    if (parentNode.url) {
      // 递归查找父文件夹
      if (parentNode.parentId) {
        return await getBookmarkFolderPath(parentNode.id);
      }
      return null;
    }
    
    // 返回父文件夹名称（这是真正的文件夹）
    console.log('[书签同步] 书签在文件夹中:', parentNode.title);
    return parentNode.title;
  } catch (error) {
    console.error('获取书签文件夹路径失败:', error);
    return null;
  }
}

// 同步书签到服务器
async function syncBookmarkToServer(bookmarkId, action = 'created') {
  try {
    const config = await getConfig();
    
    // 检查是否启用同步
    if (!config.enabled) {
      console.log('[书签同步] 同步功能已禁用');
      return;
    }
    
    // 检查是否启用对应的操作
    if (action === 'created' && !config.syncOnCreate) return;
    if (action === 'updated' && !config.syncOnUpdate) return;
    if (action === 'removed' && !config.syncOnRemove) return;
    
    // 获取书签信息
    const bookmark = await chrome.bookmarks.get(bookmarkId);
    if (!bookmark || bookmark.length === 0) return;
    
    const bookmarkNode = bookmark[0];
    
    // 跳过文件夹
    if (!bookmarkNode.url) {
      console.log('[书签同步] 跳过文件夹:', bookmarkNode.title);
      return;
    }
    
    // 转换为网站书签格式
    const bookmarkData = convertBookmarkNode(bookmarkNode);
    if (!bookmarkData) return;
    
    // 获取分类名称（书签所在的文件夹）
    let categoryName = '书签栏'; // 强制使用"书签栏"作为默认分类
    const folderPath = await getBookmarkFolderPath(bookmarkId);
    if (folderPath) {
      categoryName = folderPath;
    } else {
      // 如果folderPath为null，说明在根目录，使用"书签栏"
      categoryName = '书签栏';
    }
    
    console.log('[书签同步] 书签分类:', categoryName, 'folderPath:', folderPath);
    
    // 发送到服务器
    const response = await fetch(`${config.serverUrl}/api/bookmark/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category: categoryName,
        bookmark: bookmarkData,
        action: action
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('[书签同步] 同步成功:', bookmarkData.name, '到分类:', categoryName, result);
    
    // 通知用户（可选）
    if (result.success) {
      chrome.action.setBadgeText({ text: '✓' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2000);
    }
    
  } catch (error) {
    console.error('[书签同步] 同步失败:', error);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
}

// 监听书签创建
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  console.log('[书签同步] 检测到新书签:', bookmark.title);
  await syncBookmarkToServer(id, 'created');
});

// 监听书签更新
chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
  console.log('[书签同步] 检测到书签更新:', changeInfo.title);
  const config = await getConfig();
  if (config.syncOnUpdate) {
    await syncBookmarkToServer(id, 'updated');
  }
});

// 监听书签移动（改变文件夹）
chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
  console.log('[书签同步] 检测到书签移动:', id, moveInfo);
  const config = await getConfig();
  if (config.syncOnUpdate) {
    // 移动书签需要更新其分类
    try {
      // 获取移动后的书签信息
      const bookmark = await chrome.bookmarks.get(id);
      if (!bookmark || bookmark.length === 0) return;
      
      const bookmarkNode = bookmark[0];
      
      // 跳过文件夹
      if (!bookmarkNode.url) {
        console.log('[书签同步] 跳过文件夹移动:', bookmarkNode.title);
        return;
      }
      
      // 转换为网站书签格式
      const bookmarkData = convertBookmarkNode(bookmarkNode);
      if (!bookmarkData) return;
      
      // 获取新的分类名称（移动后的文件夹）
      let categoryName = '书签栏'; // 强制使用"书签栏"作为默认分类
      const folderPath = await getBookmarkFolderPath(id);
      if (folderPath) {
        categoryName = folderPath;
      } else {
        // 如果folderPath为null，说明在根目录，使用"书签栏"
        categoryName = '书签栏';
      }
      
      console.log('[书签同步] 移动后书签分类:', categoryName, 'folderPath:', folderPath);
      
      // 发送移动请求（使用moved action，服务器端会处理分类移动）
      const response = await fetch(`${config.serverUrl}/api/bookmark/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'moved',
          bookmark: bookmarkData,
          category: categoryName
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[书签同步] 书签移动同步成功:', bookmarkData.name, '到分类:', categoryName, result);
      }
    } catch (error) {
      console.error('[书签同步] 书签移动同步失败:', error);
    }
  }
});

// 监听书签删除
chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
  console.log('[书签同步] 检测到书签删除');
  const config = await getConfig();
  if (config.syncOnRemove && removeInfo.node && removeInfo.node.url) {
    // 删除操作：使用删除前的书签信息
    try {
      const bookmarkData = convertBookmarkNode(removeInfo.node);
      if (!bookmarkData) return;
      
      const response = await fetch(`${config.serverUrl}/api/bookmark/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'removed',
          bookmark: bookmarkData
        })
      });
      console.log('[书签同步] 删除同步:', response.ok);
    } catch (error) {
      console.error('[书签同步] 删除同步失败:', error);
    }
  }
});

// 递归获取所有书签（按文件夹分类）
async function getAllBookmarks(node, categoryPath = '', config = null) {
  const bookmarks = [];
  
  if (!node || !node.children) {
    return bookmarks;
  }
  
  if (!config) {
    config = await getConfig();
  }
  
  for (const child of node.children) {
    if (child.url) {
      // 这是一个书签
      const bookmarkData = convertBookmarkNode(child);
      if (bookmarkData) {
        // 如果 categoryPath 为空（根目录的直接书签），使用默认分类
        // 如果 categoryPath 不为空（在文件夹内的书签），使用文件夹名称作为分类
        const finalCategory = categoryPath || '书签栏';
        bookmarks.push({
          bookmark: bookmarkData,
          category: finalCategory
        });
      }
    } else if (child.children && child.children.length > 0) {
      // 这是一个文件夹
      const folderName = child.title || '未命名文件夹';
      
      // 使用文件夹名称作为分类（只使用第一层文件夹名称，忽略嵌套）
      // 如果 categoryPath 为空，说明这是根目录下的文件夹，使用文件夹名称
      // 如果 categoryPath 不为空，说明这是嵌套文件夹，仍然使用文件夹名称（不嵌套分类）
      const newCategory = folderName;
      
      // 递归处理文件夹内的书签
      const folderBookmarks = await getAllBookmarks(child, newCategory, config);
      bookmarks.push(...folderBookmarks);
    }
  }
  
  return bookmarks;
}

// 同步所有书签到服务器
async function syncAllBookmarks() {
  try {
    const config = await getConfig();
    
    if (!config.enabled) {
      console.log('[书签同步] 同步功能已禁用，跳过初始同步');
      return;
    }
    
    console.log('[书签同步] 开始同步所有书签...');
    
    // 获取书签树
    const tree = await chrome.bookmarks.getTree();
    if (!tree || tree.length === 0) {
      console.log('[书签同步] 没有找到书签');
      return;
    }
    
    // 找到书签栏（通常是第二个节点，第一个是"其他书签"）
    let bookmarksBar = null;
    for (const root of tree) {
      if (root.title === '书签栏' || root.title === 'Bookmarks bar' || root.id === '1') {
        bookmarksBar = root;
        break;
      }
    }
    
    // 如果没找到，使用第一个根节点
    if (!bookmarksBar && tree.length > 0) {
      bookmarksBar = tree[0];
    }
    
    if (!bookmarksBar) {
      console.error('[书签同步] 无法找到书签栏');
      return;
    }
    
    // 获取所有书签（从书签栏开始）
    const allBookmarks = await getAllBookmarks(bookmarksBar, '', config);
    console.log(`[书签同步] 找到 ${allBookmarks.length} 个书签`);
    
    if (allBookmarks.length === 0) {
      console.log('[书签同步] 没有需要同步的书签');
      return;
    }
    
    // 按分类分组
    const bookmarksByCategory = {};
    for (const item of allBookmarks) {
      const category = item.category || '书签栏';
      if (!bookmarksByCategory[category]) {
        bookmarksByCategory[category] = [];
      }
      bookmarksByCategory[category].push(item.bookmark);
    }
    
    console.log(`[书签同步] 分类统计:`, Object.keys(bookmarksByCategory).map(cat => 
      `${cat}(${bookmarksByCategory[cat].length})`).join(', '));
    
    // 批量同步到服务器
    console.log('[书签同步] 准备发送请求到:', `${config.serverUrl}/api/bookmark/sync-all`);
    console.log('[书签同步] 请求数据大小:', JSON.stringify({ bookmarks: bookmarksByCategory }).length, '字符');
    
    const response = await fetch(`${config.serverUrl}/api/bookmark/sync-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bookmarks: bookmarksByCategory
      })
    });
    
    console.log('[书签同步] 收到响应:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // 无法解析错误响应，使用默认错误信息
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('[书签同步] 所有书签同步完成:', result);
    
    // 显示成功提示
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
    
    return result;
    
  } catch (error) {
    console.error('[书签同步] 同步所有书签失败:', error);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
    throw error;
  }
}

// 监听配置变化，当启用时自动同步所有书签
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.bookmarkSyncConfig) {
    const newConfig = changes.bookmarkSyncConfig.newValue;
    const oldConfig = changes.bookmarkSyncConfig.oldValue;
    
    // 如果从禁用变为启用，执行初始同步
    if (newConfig && (!oldConfig || !oldConfig.enabled) && newConfig.enabled) {
      console.log('[书签同步] 检测到启用同步，开始初始同步...');
      syncAllBookmarks();
    }
  }
});

// 初始化：检查服务器连接
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[书签同步] 扩展已安装，原因:', details.reason);
  const config = await getConfig();
  
  // 测试服务器连接
  try {
    const response = await fetch(`${config.serverUrl}/api/check-auth`);
    if (response.ok) {
      console.log('[书签同步] 服务器连接正常');
      
      // 如果已启用，执行初始同步
      if (config.enabled) {
        console.log('[书签同步] 已启用，执行初始同步...');
        await syncAllBookmarks();
      }
    }
  } catch (error) {
    console.warn('[书签同步] 无法连接到服务器:', error.message);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  }
});

// 监听来自popup和网站的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[书签同步] 收到消息:', request);
  
  if (request.action === 'syncAll') {
    console.log('[书签同步] 开始执行同步请求...');
    
    // 异步执行，返回 true 保持消息通道开放
    syncAllBookmarks()
      .then(result => {
        console.log('[书签同步] 同步完成，返回结果:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 同步失败，返回错误:', error);
        sendResponse({ success: false, error: error.message || '同步失败' });
      });
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  if (request.action === 'deleteBookmark') {
    console.log('[书签同步] 收到删除书签请求（来自网站）:', request.url);
    
    // 从网站删除时，不检查配置，直接删除浏览器书签
    deleteBrowserBookmark(request.url, true)
      .then(result => {
        console.log('[书签同步] 浏览器书签删除结果:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 删除浏览器书签失败:', error);
        sendResponse({ success: false, error: error.message || '删除失败' });
      });
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  if (request.action === 'moveBookmark') {
    console.log('[书签同步] 收到移动书签请求（来自网站）:', request);
    
    // 从网站移动书签时，同步到浏览器
    moveBrowserBookmark(request.url, request.targetCategory, request.index)
      .then(result => {
        console.log('[书签同步] 浏览器书签移动结果:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 移动浏览器书签失败:', error);
        sendResponse({ success: false, error: error.message || '移动失败' });
      });
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  if (request.action === 'updateBookmark') {
    console.log('[书签同步] 收到更新书签请求（来自网站）:', request);
    
    // 从网站更新书签时，同步到浏览器
    updateBrowserBookmark(request.oldUrl, request.newUrl, request.newName)
      .then(result => {
        console.log('[书签同步] 浏览器书签更新结果:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 更新浏览器书签失败:', error);
        sendResponse({ success: false, error: error.message || '更新失败' });
      });
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  if (request.action === 'openSearch') {
    console.log('[书签同步] 收到打开搜索请求:', request.url);
    
    // 打开新标签页到搜索页面
    chrome.tabs.create({
      url: request.url || 'http://localhost:3000'
    });
    
    sendResponse({ success: true });
    return false;
  }
  
  // 对于其他消息，返回 false 表示同步处理
  return false;
});

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  console.log('[书签同步] 收到命令:', command);
  
  if (command === 'open-search') {
    // 获取服务器URL
    getConfig().then(config => {
      const serverUrl = config.serverUrl || 'http://localhost:3000';
      
      // 检查当前活动标签页是否是搜索页面
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const currentTab = tabs[0];
          const currentUrl = currentTab.url || '';
          
          // 检查是否是搜索页面（精确匹配端口3000）
          const isSearchPage = (currentUrl.includes('localhost:3000') || 
                               currentUrl.includes('127.0.0.1:3000')) &&
                               !currentUrl.includes('login.html');
          
          if (isSearchPage) {
            // 如果是搜索页面，直接注入脚本打开浮窗（更可靠）
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: () => {
                // 直接调用页面函数打开搜索浮窗
                if (window.openSearchModal && typeof window.openSearchModal === 'function') {
                  window.openSearchModal();
                } else if (window.postMessage) {
                  // 如果函数不存在，发送postMessage
                  window.postMessage({ type: 'OPEN_SEARCH_MODAL' }, '*');
                }
              }
            }).catch(err => {
              console.error('[书签同步] 注入脚本失败，尝试发送消息:', err);
              // 如果注入失败，尝试发送消息
              chrome.tabs.sendMessage(currentTab.id, {
                action: 'openSearchModal'
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('[书签同步] 发送消息也失败:', chrome.runtime.lastError);
                }
              });
            });
          } else {
            // 如果不是搜索页面，直接在当前页面注入全局搜索浮窗
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: () => {
                // 创建全局搜索浮窗的HTML和CSS
                const modalHTML = `
                  <div id="gods-bookmark-search-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh;">
                    <div style="width: 90%; max-width: 600px; background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden;">
                      <div style="padding: 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: rgba(139, 92, 246, 0.1);">
                        <input type="text" id="gods-bookmark-search-input" style="width: 100%; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.5rem; color: #f1f5f9; font-size: 1rem; outline: none;" placeholder="搜索书签或输入关键词搜索网络..." autocomplete="off">
                      </div>
                      <div id="gods-bookmark-search-results" style="max-height: 400px; overflow-y: auto; padding: 0.5rem;"></div>
                    </div>
                  </div>
                `;
                
                // 如果已经存在，先移除
                const existingModal = document.getElementById('gods-bookmark-search-modal');
                if (existingModal) {
                  existingModal.remove();
                }
                
                // 创建并插入模态框
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = modalHTML;
                const modal = tempDiv.firstElementChild;
                document.body.appendChild(modal);
                
                const searchInput = document.getElementById('gods-bookmark-search-input');
                const resultsContainer = document.getElementById('gods-bookmark-search-results');
                
                // 点击背景关闭
                modal.addEventListener('click', (e) => {
                  if (e.target === modal) {
                    modal.remove();
                  }
                });
                
                // ESC键关闭
                const handleKeyDown = (e) => {
                  if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', handleKeyDown);
                  }
                };
                document.addEventListener('keydown', handleKeyDown);
                
                // 聚焦输入框
                if (searchInput) {
                  searchInput.focus();
                  
                  // 回车键搜索
                  searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                      const query = searchInput.value.trim();
                      if (query) {
                        // 使用Bing搜索（默认）
                        const searchUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
                        window.open(searchUrl, '_blank');
                        modal.remove();
                      }
                    }
                  });
                }
              }
            }).catch(err => {
                console.error('[书签同步] 注入搜索浮窗失败:', err);
                // 如果注入失败，尝试发送消息给content script
                chrome.tabs.sendMessage(currentTab.id, {
                  action: 'openSearchModal'
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('[书签同步] 发送消息也失败:', chrome.runtime.lastError);
                  }
                });
              });
          }
        } else {
          // 没有活动标签页，打开新标签页
          chrome.tabs.create({
            url: serverUrl
          });
        }
      });
    }).catch(error => {
      console.error('[书签同步] 获取配置失败:', error);
      // 使用默认URL
      chrome.tabs.create({
        url: 'http://localhost:3000'
      });
    });
  }
});

// 根据URL删除浏览器书签
async function deleteBrowserBookmark(url, skipConfigCheck = false) {
  try {
    if (!url) {
      throw new Error('URL不能为空');
    }
    
    // 如果是从网站删除（skipConfigCheck=true），不检查配置，直接删除
    // 如果是从浏览器删除同步（skipConfigCheck=false），检查配置
    if (!skipConfigCheck) {
      const config = await getConfig();
      if (!config.syncOnRemove) {
        console.log('[书签同步] 删除同步已禁用，跳过删除');
        return { skipped: true, reason: '删除同步已禁用' };
      }
    }
    
    console.log('[书签同步] 查找浏览器书签:', url);
    
    // 搜索所有书签，找到匹配的URL
    const bookmarks = await chrome.bookmarks.search({ url: url });
    
    if (bookmarks.length === 0) {
      console.log('[书签同步] 未找到匹配的浏览器书签:', url);
      return { found: false, message: '未找到匹配的书签' };
    }
    
    // 删除所有匹配的书签（理论上一个URL应该只有一个书签）
    const deletedIds = [];
    for (const bookmark of bookmarks) {
      if (bookmark.url === url) {
        await chrome.bookmarks.remove(bookmark.id);
        deletedIds.push(bookmark.id);
        console.log('[书签同步] 已删除浏览器书签:', bookmark.title, bookmark.url);
      }
    }
    
    return { 
      success: true, 
      deletedCount: deletedIds.length,
      deletedIds: deletedIds
    };
    
  } catch (error) {
    console.error('[书签同步] 删除浏览器书签错误:', error);
    throw error;
  }
}

// 移动浏览器书签到指定分类和位置
async function moveBrowserBookmark(url, targetCategory, index) {
  try {
    if (!url) {
      throw new Error('URL不能为空');
    }
    
    console.log('[书签同步] 移动浏览器书签:', url, '到分类:', targetCategory, '位置:', index);
    
    // 搜索所有书签，找到匹配的URL
    const bookmarks = await chrome.bookmarks.search({ url: url });
    
    if (bookmarks.length === 0) {
      console.log('[书签同步] 未找到匹配的浏览器书签:', url);
      return { found: false, message: '未找到匹配的书签' };
    }
    
    const bookmark = bookmarks[0]; // 使用第一个匹配的书签
    
    // 获取书签栏根节点
    const bookmarksBar = await chrome.bookmarks.getTree();
    const root = bookmarksBar[0];
    
    // 查找目标分类文件夹（如果分类不是"书签栏"）
    let targetParentId = null;
    if (targetCategory === '书签栏') {
      // 如果是"书签栏"，直接使用书签栏根节点
      const barNode = root.children.find(node => 
        node.title === '书签栏' || 
        node.title === 'Bookmarks bar' || 
        node.id === '1'
      );
      if (barNode) {
        targetParentId = barNode.id;
      }
    } else {
      // 查找目标分类文件夹
      const findFolder = async (node, folderName) => {
        if (!node.children) return null;
        
        for (const child of node.children) {
          if (!child.url && child.title === folderName) {
            return child.id;
          }
          if (child.children) {
            const found = await findFolder(child, folderName);
            if (found) return found;
          }
        }
        return null;
      };
      
      targetParentId = await findFolder(root, targetCategory);
      
      // 如果文件夹不存在，创建它
      if (!targetParentId) {
        const barNode = root.children.find(node => 
          node.title === '书签栏' || 
          node.title === 'Bookmarks bar' || 
          node.id === '1'
        );
        if (barNode) {
          const newFolder = await chrome.bookmarks.create({
            parentId: barNode.id,
            title: targetCategory
          });
          targetParentId = newFolder.id;
          console.log('[书签同步] 创建新文件夹:', targetCategory, newFolder.id);
        }
      }
    }
    
    if (!targetParentId) {
      throw new Error('无法找到或创建目标分类文件夹');
    }
    
    // 获取目标文件夹的所有子节点
    const targetFolder = await chrome.bookmarks.getChildren(targetParentId);
    
    // 确定插入位置
    let insertIndex = index !== undefined ? index : targetFolder.length;
    
    // 如果书签已经在目标文件夹中，需要调整索引
    if (bookmark.parentId === targetParentId) {
      const currentIndex = targetFolder.findIndex(b => b.id === bookmark.id);
      if (currentIndex !== -1 && insertIndex > currentIndex) {
        insertIndex--; // 如果从前面移到后面，索引需要减1
      }
    }
    
    // 移动书签到新位置
    await chrome.bookmarks.move(bookmark.id, {
      parentId: targetParentId,
      index: insertIndex
    });
    
    console.log('[书签同步] 已移动浏览器书签:', bookmark.title, '到分类:', targetCategory, '位置:', insertIndex);
    return { success: true, message: '书签已移动' };
    
  } catch (error) {
    console.error('[书签同步] 移动浏览器书签错误:', error);
    throw error;
  }
}

// 更新浏览器书签（URL或名称）
async function updateBrowserBookmark(oldUrl, newUrl, newName) {
  try {
    if (!oldUrl) {
      throw new Error('旧URL不能为空');
    }
    
    console.log('[书签同步] 更新浏览器书签:', oldUrl, '->', newUrl, newName);
    
    // 搜索所有书签，找到匹配的URL
    const bookmarks = await chrome.bookmarks.search({ url: oldUrl });
    
    if (bookmarks.length === 0) {
      console.log('[书签同步] 未找到匹配的浏览器书签:', oldUrl);
      return { found: false, message: '未找到匹配的书签' };
    }
    
    const bookmark = bookmarks[0]; // 使用第一个匹配的书签
    
    // 更新书签
    const updates = {};
    if (newName && newName !== bookmark.title) {
      updates.title = newName;
    }
    if (newUrl && newUrl !== bookmark.url) {
      updates.url = newUrl;
    }
    
    if (Object.keys(updates).length > 0) {
      await chrome.bookmarks.update(bookmark.id, updates);
      console.log('[书签同步] 已更新浏览器书签:', bookmark.id, updates);
      return { success: true, message: '书签已更新' };
    } else {
      return { success: true, message: '无需更新' };
    }
    
  } catch (error) {
    console.error('[书签同步] 更新浏览器书签错误:', error);
    throw error;
  }
}

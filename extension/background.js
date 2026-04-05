// God's Bookmark 书签同步扩展 - 后台脚本
// 监听浏览器书签变化并自动同步到网站

// 默认配置
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:3000',
  enabled: true,
  defaultCategory: '书签栏',
  syncOnCreate: true,
  syncOnUpdate: true,
  syncOnRemove: true  // 默认启用删除同步
};

let cachedServerUrl = DEFAULT_CONFIG.serverUrl;
const BOOKMARK_NODE_CACHE_KEY = 'bookmarkNodeCache';
let bookmarkCacheRefreshTimer = null;
let serverToBrowserReconcileTimer = null;
let browserToServerReconcileTimer = null;

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
  cachedServerUrl = config.serverUrl || DEFAULT_CONFIG.serverUrl;
  return config;
}

function getServerBaseUrl(serverUrl = cachedServerUrl) {
  try {
    const normalizedUrl = serverUrl || DEFAULT_CONFIG.serverUrl;
    const urlObj = new URL(normalizedUrl);
    urlObj.pathname = '';
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.toString().replace(/\/$/, '');
  } catch (error) {
    return DEFAULT_CONFIG.serverUrl;
  }
}

function getUrlPort(urlObj) {
  if (!urlObj) {
    return '';
  }

  if (urlObj.port) {
    return urlObj.port;
  }

  return urlObj.protocol === 'https:' ? '443' : '80';
}

function isConfiguredSearchPage(tabUrl, serverUrl) {
  if (!tabUrl || !serverUrl) {
    return false;
  }

  try {
    const tabUrlObj = new URL(tabUrl);
    const serverUrlObj = new URL(serverUrl);

    return tabUrlObj.protocol === serverUrlObj.protocol &&
      tabUrlObj.hostname === serverUrlObj.hostname &&
      getUrlPort(tabUrlObj) === getUrlPort(serverUrlObj) &&
      !tabUrlObj.pathname.includes('login.html');
  } catch (error) {
    console.warn('[书签同步] 无法解析搜索页 URL，回退到字符串匹配:', error);
    return tabUrl.includes(serverUrl) && !tabUrl.includes('login.html');
  }
}

async function sendOpenSearchMessage(tabId, serverUrl) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'openSearchModal'
    });
    return true;
  } catch (error) {
    console.error('[书签同步] 发送打开搜索浮窗消息失败:', error);
    if (serverUrl) {
      await chrome.tabs.create({ url: serverUrl });
    }
    return false;
  }
}

async function openSearchOverlayInTab(tabId, currentUrl, serverUrl) {
  if (!tabId) {
    if (serverUrl) {
      await chrome.tabs.create({ url: serverUrl });
    }
    return;
  }

  if (isConfiguredSearchPage(currentUrl, serverUrl)) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          if (window.openSearchModal && typeof window.openSearchModal === 'function') {
            window.openSearchModal();
          } else if (window.postMessage) {
            window.postMessage({ type: 'OPEN_SEARCH_MODAL' }, '*');
          }
        }
      });
      return;
    } catch (error) {
      console.error('[书签同步] 在书签页打开搜索浮窗失败，尝试发送消息:', error);
      await sendOpenSearchMessage(tabId, serverUrl);
      return;
    }
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['search-modal-injected.js']
    });
  } catch (error) {
    console.error('[书签同步] 注入搜索浮窗失败，尝试发送消息:', error);
    await sendOpenSearchMessage(tabId, serverUrl);
  }
}

async function openSearchOverlayInActiveTab() {
  const config = await getConfig();
  const serverUrl = config.serverUrl || DEFAULT_CONFIG.serverUrl;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tabs && tabs.length > 0) {
    const currentTab = tabs[0];
    await openSearchOverlayInTab(currentTab.id, currentTab.url || '', serverUrl);
    return;
  }

  await chrome.tabs.create({ url: serverUrl });
}

// 获取当前登录用户ID（通过content script从网站获取）
async function getCurrentUserId(config) {
  try {
    // 尝试从活动标签页获取用户信息
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      console.log('[书签同步] 没有活动标签页，无法获取用户ID');
      return null;
    }

    const tab = tabs[0];
    // 检查是否是服务器页面
    const serverUrl = config.serverUrl || 'http://localhost:3000';
    if (!tab.url || !tab.url.includes(new URL(serverUrl).hostname)) {
      console.log('[书签同步] 当前标签页不是服务器页面，无法获取用户ID');
      return null;
    }

    // 通过content script获取用户信息
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentUser' });
      if (response && response.userId !== undefined) {
        console.log('[书签同步] 获取到当前用户ID:', response.userId);
        return response.userId;
      }
    } catch (error) {
      console.log('[书签同步] 无法通过content script获取用户ID，尝试直接调用API:', error.message);
    }

    // 如果content script无法获取，尝试直接调用API（但可能无法获取cookie）
    try {
      const apiResponse = await fetch(`${serverUrl}/api/users/check-auth`, {
        method: 'GET',
        credentials: 'include' // 尝试包含cookie
      });
      if (apiResponse.ok) {
        const authData = await apiResponse.json();
        if (authData.isLoggedIn && authData.user) {
          console.log('[书签同步] 通过API获取到当前用户ID:', authData.user.id);
          return authData.user.id;
        }
      }
    } catch (error) {
      console.log('[书签同步] API调用失败:', error.message);
    }

    return null;
  } catch (error) {
    console.error('[书签同步] 获取用户ID失败:', error);
    return null;
  }
}

// 刷新服务器页面（如果当前有打开的服务器标签页）
async function refreshServerPage(config) {
  try {
    const serverUrl = config.serverUrl || 'http://localhost:3000';
    let serverHostname, serverPort;

    try {
      const serverUrlObj = new URL(serverUrl);
      serverHostname = serverUrlObj.hostname;
      serverPort = serverUrlObj.port || (serverUrlObj.protocol === 'https:' ? '443' : '80');
    } catch (e) {
      console.error('[书签同步] 无法解析服务器URL:', serverUrl);
      return;
    }

    // 查找所有打开的服务器标签页
    const tabs = await chrome.tabs.query({});
    const serverTabs = tabs.filter(tab => {
      if (!tab.url) return false;
      try {
        const tabUrl = new URL(tab.url);
        const tabPort = tabUrl.port || (tabUrl.protocol === 'https:' ? '443' : '80');
        // 检查主机名和端口是否匹配
        return tabUrl.hostname === serverHostname &&
          tabPort === serverPort &&
          (tabUrl.pathname === '/' || tabUrl.pathname === '/index.html' || tabUrl.pathname.endsWith('/'));
      } catch (e) {
        return false;
      }
    });

    if (serverTabs.length === 0) {
      console.log('[书签同步] 没有打开的服务器页面，跳过刷新');
      return;
    }

    // 刷新所有服务器标签页
    for (const tab of serverTabs) {
      try {
        // 通过content script发送刷新消息
        await chrome.tabs.sendMessage(tab.id, { action: 'reloadPage' });
        console.log('[书签同步] 已发送刷新消息到标签页:', tab.id);
      } catch (error) {
        // 如果content script未加载，直接刷新标签页
        console.log('[书签同步] Content script未加载，直接刷新标签页:', tab.id);
        await chrome.tabs.reload(tab.id);
      }
    }
  } catch (error) {
    console.error('[书签同步] 刷新页面失败:', error);
  }
}

// 保存配置
async function saveConfig(config) {
  await chrome.storage.sync.set({ bookmarkSyncConfig: config });
}

function normalizeBookmarkNodeForCache(node) {
  if (!node || !node.id) {
    return null;
  }

  return {
    id: node.id,
    title: node.title || '',
    url: node.url || '',
    parentId: node.parentId || null
  };
}

async function loadBookmarkNodeCache() {
  const result = await chrome.storage.local.get(BOOKMARK_NODE_CACHE_KEY);
  return result[BOOKMARK_NODE_CACHE_KEY] && typeof result[BOOKMARK_NODE_CACHE_KEY] === 'object'
    ? result[BOOKMARK_NODE_CACHE_KEY]
    : {};
}

async function saveBookmarkNodeCache(cache) {
  await chrome.storage.local.set({
    [BOOKMARK_NODE_CACHE_KEY]: cache
  });
}

async function cacheBookmarkNode(node) {
  const normalizedNode = normalizeBookmarkNodeForCache(node);
  if (!normalizedNode) {
    return;
  }

  const cache = await loadBookmarkNodeCache();
  cache[normalizedNode.id] = normalizedNode;
  await saveBookmarkNodeCache(cache);
}

async function consumeCachedBookmarkNode(nodeId) {
  const cache = await loadBookmarkNodeCache();
  const cachedNode = cache[nodeId] || null;

  if (cachedNode) {
    delete cache[nodeId];
    await saveBookmarkNodeCache(cache);
  }

  return cachedNode;
}

async function rebuildBookmarkNodeCache() {
  const tree = await chrome.bookmarks.getTree();
  const cache = {};

  const walk = (node) => {
    const normalizedNode = normalizeBookmarkNodeForCache(node);
    if (normalizedNode) {
      cache[normalizedNode.id] = normalizedNode;
    }

    if (node && Array.isArray(node.children)) {
      node.children.forEach(walk);
    }
  };

  tree.forEach(walk);
  await saveBookmarkNodeCache(cache);
}

function scheduleBookmarkCacheRefresh(delayMs = 300) {
  if (bookmarkCacheRefreshTimer) {
    clearTimeout(bookmarkCacheRefreshTimer);
  }

  bookmarkCacheRefreshTimer = setTimeout(() => {
    bookmarkCacheRefreshTimer = null;
    rebuildBookmarkNodeCache().catch((error) => {
      console.error('[书签同步] 刷新书签缓存失败:', error);
    });
  }, delayMs);
}

rebuildBookmarkNodeCache().catch((error) => {
  console.warn('[书签同步] 初始化书签缓存失败:', error);
});

// 获取网站favicon URL
function getFaviconUrl(url, serverUrl = cachedServerUrl) {
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

    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return null;
    }

    const apiUrl = new URL('/api/favicon', getServerBaseUrl(serverUrl));
    apiUrl.searchParams.set('url', urlObj.toString());
    return apiUrl.toString();
  } catch (e) {
    return null;
  }
}

// 将浏览器书签节点转换为网站书签格式
function convertBookmarkNode(bookmarkNode, serverUrl = cachedServerUrl) {
  if (!bookmarkNode.url) {
    // 这是文件夹，不是书签
    return null;
  }

  const faviconUrl = getFaviconUrl(bookmarkNode.url, serverUrl);
  const icon = faviconUrl
    ? `<img src="${faviconUrl}" width="16" height="16" style="vertical-align: middle;">`
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

    // 获取当前登录用户ID
    const userId = await getCurrentUserId(config);

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
    const fullFolderPath = await getBookmarkFullFolderPath(bookmarkId);
    if (folderPath) {
      categoryName = folderPath;
    } else {
      // 如果folderPath为null，说明在根目录，使用"书签栏"
      categoryName = '书签栏';
    }

    console.log('[书签同步] 书签分类:', categoryName, 'folderPath:', folderPath, 'userId:', userId);

    // 如果 userId 为 null，记录警告但继续同步（服务器端会尝试从cookie获取）
    bookmarkData.folderPath = fullFolderPath || '';

    if (userId === null || userId === undefined) {
      console.warn('[书签同步] 警告：无法获取当前用户ID，同步可能失败。请确保已登录网站。');
    }

    // 如果是创建操作，先检查服务器上该分类是否已有相同URL的书签
    if (action === 'created') {
      try {
        // 构建检查URL（处理userId为空的情况）
        let checkUrl = `${config.serverUrl}/api/bookmark/check-exists?category=${encodeURIComponent(categoryName)}&url=${encodeURIComponent(bookmarkData.url)}`;
        if (userId !== null && userId !== undefined) {
          checkUrl += `&userId=${userId}`;
        }

        const checkResponse = await fetch(checkUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (checkResponse.ok) {
          const checkResult = await checkResponse.json();
          if (checkResult.exists) {
            console.log('[书签同步] 跳过同步：分类', categoryName, '中已存在相同URL的书签:', bookmarkData.url);
            // 即使跳过，也显示成功提示（因为书签已存在）
            chrome.action.setBadgeText({ text: '✓' });
            setTimeout(() => {
              chrome.action.setBadgeText({ text: '' });
            }, 2000);
            return; // 跳过同步
          }
        } else {
          console.log('[书签同步] 检查书签是否存在失败，状态码:', checkResponse.status, '继续同步');
        }
      } catch (error) {
        console.log('[书签同步] 检查书签是否存在失败，继续同步:', error.message);
        // 检查失败时继续同步，避免阻塞
      }
    }

    // 发送到服务器
    const response = await fetch(`${config.serverUrl}/api/bookmark/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        category: categoryName,
        bookmark: bookmarkData,
        action: action,
        userId: userId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[书签同步] 服务器返回错误:', response.status, response.statusText, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[书签同步] 同步成功:', bookmarkData.name, '到分类:', categoryName, result);

    // 通知用户（可选）
    if (result.success) {
      chrome.action.setBadgeText({ text: '✓' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2000);
    } else {
      console.warn('[书签同步] 同步返回失败:', result);
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 3000);
    }

  } catch (error) {
    console.error('[书签同步] 同步失败:', error);
    console.error('[书签同步] 错误详情:', {
      message: error.message,
      stack: error.stack,
      bookmarkId: bookmarkId,
      action: action
    });
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
}

// 同步文件夹到服务器
async function syncFolderToServer(folderId, action = 'created') {
  try {
    const config = await getConfig();

    // 检查是否启用同步
    if (!config.enabled) {
      console.log('[书签同步] 同步功能已禁用');
      return;
    }

    // 检查是否启用对应的操作
    if (action === 'created' && !config.syncOnCreate) return;
    if (action === 'removed' && !config.syncOnRemove) return;

    // 获取文件夹信息（包含子节点）
    const folder = await chrome.bookmarks.getSubTree(folderId);
    if (!folder || folder.length === 0) return;

    const folderNode = folder[0];

    // 只处理文件夹（没有URL）
    if (folderNode.url) {
      console.log('[书签同步] 跳过书签，只处理文件夹');
      return;
    }

    // 检查是否是书签栏根目录（不应该同步）
    const bookmarksBarTitles = ['书签栏', 'Bookmarks bar', '书签管理器', 'Bookmarks', '书签', '其他书签', 'Other bookmarks'];
    if (bookmarksBarTitles.includes(folderNode.title) || !folderNode.parentId) {
      console.log('[书签同步] 跳过书签栏根目录:', folderNode.title);
      return;
    }

    const folderName = folderNode.title;
    console.log('[书签同步] 检测到文件夹操作:', folderName, 'action:', action);

    // 获取当前登录用户ID
    const userId = await getCurrentUserId(config);

    if (action === 'created') {
      // 创建文件夹时，同步到网站（创建分类，并同步文件夹内的所有书签）
      // 获取文件夹内的所有书签
      const bookmarks = [];
      if (folderNode.children) {
        for (const child of folderNode.children) {
          if (child.url) {
            // 这是书签
            const bookmarkData = convertBookmarkNode(child);
            if (bookmarkData) {
              bookmarks.push(bookmarkData);
            }
          }
        }
      }

      // 发送到服务器
      const response = await fetch(`${config.serverUrl}/api/bookmark/sync-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'created',
          folderName: folderName,
          bookmarks: bookmarks, // Include bookmarks inside the folder?
          userId: userId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[书签同步] 文件夹创建同步成功:', folderName, '包含', bookmarks.length, '个书签', result);
      } else {
        console.error('[书签同步] 文件夹创建同步失败:', response.status);
      }
    }

  } catch (error) {
    console.error('[书签同步] 文件夹同步失败:', error);
  }
}

// 监听书签创建
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  try {
    await cacheBookmarkNode({ ...bookmark, id });
  } catch (error) {
    console.warn('[书签同步] 写入创建节点缓存失败:', error);
  }
  scheduleBookmarkCacheRefresh();
  console.log('[书签同步] 检测到新书签或文件夹:', bookmark.title, 'ID:', id);

  // 先检查配置是否启用同步
  const config = await getConfig();
  if (!config.enabled) {
    console.log('[书签同步] 同步功能已禁用，跳过');
    return;
  }

  if (!config.syncOnCreate) {
    console.log('[书签同步] 创建同步已禁用，跳过');
    return;
  }

  // 检查是否是扩展自己创建的书签（避免循环同步）
  try {
    const syncFlag = await chrome.storage.local.get('skipNextBookmarkSync');
    if (syncFlag.skipNextBookmarkSync) {
      console.log('[书签同步] 跳过同步：这是扩展自己创建的书签，避免循环同步');
      return;
    }
  } catch (error) {
    console.log('[书签同步] 检查同步标记失败，继续同步:', error.message);
  }

  // 检查是文件夹还是书签
  try {
    const node = await chrome.bookmarks.get(id);
    if (!node || node.length === 0) {
      console.log('[书签同步] 无法获取书签节点，ID:', id);
      return;
    }

    const bookmarkNode = node[0];

    if (bookmarkNode.url) {
      // 这是书签
      console.log('[书签同步] 开始同步书签到服务器:', bookmarkNode.title, bookmarkNode.url);
      await syncBookmarkToServer(id, 'created');
    } else {
      // 这是文件夹
      console.log('[书签同步] 开始同步文件夹到服务器:', bookmarkNode.title);
      await syncFolderToServer(id, 'created');
    }
  } catch (error) {
    console.error('[书签同步] 处理书签创建失败:', error);
  }
});

// 监听书签更新
chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
  try {
    const nodes = await chrome.bookmarks.get(id);
    if (nodes && nodes.length > 0) {
      await cacheBookmarkNode(nodes[0]);
    }
  } catch (error) {
    console.warn('[书签同步] 更新节点缓存失败:', error);
  }
  scheduleBookmarkCacheRefresh();
  console.log('[书签同步] 检测到书签更新:', changeInfo.title);
  const config = await getConfig();
  if (!config.enabled || !config.syncOnUpdate) {
    console.log('[书签同步] 更新同步已禁用，跳过');
    return;
  }
  await syncBookmarkToServer(id, 'updated');
});

// 监听书签移动（改变文件夹）
chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
  try {
    const nodes = await chrome.bookmarks.get(id);
    if (nodes && nodes.length > 0) {
      await cacheBookmarkNode(nodes[0]);
    }
  } catch (error) {
    console.warn('[书签同步] 移动后更新节点缓存失败:', error);
  }
  scheduleBookmarkCacheRefresh();
  console.log('[书签同步] 检测到书签移动:', id, moveInfo);
  const config = await getConfig();
  if (!config.enabled || !config.syncOnUpdate) {
    console.log('[书签同步] 移动同步已禁用，跳过');
    return;
  }
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
      const fullFolderPath = await getBookmarkFullFolderPath(id);
      if (folderPath) {
        categoryName = folderPath;
      } else {
        // 如果folderPath为null，说明在根目录，使用"书签栏"
        categoryName = '书签栏';
      }

      console.log('[书签同步] 移动后书签分类:', categoryName, 'folderPath:', folderPath);

      bookmarkData.folderPath = fullFolderPath || '';

      // 获取当前登录用户ID
      const userId = await getCurrentUserId(config);

      // 发送移动请求（使用moved action，服务器端会处理分类移动）
      const response = await fetch(`${config.serverUrl}/api/bookmark/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'moved',
          bookmark: bookmarkData,
          category: categoryName,
          index: Number.isInteger(moveInfo.index) ? moveInfo.index : undefined,
          userId: userId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[书签同步] 书签移动同步成功:', bookmarkData.name, '到分类:', categoryName, result);
        scheduleServerToBrowserReconcile('bookmark-moved');
      }
    } catch (error) {
      console.error('[书签同步] 书签移动同步失败:', error);
    }
  }
});

// 监听书签删除
chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
  const cachedDeletedNode = await consumeCachedBookmarkNode(id);
  scheduleBookmarkCacheRefresh();
  console.log('[书签同步] 检测到书签删除事件, ID:', id, 'removeInfo:', removeInfo);
  const config = await getConfig();

  if (!config.enabled) {
    console.log('[书签同步] 同步功能已禁用，跳过删除同步');
    return;
  }

  // 检查是否是扩展自己删除的书签（避免循环同步）
  try {
    const skipFlag = await chrome.storage.local.get('skipNextBookmarkRemoveSync');
    if (skipFlag.skipNextBookmarkRemoveSync) {
      console.log('[书签同步] 跳过同步：这是扩展自己删除的书签，避免循环同步');
      return;
    }
  } catch (error) {
    console.log('[书签同步] 检查同步标记失败，继续同步:', error.message);
  }

  // 无论是单个删除还是批量删除，最终都做一次防抖全量对账，避免 Chrome 批量删除时漏事件或缺少节点信息
  if (config.syncOnRemove) {
    scheduleBrowserToServerReconcile('bookmark-removed');
  }

  // 获取被删除的书签节点信息
  let deletedNode = removeInfo.node || cachedDeletedNode;
  
  // 如果 removeInfo.node 不存在，尝试通过 id 获取（虽然已删除，但Chrome可能仍保留信息）
  if (!deletedNode) {
    console.log('[书签同步] removeInfo.node 不存在，尝试通过ID获取书签信息:', id);
    try {
      // 注意：书签删除后，chrome.bookmarks.get 可能无法获取，但我们可以尝试
      // 如果获取失败，这个删除事件就无法同步，这是Chrome API的限制
      const nodes = await chrome.bookmarks.get(id);
      if (nodes && nodes.length > 0) {
        deletedNode = nodes[0];
        console.log('[书签同步] 通过ID获取到书签信息:', deletedNode.title);
      } else {
        console.warn('[书签同步] 无法获取已删除书签的信息，ID:', id);
        console.log('[书签同步] 将依赖稍后的全量对账来同步这次删除');
        return;
      }
    } catch (error) {
      console.error('[书签同步] 获取已删除书签信息失败:', error);
      console.log('[书签同步] 将依赖稍后的全量对账来同步这次删除');
      return;
    }
  }

  if (!deletedNode) {
    console.warn('[书签同步] 无法获取删除的书签节点信息，跳过同步');
    return;
  }

  // 如果是文件夹（没有URL），同步删除网站分类
  if (!deletedNode.url) {
    console.log('[书签同步] 检测到文件夹删除，将通过全量对账同步:', deletedNode.title);
    return;
  }

  // 如果是书签（有URL），同步删除网站书签
  if (config.syncOnRemove && deletedNode.url) {
    console.log('[书签同步] 开始同步删除书签到服务器:', deletedNode.title, deletedNode.url);
    
    // 获取当前登录用户ID
    const userId = await getCurrentUserId(config);

    // 删除操作：使用删除前的书签信息
    try {
      const bookmarkData = convertBookmarkNode(deletedNode);
      if (!bookmarkData) {
        console.warn('[书签同步] 无法转换书签数据，跳过同步');
        return;
      }

      console.log('[书签同步] 发送删除请求到服务器:', bookmarkData.url);

      const response = await fetch(`${config.serverUrl}/api/bookmark/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'removed',
          bookmark: bookmarkData,
          userId: userId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[书签同步] 书签删除同步成功:', bookmarkData.name, result);

        // 刷新服务器页面
        await refreshServerPage(config);
      } else {
        const errorText = await response.text();
        console.error('[书签同步] 删除同步失败:', response.status, response.statusText, errorText);
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('[书签同步] 删除同步失败:', error);
      console.error('[书签同步] 错误详情:', {
        message: error.message,
        stack: error.stack,
        bookmarkId: id,
        bookmarkUrl: deletedNode.url
      });
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 3000);
    }
  } else {
    console.log('[书签同步] 删除同步已禁用，跳过同步');
  }
});

// 递归获取所有书签（按文件夹分类）
async function getAllBookmarks(node, categoryPath = '', config = null, fullFolderPath = '') {
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
        bookmarkData.folderPath = fullFolderPath || '';
        const normalizedFinalCategory = categoryPath || '???';
        bookmarks.push({
          bookmark: bookmarkData,
          category: normalizedFinalCategory
        });
      }
    } else if (child.children && child.children.length > 0) {
      // 这是一个文件夹
      const folderName = child.title || '未命名文件夹';

      // 使用文件夹名称作为分类（只使用第一层文件夹名称，忽略嵌套）
      // 如果 categoryPath 为空，说明这是根目录下的文件夹，使用文件夹名称
      // 如果 categoryPath 不为空，说明这是嵌套文件夹，仍然使用文件夹名称（不嵌套分类）
      const newCategory = folderName;
      const newFullFolderPath = fullFolderPath ? `${fullFolderPath}/${folderName}` : folderName;

      // 递归处理文件夹内的书签
      const folderBookmarks = await getAllBookmarks(child, newCategory, config, newFullFolderPath);
      bookmarks.push(...folderBookmarks);
    }
  }

  return bookmarks;
}

async function getBookmarkFullFolderPath(bookmarkId) {
  try {
    const bookmark = await chrome.bookmarks.get(bookmarkId);
    if (!bookmark || bookmark.length === 0) return '';

    let currentNode = bookmark[0];
    const segments = [];

    while (currentNode && currentNode.parentId) {
      const parents = await chrome.bookmarks.get(currentNode.parentId);
      if (!parents || parents.length === 0) {
        break;
      }

      const parentNode = parents[0];
      if (parentNode.id === '1' || isRootBookmarkCategory(parentNode.title) || !parentNode.parentId) {
        break;
      }

      if (!parentNode.url && parentNode.title) {
        segments.unshift(parentNode.title);
      }

      currentNode = parentNode;
    }

    return segments.join('/');
  } catch (error) {
    console.error('获取书签完整文件夹路径失败:', error);
    return '';
  }
}

function isRootBookmarkCategory(categoryName) {
  return !categoryName ||
    categoryName === '书签栏' ||
    categoryName === 'Bookmarks bar';
}

function getBookmarksBarNode(root) {
  if (!root || !root.children) {
    return null;
  }

  return root.children.find(node =>
    node.title === '书签栏' ||
    node.title === 'Bookmarks bar' ||
    node.id === '1'
  ) || null;
}

async function findFolderByName(node, folderName) {
  if (!node || !node.children) {
    return null;
  }

  for (const child of node.children) {
    if (!child.url && child.title === folderName) {
      return child;
    }
    if (child.children) {
      const found = await findFolderByName(child, folderName);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

async function setTemporarySyncFlag(flagKey, durationMs = 1000) {
  const flagValue = `${flagKey}_${Date.now()}_${Math.random()}`;
  await chrome.storage.local.set({ [flagKey]: flagValue });

  setTimeout(async () => {
    try {
      await chrome.storage.local.remove(flagKey);
    } catch (error) {
      console.warn('[书签同步] 清理同步标记失败:', flagKey, error);
    }
  }, durationMs);

  return flagValue;
}

async function createBookmarkNodeWithSyncGuard(details) {
  await setTemporarySyncFlag('skipNextBookmarkSync');
  return chrome.bookmarks.create(details);
}

async function removeBookmarkNodeWithSyncGuard(nodeId) {
  await setTemporarySyncFlag('skipNextBookmarkRemoveSync');
  return chrome.bookmarks.remove(nodeId);
}

async function removeFolderNodeWithSyncGuard(nodeId) {
  await setTemporarySyncFlag('skipNextBookmarkRemoveSync');
  return chrome.bookmarks.removeTree(nodeId);
}

function buildBookmarkIdentityKey(name, url) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedUrl = typeof url === 'string' ? url.trim() : '';
  return `${normalizedName}\n${normalizedUrl}`;
}

async function updateBookmarkNodeWithSyncGuard(nodeId, changes) {
  await setTemporarySyncFlag('skipNextBookmarkSync');
  return chrome.bookmarks.update(nodeId, changes);
}

async function reconcileFolderBookmarksWithServer(folderId, items) {
  const existingNodes = (await chrome.bookmarks.getChildren(folderId)).filter(node => node.url);
  const remainingEntries = existingNodes.map(node => ({ node, used: false }));

  let added = 0;
  let removed = 0;
  let updated = 0;

  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !item.url) {
      continue;
    }

    const exactMatch = remainingEntries.find(entry =>
      !entry.used && buildBookmarkIdentityKey(entry.node.title, entry.node.url) === buildBookmarkIdentityKey(item.name, item.url)
    );

    if (exactMatch) {
      exactMatch.used = true;
      continue;
    }

    const sameUrlMatch = remainingEntries.find(entry =>
      !entry.used && buildBookmarkIdentityKey('', entry.node.url) === buildBookmarkIdentityKey('', item.url)
    );

    if (sameUrlMatch) {
      sameUrlMatch.used = true;
      if ((sameUrlMatch.node.title || '') !== (item.name || '')) {
        await updateBookmarkNodeWithSyncGuard(sameUrlMatch.node.id, {
          title: item.name || sameUrlMatch.node.title
        });
        updated++;
      }
      continue;
    }

    await createBookmarkNodeWithSyncGuard({
      parentId: folderId,
      title: item.name,
      url: item.url
    });
    added++;
  }

  for (const entry of remainingEntries) {
    if (entry.used) {
      continue;
    }

    await removeBookmarkNodeWithSyncGuard(entry.node.id);
    removed++;
  }

  return { added, removed, updated };
}

function scheduleServerToBrowserReconcile(reason = 'unknown', delayMs = 1200) {
  if (serverToBrowserReconcileTimer) {
    clearTimeout(serverToBrowserReconcileTimer);
  }

  serverToBrowserReconcileTimer = setTimeout(() => {
    serverToBrowserReconcileTimer = null;
    syncServerToBrowser().then(() => {
      console.log('[书签同步] 移动后全量对账完成:', reason);
    }).catch(error => {
      console.error('[书签同步] 移动后全量对账失败:', reason, error);
    });
  }, delayMs);
}

function scheduleBrowserToServerReconcile(reason = 'unknown', delayMs = 1500) {
  if (browserToServerReconcileTimer) {
    clearTimeout(browserToServerReconcileTimer);
  }

  browserToServerReconcileTimer = setTimeout(() => {
    browserToServerReconcileTimer = null;
    syncBrowserToServer().then(() => {
      console.log('[书签同步] 删除后浏览器 -> 网站全量对账完成:', reason);
    }).catch(error => {
      console.error('[书签同步] 删除后浏览器 -> 网站全量对账失败:', reason, error);
    });
  }, delayMs);
}

// 同步所有书签到服务器（浏览器 → 网站）
async function syncBrowserToServer() {
  try {
    const config = await getConfig();

    if (!config.enabled) {
      console.log('[书签同步] 同步功能已禁用，跳过同步');
      return;
    }

    console.log('[书签同步] 步骤1: 开始同步浏览器 → 网站...');

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

    // 获取当前登录用户ID
    const userId = await getCurrentUserId(config);

    // 批量同步到服务器
    console.log('[书签同步] 准备发送请求到:', `${config.serverUrl}/api/bookmark/sync-all`, 'userId:', userId);
    console.log('[书签同步] 请求数据大小:', JSON.stringify({ bookmarks: bookmarksByCategory }).length, '字符');

    const response = await fetch(`${config.serverUrl}/api/bookmark/sync-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        bookmarks: bookmarksByCategory,
        userId: userId
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
    console.log('[书签同步] 浏览器 → 网站同步完成:', result);

    return result;

  } catch (error) {
    console.error('[书签同步] 浏览器 → 网站同步失败:', error);
    throw error;
  }
}

// 同步服务器书签到浏览器（网站 → 浏览器）
async function syncServerToBrowser() {
  try {
    const config = await getConfig();

    if (!config.enabled) {
      console.log('[书签同步] 同步功能已禁用，跳过同步');
      return;
    }

    console.log('[书签同步] 步骤2: 开始同步网站 -> 浏览器...');

    const userId = await getCurrentUserId(config);
    const url = new URL(`${config.serverUrl}/api/bookmark/get-all`);
    if (userId !== null) {
      url.searchParams.set('userId', userId.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const serverBookmarks = await response.json();
    console.log('[书签同步] 从服务器获取到', Array.isArray(serverBookmarks) ? serverBookmarks.length : 0, '个分类');

    if (!Array.isArray(serverBookmarks)) {
      throw new Error('服务器返回的书签数据格式不正确');
    }

    const bookmarksTree = await chrome.bookmarks.getTree();
    const root = bookmarksTree[0];
    const barNode = getBookmarksBarNode(root);
    if (barNode) {
      // no-op
    } else {
      throw new Error('无法找到书签栏');
    }
    const bookmarksBarId = barNode.id;

    let totalAdded = 0;
    let totalRemoved = 0;
    let totalUpdated = 0;
    let foldersCreated = 0;
    let foldersRemoved = 0;

    const serverCategoryMap = new Map();
    const serverFolderNames = new Set();

    for (const category of serverBookmarks) {
      const rawCategoryName = category && category.category ? category.category : '书签栏';
      const normalizedCategoryName = isRootBookmarkCategory(rawCategoryName) ? '书签栏' : rawCategoryName;
      const items = Array.isArray(category?.items) ? category.items.filter(item => item && item.url) : [];

      serverCategoryMap.set(normalizedCategoryName, items);
      if (!isRootBookmarkCategory(normalizedCategoryName)) {
        serverFolderNames.add(normalizedCategoryName);
      }
    }

    const topLevelNodes = await chrome.bookmarks.getChildren(bookmarksBarId);
    for (const child of topLevelNodes) {
      if (!child.url && !serverFolderNames.has(child.title)) {
        await removeFolderNodeWithSyncGuard(child.id);
        foldersRemoved++;
        console.log('[书签同步] 删除服务器已不存在的文件夹:', child.title);
      }
    }

    const rootItems = serverCategoryMap.get('书签栏') || [];
    const rootReconcileResult = await reconcileFolderBookmarksWithServer(bookmarksBarId, rootItems);
    totalAdded += rootReconcileResult.added;
    totalRemoved += rootReconcileResult.removed;
    totalUpdated += rootReconcileResult.updated;
    const rootChildren = await chrome.bookmarks.getChildren(bookmarksBarId);
    const rootUrls = new Set(rootItems.map(item => item.url));
    for (const node of rootChildren.filter(child => child.url)) {
      if (!rootUrls.has(node.url)) {
        await removeBookmarkNodeWithSyncGuard(node.id);
        totalRemoved++;
        console.log('[书签同步] 删除服务器已不存在的根目录书签:', node.url);
      }
    }

    for (const [categoryName, items] of serverCategoryMap.entries()) {
      let folderId = bookmarksBarId;

      if (!isRootBookmarkCategory(categoryName)) {
        let folderNode = await findFolderByName(root, categoryName);
        if (!folderNode) {
          folderNode = await createBookmarkNodeWithSyncGuard({
            parentId: bookmarksBarId,
            title: categoryName
          });
          foldersCreated++;
          console.log('[书签同步] 创建文件夹:', categoryName);
        }
        folderId = folderNode.id;
      }

      const reconcileResult = await reconcileFolderBookmarksWithServer(folderId, items);
      totalAdded += reconcileResult.added;
      totalRemoved += reconcileResult.removed;
      totalUpdated += reconcileResult.updated;
      continue;

      const existingNodes = await chrome.bookmarks.getChildren(folderId);
      const existingBookmarks = existingNodes.filter(node => node.url);
      const serverUrls = new Set(items.map(item => item.url));

      for (const existingBookmark of existingBookmarks) {
        if (!serverUrls.has(existingBookmark.url)) {
          await removeBookmarkNodeWithSyncGuard(existingBookmark.id);
          totalRemoved++;
          console.log('[书签同步] 删除服务器已不存在的书签:', existingBookmark.url, '分类:', categoryName);
        }
      }

      const remainingNodes = await chrome.bookmarks.getChildren(folderId);
      const remainingUrls = new Set(remainingNodes.filter(node => node.url).map(node => node.url));

      for (const item of items) {
        if (remainingUrls.has(item.url)) {
          continue;
        }

        try {
          await createBookmarkNodeWithSyncGuard({
            parentId: folderId,
            title: item.name,
            url: item.url
          });
          totalAdded++;
          console.log('[书签同步] 添加书签:', item.name, '到分类:', categoryName);
        } catch (createError) {
          console.error('[书签同步] 创建书签失败:', item.name, createError);
        }
      }
    }

    console.log('[书签同步] 网站 -> 浏览器同步完成:', {
      added: totalAdded,
      removed: totalRemoved,
      updated: totalUpdated,
      foldersCreated,
      foldersRemoved
    });

    return {
      added: totalAdded,
      removed: totalRemoved,
      updated: totalUpdated,
      foldersCreated,
      foldersRemoved
    };

  } catch (error) {
    console.error('[书签同步] 网站 -> 浏览器同步失败:', error);
    throw error;
  }
}

// 同步所有书签（双向同步：浏览器 → 网站，然后网站 → 浏览器）
async function syncAllBookmarks() {
  try {
    const config = await getConfig();

    if (!config.enabled) {
      console.log('[书签同步] 同步功能已禁用，跳过同步');
      return;
    }

    console.log('[书签同步] ========== 开始双向同步 ==========');

    // 步骤1: 浏览器 → 网站
    const browserToServerResult = await syncBrowserToServer();

    // 步骤2: 网站 → 浏览器
    const serverToBrowserResult = await syncServerToBrowser();

    console.log('[书签同步] ========== 双向同步完成 ==========');

    // 显示成功提示
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);

    return {
      browserToServer: browserToServerResult,
      serverToBrowser: serverToBrowserResult
    };

  } catch (error) {
    console.error('[书签同步] 双向同步失败:', error);
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
    if (newConfig && newConfig.serverUrl) {
      cachedServerUrl = newConfig.serverUrl;
    }

    // 如果从禁用变为启用，执行初始同步
    if (newConfig && (!oldConfig || !oldConfig.enabled) && newConfig.enabled) {
      console.log('[书签同步] 检测到启用同步，开始初始同步...');
      syncAllBookmarks();
    }
  }
});

// 初始化：检查服务器连接
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    await rebuildBookmarkNodeCache();
  } catch (error) {
    console.warn('[书签同步] 安装后重建书签缓存失败:', error);
  }
  console.log('[书签同步] 扩展已安装，原因:', details.reason);
  const config = await getConfig();

  // 测试服务器连接
  try {
    const response = await fetch(`${config.serverUrl}/api/users/check-auth`, {
      credentials: 'include'
    });
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

  if (request.action === 'deleteBookmarkExact') {
    console.log('[书签同步] 收到精确删除书签请求（来自网站）:', request.bookmark);

    deleteBrowserBookmarkExact(request.bookmark, true)
      .then(result => {
        console.log('[书签同步] 浏览器书签精确删除结果:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 精确删除浏览器书签失败:', error);
        sendResponse({ success: false, error: error.message || '精确删除失败' });
      });

    return true;
  }

  if (request.action === 'syncServerToBrowserNow') {
    syncServerToBrowser()
      .then(result => {
        console.log('[书签同步] 已执行网站到浏览器全量对账:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 网站到浏览器全量对账失败:', error);
        sendResponse({ success: false, error: error.message || '全量对账失败' });
      });

    return true;
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

  if (request.action === 'addBookmark') {
    console.log('[书签同步] 收到添加书签请求（来自网站）:', request);

    // 从网站添加书签时，同步到浏览器
    addBrowserBookmark(request.url, request.name, request.category, request.index)
      .then(result => {
        console.log('[书签同步] 浏览器书签添加结果:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 添加浏览器书签失败:', error);
        sendResponse({ success: false, error: error.message || '添加失败' });
      });

    return true; // 保持消息通道开放以支持异步响应
  }

  if (request.action === 'deleteFolder') {
    console.log('[书签同步] 收到删除文件夹请求（来自网站）:', request.folderName);

    // 从网站删除分类时，同步删除浏览器文件夹
    deleteBrowserFolder(request.folderName)
      .then(result => {
        console.log('[书签同步] 浏览器文件夹删除结果:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 删除浏览器文件夹失败:', error);
        sendResponse({ success: false, error: error.message || '删除失败' });
      });

    return true; // 保持消息通道开放以支持异步响应
  }

  if (request.action === 'addFolder') {
    console.log('[书签同步] 收到添加文件夹请求（来自网站）:', request.folderName);

    // 从网站添加分类时，同步创建浏览器文件夹
    addBrowserFolder(request.folderName)
      .then(result => {
        console.log('[书签同步] 浏览器文件夹添加结果:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[书签同步] 添加浏览器文件夹失败:', error);
        sendResponse({ success: false, error: error.message || '添加失败' });
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

  if (request.action === 'openSearchOverlay') {
    (async () => {
      const config = await getConfig();
      const serverUrl = config.serverUrl || DEFAULT_CONFIG.serverUrl;
      const senderTab = sender && sender.tab ? sender.tab : null;

      if (senderTab && senderTab.id) {
        await openSearchOverlayInTab(senderTab.id, senderTab.url || '', serverUrl);
      } else {
        await openSearchOverlayInActiveTab();
      }

      sendResponse({ success: true });
    })().catch(error => {
      console.error('[书签同步] 打开搜索浮窗失败:', error);
      sendResponse({ success: false, error: error.message || '打开搜索浮窗失败' });
    });

    return true;
  }

  // 对于其他消息，返回 false 表示同步处理
  return false;
});

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[书签同步] 收到命令:', command);

  if (command === 'open-search') {
    try {
      await openSearchOverlayInActiveTab();
    } catch (error) {
      console.error('[书签同步] 获取配置失败:', error);
      await chrome.tabs.create({
        url: DEFAULT_CONFIG.serverUrl
      });
    }
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

    // 设置跳过同步标记，避免删除事件触发循环同步
    const skipFlag = `skip_remove_sync_${Date.now()}_${Math.random()}`;
    await chrome.storage.local.set({ skipNextBookmarkRemoveSync: skipFlag });
    console.log('[书签同步] 已设置跳过删除同步标记，避免循环同步');

    try {
      // 删除所有匹配的书签（理论上一个URL应该只有一个书签）
      const deletedIds = [];
      for (const bookmark of bookmarks) {
        if (bookmark.url === url) {
          await chrome.bookmarks.remove(bookmark.id);
          deletedIds.push(bookmark.id);
          console.log('[书签同步] 已删除浏览器书签:', bookmark.title, bookmark.url);
        }
      }

      // 延迟清除标记，确保删除事件监听器有机会检查
      setTimeout(async () => {
        await chrome.storage.local.remove('skipNextBookmarkRemoveSync');
        console.log('[书签同步] 已清除跳过删除同步标记');
      }, 1000);

      return {
        success: true,
        deletedCount: deletedIds.length,
        deletedIds: deletedIds
      };
    } catch (deleteError) {
      // 如果删除失败，清除标记
      await chrome.storage.local.remove('skipNextBookmarkRemoveSync');
      throw deleteError;
    }

  } catch (error) {
    console.error('[书签同步] 删除浏览器书签错误:', error);
    // 确保清除标记
    try {
      await chrome.storage.local.remove('skipNextBookmarkRemoveSync');
    } catch (e) {
      // 忽略清除标记的错误
    }
    throw error;
  }
}

function normalizeBookmarkMatchText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function deleteBrowserBookmarkExact(bookmarkInfo, skipConfigCheck = false) {
  try {
    const targetUrl = normalizeBookmarkMatchText(bookmarkInfo?.url);
    const targetName = normalizeBookmarkMatchText(bookmarkInfo?.name);
    const targetFolderPath = normalizeBookmarkMatchText(bookmarkInfo?.folderPath);
    const rawCategory = normalizeBookmarkMatchText(bookmarkInfo?.category);
    const targetCategory = !rawCategory || isRootBookmarkCategory(rawCategory) ? '' : rawCategory;
    const targetPath = targetFolderPath || targetCategory;

    if (!targetUrl) {
      throw new Error('URL不能为空');
    }

    if (!skipConfigCheck) {
      const config = await getConfig();
      if (!config.syncOnRemove) {
        return { skipped: true, reason: '删除同步已禁用' };
      }
    }

    const bookmarks = await chrome.bookmarks.search({ url: targetUrl });
    if (!bookmarks.length) {
      return { found: false, message: '未找到匹配的书签' };
    }

    const candidates = [];
    for (const bookmark of bookmarks) {
      if (bookmark.url !== targetUrl) {
        continue;
      }

      if (targetName && normalizeBookmarkMatchText(bookmark.title) !== targetName) {
        continue;
      }

      const fullFolderPath = normalizeBookmarkMatchText(await getBookmarkFullFolderPath(bookmark.id));
      if (targetPath && fullFolderPath !== targetPath) {
        continue;
      }
      if (!targetPath && fullFolderPath) {
        continue;
      }

      candidates.push(bookmark);
    }

    const bookmarkToDelete = candidates[0];
    if (!bookmarkToDelete) {
      return { found: false, message: '未找到精确匹配的书签' };
    }

    await removeBookmarkNodeWithSyncGuard(bookmarkToDelete.id);
    console.log('[书签同步] 已精确删除浏览器书签:', {
      title: bookmarkToDelete.title,
      url: bookmarkToDelete.url,
      category: targetCategory || '书签栏',
      folderPath: targetPath || ''
    });

    return {
      success: true,
      deletedId: bookmarkToDelete.id,
      title: bookmarkToDelete.title,
      url: bookmarkToDelete.url
    };
  } catch (error) {
    console.error('[书签同步] 精确删除浏览器书签失败:', error);
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

    // 计算实际的书签数量（排除文件夹）
    const bookmarkCount = targetFolder.filter(b => b.url).length;

    // 确定插入位置（确保不超出范围）
    let insertIndex = index !== undefined ? Math.min(index, bookmarkCount) : bookmarkCount;

    // 如果书签已经在目标文件夹中，需要调整索引
    if (bookmark.parentId === targetParentId) {
      const currentIndex = targetFolder.findIndex(b => b.id === bookmark.id);
      if (currentIndex !== -1) {
        if (insertIndex > currentIndex) {
          insertIndex--; // 如果从前面移到后面，索引需要减1
        }
        // 确保索引在有效范围内
        insertIndex = Math.max(0, Math.min(insertIndex, bookmarkCount - 1));
      }
    } else {
      // 如果书签不在目标文件夹中，确保索引不超过当前书签数量
      insertIndex = Math.min(insertIndex, bookmarkCount);
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

// 添加浏览器书签（从网站添加时调用）
async function addBrowserBookmark(url, name, category, index) {
  try {
    if (!url || !name) {
      throw new Error('URL和名称不能为空');
    }

    console.log('[书签同步] 添加浏览器书签:', { url, name, category, index });

    // 获取书签栏根节点
    const bookmarksBar = await chrome.bookmarks.getTree();
    const root = bookmarksBar[0];

    // 查找目标分类文件夹（如果分类不是"书签栏"）
    let targetParentId = null;
    if (category === '书签栏' || !category) {
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

      targetParentId = await findFolder(root, category);

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
            title: category
          });
          targetParentId = newFolder.id;
          console.log('[书签同步] 创建新文件夹:', category, newFolder.id);
        }
      }
    }

    if (!targetParentId) {
      throw new Error('无法找到或创建目标分类文件夹');
    }

    // 检查目标文件夹中是否已存在相同URL的书签
    const targetFolder = await chrome.bookmarks.getChildren(targetParentId);
    const existingBookmark = targetFolder.find(b => b.url === url);

    if (existingBookmark) {
      console.log('[书签同步] 跳过添加：文件夹', category, '中已存在相同URL的书签:', url);
      return { success: true, message: '书签已存在', skipped: true };
    }

    // 计算实际的书签数量（排除文件夹）
    const bookmarkCount = targetFolder.filter(b => b.url).length;

    // 确定插入位置（确保不超出范围）
    // 如果不指定 index，添加到末尾；如果指定了，确保不超过当前书签数量
    let insertIndex = index !== undefined ? Math.min(index, bookmarkCount) : bookmarkCount;

    // 创建书签（临时禁用同步监听，避免循环同步）
    // 使用一个标记来防止循环同步
    const syncFlag = `skip_sync_${Date.now()}_${Math.random()}`;
    await chrome.storage.local.set({ skipNextBookmarkSync: syncFlag });

    try {
      const newBookmark = await chrome.bookmarks.create({
        parentId: targetParentId,
        title: name,
        url: url,
        index: insertIndex
      });

      // 清除标记（延迟清除，确保监听器有机会检查）
      setTimeout(async () => {
        await chrome.storage.local.remove('skipNextBookmarkSync');
      }, 1000);

      console.log('[书签同步] 已添加浏览器书签:', name, '到分类:', category, '位置:', insertIndex);
      return { success: true, bookmarkId: newBookmark.id };
    } catch (createError) {
      // 如果创建失败（可能是索引问题），尝试不指定 index
      console.warn('[书签同步] 使用索引创建失败，尝试添加到末尾:', createError);
      try {
        const newBookmark = await chrome.bookmarks.create({
          parentId: targetParentId,
          title: name,
          url: url
          // 不指定 index，让浏览器自动添加到末尾
        });

        // 清除标记
        setTimeout(async () => {
          await chrome.storage.local.remove('skipNextBookmarkSync');
        }, 1000);

        console.log('[书签同步] 已添加浏览器书签（重试）:', name, '到分类:', category);
        return { success: true, bookmarkId: newBookmark.id };
      } catch (retryError) {
        // 清除标记
        await chrome.storage.local.remove('skipNextBookmarkSync');
        throw retryError;
      }
    }

    // 清除标记（延迟清除，确保监听器有机会检查）
    setTimeout(async () => {
      await chrome.storage.local.remove('skipNextBookmarkSync');
    }, 1000);

    console.log('[书签同步] 已添加浏览器书签:', name, '到分类:', category, '位置:', insertIndex);
    return { success: true, message: '书签已添加', bookmarkId: newBookmark.id };

  } catch (error) {
    console.error('[书签同步] 添加浏览器书签错误:', error);
    throw error;
  }
}

// 删除浏览器文件夹（从网站删除分类时调用）
async function deleteBrowserFolder(folderName) {
  try {
    if (!folderName) {
      throw new Error('文件夹名称不能为空');
    }

    console.log('[书签同步] 删除浏览器文件夹:', folderName);

    // 获取书签栏根节点
    const bookmarksBar = await chrome.bookmarks.getTree();
    const root = bookmarksBar[0];

    // 查找目标文件夹
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

    const folderId = await findFolder(root, folderName);

    if (!folderId) {
      console.log('[书签同步] 未找到匹配的浏览器文件夹:', folderName);
      return { found: false, message: '未找到匹配的文件夹' };
    }

    // 删除文件夹（会同时删除文件夹内的所有书签）
    await removeFolderNodeWithSyncGuard(folderId);
    console.log('[书签同步] 已删除浏览器文件夹:', folderName);
    return { success: true, message: '文件夹已删除' };

  } catch (error) {
    console.error('[书签同步] 删除浏览器文件夹错误:', error);
    throw error;
  }
}

// 添加浏览器文件夹（从网站添加分类时调用）
async function addBrowserFolder(folderName) {
  try {
    if (!folderName) {
      throw new Error('文件夹名称不能为空');
    }

    console.log('[书签同步] 添加浏览器文件夹:', folderName);

    // 获取书签栏根节点
    const bookmarksBar = await chrome.bookmarks.getTree();
    const root = bookmarksBar[0];

    // 查找书签栏
    const barNode = root.children.find(node =>
      node.title === '书签栏' ||
      node.title === 'Bookmarks bar' ||
      node.id === '1'
    );

    if (!barNode) {
      throw new Error('无法找到书签栏');
    }

    // 检查文件夹是否已存在
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

    const existingFolderId = await findFolder(root, folderName);

    if (existingFolderId) {
      console.log('[书签同步] 文件夹已存在:', folderName);
      return { success: true, message: '文件夹已存在', folderId: existingFolderId };
    }

    // 创建新文件夹
    const newFolder = await createBookmarkNodeWithSyncGuard({
      parentId: barNode.id,
      title: folderName
    });

    console.log('[书签同步] 已创建浏览器文件夹:', folderName, newFolder.id);
    return { success: true, message: '文件夹已创建', folderId: newFolder.id };

  } catch (error) {
    console.error('[书签同步] 添加浏览器文件夹错误:', error);
    throw error;
  }
}

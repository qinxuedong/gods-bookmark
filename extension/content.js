// Content script - 在网站页面中运行，用于接收网站的删除请求并转发给background
(function () {
  'use strict';

  console.log('[书签同步-Content] Content script loaded');

  // 初始化时检查扩展上下文
  if (!chrome || !chrome.runtime) {
    console.warn('[书签同步-Content] 警告：扩展上下文不可用。请确保扩展已安装并启用。');
  } else {
    try {
      const extensionId = chrome.runtime.id;
      if (!extensionId) {
        console.warn('[书签同步-Content] 警告：无法获取扩展ID，扩展可能已失效。请重新加载扩展。');
      }
    } catch (e) {
      console.warn('[书签同步-Content] 警告：扩展上下文检查失败:', e.message);
    }
  }

  // 检查扩展上下文是否有效
  function isExtensionContextValid() {
    try {
      // 尝试访问 chrome.runtime.id，如果上下文失效会抛出错误
      if (!chrome || !chrome.runtime) {
        return false;
      }
      const id = chrome.runtime.id;
      return id !== undefined && id !== null;
    } catch (e) {
      return false;
    }
  }

  // 记录上下文失效的次数，避免频繁警告
  let contextInvalidatedCount = 0;
  const MAX_WARNINGS = 3; // 最多显示3次警告

  // 检查当前页面是否是配置的服务器页面
  async function isServerPage() {
    try {
      if (!isExtensionContextValid()) {
        return false;
      }

      // 获取配置的服务器URL
      return new Promise((resolve) => {
        chrome.storage.sync.get(['bookmarkSyncConfig'], (result) => {
          if (chrome.runtime.lastError) {
            // 如果无法获取配置，默认允许 localhost:3000
            const currentUrl = window.location.href;
            resolve(currentUrl.includes('localhost:3000') || currentUrl.includes('127.0.0.1:3000'));
            return;
          }

          const config = result.bookmarkSyncConfig || {};
          const serverUrl = config.serverUrl || 'http://localhost:3000';

          try {
            const serverUrlObj = new URL(serverUrl);
            const currentUrlObj = new URL(window.location.href);

            // 检查是否是同一个主机（hostname + port）
            const isMatch = serverUrlObj.hostname === currentUrlObj.hostname &&
              serverUrlObj.port === currentUrlObj.port;

            resolve(isMatch);
          } catch (e) {
            // URL解析失败，使用字符串匹配
            const currentUrl = window.location.href;
            let serverHost = '';
            try {
              serverHost = new URL(serverUrl).hostname || '';
            } catch (parseError) {
              serverHost = '';
            }

            resolve(currentUrl.includes(serverUrl) ||
              (!!serverHost && currentUrl.includes(serverHost)));
          }
        });
      });
    } catch (error) {
      console.error('[书签同步-Content] 检查服务器页面失败:', error);
      return false;
    }
  }

  // 安全地发送消息到background script
  function sendMessageSafely(message, callback) {
    if (!isExtensionContextValid()) {
      // 限制警告次数，避免控制台被刷屏
      if (contextInvalidatedCount < MAX_WARNINGS) {
        console.warn('[书签同步-Content] 扩展上下文已失效，无法发送消息。请重新加载页面或重新加载扩展。');
        contextInvalidatedCount++;
      }
      if (callback) {
        callback({ error: 'Extension context invalidated' });
      }
      return;
    }

    // 重置计数器（上下文有效时）
    contextInvalidatedCount = 0;

    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError.message;
          // 忽略上下文失效的错误（扩展可能正在重新加载）
          if (error && error.includes('Extension context invalidated')) {
            if (contextInvalidatedCount < MAX_WARNINGS) {
              console.warn('[书签同步-Content] 扩展上下文已失效:', error);
              contextInvalidatedCount++;
            }
          } else {
            console.error('[书签同步-Content] 发送消息失败:', error);
          }
          if (callback) {
            callback({ error: error });
          }
        } else {
          // 重置计数器（成功时）
          contextInvalidatedCount = 0;
          if (callback) {
            callback(response);
          }
        }
      });
    } catch (error) {
      console.error('[书签同步-Content] 发送消息异常:', error);
      if (callback) {
        callback({ error: error.message });
      }
    }
  }

  // 监听来自网站的消息
  window.addEventListener('message', async function (event) {
    // 验证消息来源（可选，增加安全性）
    if (event.source !== window) {
      return;
    }

    // 检查是否是服务器页面（只处理服务器页面的消息）
    const isServer = await isServerPage();
    if (!isServer) {
      return; // 不是服务器页面，忽略消息
    }

    // 处理书签数据同步（新增）
    // 处理书签数据同步（新增）
    if (event.data && event.data.type === 'SYNC_BOOKMARK_DATA' && event.data.data) {
      try {
        // 写入Chrome存储
        chrome.storage.local.set({
          'godsBookmarkSearchData': event.data.data
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('[书签同步-Content] 同步失败:', chrome.runtime.lastError);
          } else {
            // 可以选择发送确认消息回网站
            window.postMessage({
              type: 'SYNC_BOOKMARK_DATA_SUCCESS',
              count: event.data.data.bookmarksCache.length
            }, '*');
          }
        });
      } catch (error) {
        console.error('[书签同步-Content] 同步失败:', error);
      }
      return;
    }

    // 处理删除书签的消息
    if (event.data && event.data.type === 'DELETE_BOOKMARK' && event.data.url) {
      console.log('[书签同步-Content] 收到删除书签请求:', event.data.url);

      // 转发消息给background script
      sendMessageSafely({
        action: 'deleteBookmark',
        url: event.data.url
      }, (response) => {
        if (response && !response.error) {
          console.log('[书签同步-Content] 删除结果:', response);
        }
      });
    }

    if (event.data && event.data.type === 'DELETE_BOOKMARK_EXACT' && event.data.bookmark && event.data.bookmark.url) {
      console.log('[书签同步-Content] 收到精确删除书签请求:', event.data.bookmark);

      sendMessageSafely({
        action: 'deleteBookmarkExact',
        bookmark: event.data.bookmark
      }, (response) => {
        if (response && !response.error) {
          console.log('[书签同步-Content] 精确删除结果:', response);
        }
      });
    }

    // 处理移动书签的消息
    if (event.data && event.data.type === 'MOVE_BOOKMARK' && event.data.url) {
      console.log('[书签同步-Content] 收到移动书签请求:', event.data);

      // 转发消息给background script
      sendMessageSafely({
        action: 'moveBookmark',
        url: event.data.url,
        targetCategory: event.data.targetCategory,
        index: event.data.index
      }, (response) => {
        if (response && !response.error) {
          console.log('[书签同步-Content] 移动结果:', response);
        }
      });
    }

    // 处理更新书签的消息
    if (event.data && event.data.type === 'UPDATE_BOOKMARK' && event.data.oldUrl) {
      console.log('[书签同步-Content] 收到更新书签请求:', event.data);

      // 转发消息给background script
      sendMessageSafely({
        action: 'updateBookmark',
        oldUrl: event.data.oldUrl,
        newUrl: event.data.newUrl,
        newName: event.data.newName
      }, (response) => {
        if (response && !response.error) {
          console.log('[书签同步-Content] 更新结果:', response);
        }
      });
    }

    // 处理添加书签的消息
    if (event.data && event.data.type === 'ADD_BOOKMARK' && event.data.url) {
      console.log('[书签同步-Content] 收到添加书签请求:', event.data);

      // 转发消息给background script
      sendMessageSafely({
        action: 'addBookmark',
        url: event.data.url,
        name: event.data.name,
        category: event.data.category,
        index: event.data.index
      }, (response) => {
        if (response && !response.error) {
          console.log('[书签同步-Content] 添加结果:', response);
        }
      });
    }

    // 处理删除文件夹的消息
    if (event.data && event.data.type === 'DELETE_FOLDER' && event.data.folderName) {
      console.log('[书签同步-Content] 收到删除文件夹请求:', event.data.folderName);

      // 转发消息给background script
      sendMessageSafely({
        action: 'deleteFolder',
        folderName: event.data.folderName
      }, (response) => {
        if (response && !response.error) {
          console.log('[书签同步-Content] 删除文件夹结果:', response);
        }
      });
    }

    // 处理添加文件夹的消息
    if (event.data && event.data.type === 'ADD_FOLDER' && event.data.folderName) {
      console.log('[书签同步-Content] 收到添加文件夹请求:', event.data.folderName);

      // 转发消息给background script
      sendMessageSafely({
        action: 'addFolder',
        folderName: event.data.folderName
      }, (response) => {
        if (response && !response.error) {
          console.log('[书签同步-Content] 添加文件夹结果:', response);
        }
      });
    }
  });

  // 监听来自background的消息（用于打开搜索浮窗和获取用户信息）
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 检查扩展上下文是否有效
    if (!isExtensionContextValid()) {
      if (contextInvalidatedCount < MAX_WARNINGS) {
        console.warn('[书签同步-Content] 扩展上下文已失效，无法处理消息');
        contextInvalidatedCount++;
      }
      sendResponse({ error: 'Extension context invalidated' });
      return false;
    }

    // 重置计数器（上下文有效时）
    contextInvalidatedCount = 0;

    try {
      if (request.action === 'openSearchModal') {
        // 向页面发送消息，打开搜索浮窗
        window.postMessage({
          type: 'OPEN_SEARCH_MODAL'
        }, '*');
        sendResponse({ success: true });
        return false;
      }

      if (request.action === 'reloadPage') {
        // 刷新页面
        console.log('[书签同步-Content] 收到刷新页面请求');
        window.location.reload();
        sendResponse({ success: true });
        return false;
      }

      if (request.action === 'getCurrentUser') {
        // 获取当前登录用户信息
        (async () => {
          try {
            // 方法1: 尝试从cookie获取
            const cookies = document.cookie.split(';');
            let userId = null;
            let authToken = null;

            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'user_id') {
                userId = parseInt(value);
              } else if (name === 'auth_token') {
                authToken = value;
              }
            }

            // 方法2: 如果cookie中没有，尝试调用API
            if (!userId) {
              try {
                const response = await fetch('/api/users/check-auth', {
                  method: 'GET',
                  credentials: 'include'
                });
                if (response.ok) {
                  const data = await response.json();
                  if (data.isLoggedIn && data.user) {
                    userId = data.user.id;
                  }
                }
              } catch (error) {
                console.error('[书签同步-Content] API调用失败:', error);
              }
            }

            sendResponse({ userId: userId || null });
          } catch (error) {
            console.error('[书签同步-Content] 获取用户信息失败:', error);
            sendResponse({ userId: null });
          }
        })();

        return true; // 保持消息通道开放以支持异步响应
      }
    } catch (error) {
      console.error('[书签同步-Content] 处理消息时发生错误:', error);
      sendResponse({ error: error.message });
      return false;
    }
  });

  // 注入一个全局函数，让网站可以直接调用（可选，更方便的方式）
  // 只在服务器页面上注入
  (async function () {
    const isServer = await isServerPage();
    if (!isServer) {
      return; // 不是服务器页面，不注入全局函数
    }

    function sendActionAsPromise(payload, successMessage) {
      return new Promise((resolve, reject) => {
        if (!isExtensionContextValid()) {
          resolve({ skipped: true, error: 'Extension context invalidated' });
          return;
        }

        sendMessageSafely(payload, (response) => {
          if (response && !response.error && response.success !== false) {
            if (successMessage) {
              console.log(successMessage, response);
            }
            resolve(response);
            return;
          }

          const errorMessage = response && response.error ? response.error : 'No response';
          if (errorMessage && errorMessage.includes('Extension context invalidated')) {
            resolve({ skipped: true, error: errorMessage });
            return;
          }
          reject(new Error(errorMessage));
        });
      });
    }

    window.godsBookmarkExtension = {
      isReady: function () {
        return isExtensionContextValid();
      },

      deleteBookmark: function (url) {
        console.log('[书签同步-Content] 通过API删除书签:', url);
        return sendActionAsPromise({
          action: 'deleteBookmark',
          url: url
        }, '[书签同步-Content] 删除成功:');
      },

      deleteBookmarkExact: function (url, name, category, folderPath) {
        console.log('[书签同步-Content] 通过API精确删除书签:', url, name, category, folderPath);
        return sendActionAsPromise({
          action: 'deleteBookmarkExact',
          bookmark: {
            url: url,
            name: name,
            category: category,
            folderPath: folderPath
          }
        }, '[书签同步-Content] 精确删除成功:');
      },

      syncServerBookmarks: function () {
        return sendActionAsPromise({
          action: 'syncServerToBrowserNow'
        }, '[书签同步-Content] 服务端书签已同步到浏览器:');
      },

      moveBookmark: function (url, targetCategory, index) {
        console.log('[书签同步-Content] 通过API移动书签:', url, targetCategory, index);
        return sendActionAsPromise({
          action: 'moveBookmark',
          url: url,
          targetCategory: targetCategory,
          index: index
        }, '[书签同步-Content] 移动成功:');
      },

      updateBookmark: function (oldUrl, newUrl, newName) {
        console.log('[书签同步-Content] 通过API更新书签:', oldUrl, newUrl, newName);
        return sendActionAsPromise({
          action: 'updateBookmark',
          oldUrl: oldUrl,
          newUrl: newUrl,
          newName: newName
        }, '[书签同步-Content] 更新成功:');
      },

      addBookmark: function (url, name, category, index) {
        console.log('[书签同步-Content] 通过API添加书签:', url, name, category, index);
        return sendActionAsPromise({
          action: 'addBookmark',
          url: url,
          name: name,
          category: category,
          index: index
        }, '[书签同步-Content] 添加成功:');
      },

      deleteFolder: function (folderName) {
        console.log('[书签同步-Content] 通过API删除文件夹:', folderName);
        return sendActionAsPromise({
          action: 'deleteFolder',
          folderName: folderName
        }, '[书签同步-Content] 删除文件夹成功:');
      },

      addFolder: function (folderName) {
        console.log('[书签同步-Content] 通过API添加文件夹:', folderName);
        return sendActionAsPromise({
          action: 'addFolder',
          folderName: folderName
        }, '[书签同步-Content] 添加文件夹成功:');
      }
    };

    console.log('[书签同步-Content] Content script initialized on server page');
  })();

  // 即使不是服务器页面，也记录初始化日志
  console.log('[书签同步-Content] Content script loaded');

  // ===== 全局搜索快捷键支持 =====
  // 监听快捷键，在不同页面上统一走后台的搜索浮窗逻辑
  let pendingSearchOverlayFallback = false;

  function hasVisibleSearchModal() {
    const siteModal = document.getElementById('global-search-modal');
    if (siteModal) {
      const display = window.getComputedStyle(siteModal).display;
      if (display !== 'none') {
        return true;
      }
    }

    return !!document.getElementById('gods-bookmark-search-modal');
  }

  document.addEventListener('keydown', function (e) {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (!e.ctrlKey || e.altKey || e.shiftKey || e.code !== 'Space') {
      return;
    }

    e.preventDefault();

    if (pendingSearchOverlayFallback) {
      return;
    }

    pendingSearchOverlayFallback = true;

    window.setTimeout(() => {
      pendingSearchOverlayFallback = false;

      // 如果页面原生快捷键或 Commands API 已经拉起搜索框，就不再重复触发
      if (hasVisibleSearchModal()) {
        return;
      }

      if (!isExtensionContextValid()) {
        if (contextInvalidatedCount < MAX_WARNINGS) {
          console.warn('[书签同步-Content] 扩展上下文已失效，无法打开搜索。请重新加载页面。');
          contextInvalidatedCount++;
        }
        return;
      }

      sendMessageSafely({
        action: 'openSearchOverlay'
      });
    }, 120);
    const event = { data: null };
    if (event.data && event.data.type === 'SYNC_SERVER_BOOKMARKS') {
      console.log('[涔︾鍚屾-Content] 鏀跺埌缃戠珯鍒版祻瑙堝櫒鍏ㄩ噺瀵硅处璇锋眰');

      sendMessageSafely({
        action: 'syncServerToBrowserNow'
      }, (response) => {
        if (response && !response.error) {
          console.log('[涔︾鍚屾-Content] 鍏ㄩ噺瀵硅处缁撴灉:', response);
        }
      });
    }
  });
})();

window.addEventListener('message', function (event) {
  if (event.source !== window) {
    return;
  }

  if (!event.data || event.data.type !== 'SYNC_SERVER_BOOKMARKS') {
    return;
  }

  if (!window.godsBookmarkExtension ||
      typeof window.godsBookmarkExtension.isReady !== 'function' ||
      !window.godsBookmarkExtension.isReady()) {
    return;
  }

  if (window.godsBookmarkExtension && typeof window.godsBookmarkExtension.syncServerBookmarks === 'function') {
    window.godsBookmarkExtension.syncServerBookmarks().catch((error) => {
      if (error && error.message && error.message.includes('Extension context invalidated')) {
        return;
      }
      console.error('[书签同步-Content] 全量对账触发失败:', error);
    });
  }
});

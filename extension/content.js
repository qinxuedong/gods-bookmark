// Content script - 在网站页面中运行，用于接收网站的删除请求并转发给background
(function() {
  'use strict';
  
  console.log('[书签同步-Content] Content script loaded');
  
  // 监听来自网站的消息
  window.addEventListener('message', function(event) {
    // 验证消息来源（可选，增加安全性）
    if (event.source !== window) {
      return;
    }
    
    // 处理删除书签的消息
    if (event.data && event.data.type === 'DELETE_BOOKMARK' && event.data.url) {
      console.log('[书签同步-Content] 收到删除书签请求:', event.data.url);
      
      // 转发消息给background script
      chrome.runtime.sendMessage({
        action: 'deleteBookmark',
        url: event.data.url
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[书签同步-Content] 发送消息失败:', chrome.runtime.lastError);
        } else {
          console.log('[书签同步-Content] 删除结果:', response);
        }
      });
    }
    
    // 处理移动书签的消息
    if (event.data && event.data.type === 'MOVE_BOOKMARK' && event.data.url) {
      console.log('[书签同步-Content] 收到移动书签请求:', event.data);
      
      // 转发消息给background script
      chrome.runtime.sendMessage({
        action: 'moveBookmark',
        url: event.data.url,
        targetCategory: event.data.targetCategory,
        index: event.data.index
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[书签同步-Content] 发送消息失败:', chrome.runtime.lastError);
        } else {
          console.log('[书签同步-Content] 移动结果:', response);
        }
      });
    }
    
    // 处理更新书签的消息
    if (event.data && event.data.type === 'UPDATE_BOOKMARK' && event.data.oldUrl) {
      console.log('[书签同步-Content] 收到更新书签请求:', event.data);
      
      // 转发消息给background script
      chrome.runtime.sendMessage({
        action: 'updateBookmark',
        oldUrl: event.data.oldUrl,
        newUrl: event.data.newUrl,
        newName: event.data.newName
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[书签同步-Content] 发送消息失败:', chrome.runtime.lastError);
        } else {
          console.log('[书签同步-Content] 更新结果:', response);
        }
      });
    }
  });
  
  // 监听来自background的消息（用于打开搜索浮窗）
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSearchModal') {
      // 向页面发送消息，打开搜索浮窗
      window.postMessage({
        type: 'OPEN_SEARCH_MODAL'
      }, '*');
      sendResponse({ success: true });
    }
  });
  
  // 注入一个全局函数，让网站可以直接调用（可选，更方便的方式）
  window.godsBookmarkExtension = {
    deleteBookmark: function(url) {
      console.log('[书签同步-Content] 通过API删除书签:', url);
      chrome.runtime.sendMessage({
        action: 'deleteBookmark',
        url: url
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[书签同步-Content] 删除失败:', chrome.runtime.lastError);
        } else {
          console.log('[书签同步-Content] 删除成功:', response);
        }
      });
    },
    
    moveBookmark: function(url, targetCategory, index) {
      console.log('[书签同步-Content] 通过API移动书签:', url, targetCategory, index);
      chrome.runtime.sendMessage({
        action: 'moveBookmark',
        url: url,
        targetCategory: targetCategory,
        index: index
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[书签同步-Content] 移动失败:', chrome.runtime.lastError);
        } else {
          console.log('[书签同步-Content] 移动成功:', response);
        }
      });
    },
    
    updateBookmark: function(oldUrl, newUrl, newName) {
      console.log('[书签同步-Content] 通过API更新书签:', oldUrl, newUrl, newName);
      chrome.runtime.sendMessage({
        action: 'updateBookmark',
        oldUrl: oldUrl,
        newUrl: newUrl,
        newName: newName
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[书签同步-Content] 更新失败:', chrome.runtime.lastError);
        } else {
          console.log('[书签同步-Content] 更新成功:', response);
        }
      });
    }
  };
  
  console.log('[书签同步-Content] Content script initialized');
  
  // ===== 全局搜索快捷键支持 =====
  // 监听快捷键，在其他页面也可以调出搜索
  document.addEventListener('keydown', async function(e) {
    // 如果正在输入，不触发
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // 默认快捷键 Ctrl+Space
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      
      // 打开新标签页到搜索页面
      const serverUrl = await getServerUrl();
      if (serverUrl) {
        chrome.runtime.sendMessage({
          action: 'openSearch',
          url: serverUrl
        });
      }
    }
  });
  
  // 获取服务器URL
  async function getServerUrl() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['bookmarkSyncConfig'], (result) => {
        const config = result.bookmarkSyncConfig || {};
        const serverUrl = config.serverUrl || 'http://localhost:3000';
        resolve(serverUrl);
      });
    });
  }
})();

// Content script for global search - 在所有页面运行，支持快捷键调出搜索
// 注意：快捷键现在通过 Chrome Commands API 在 background.js 中处理
// 这个 content script 保留作为备用方案，也可以用于其他功能
(function() {
  'use strict';
  
  console.log('[God\'s Bookmark Search] Content script loaded');
  
  // 监听来自 background 的消息（用于打开搜索浮窗）
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSearchModal') {
      // 如果已经存在，先移除
      const existingModal = document.getElementById('gods-bookmark-search-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // 使用 DOM API 创建模态框，避免 innerHTML 触发 CSP 错误
      const modal = document.createElement('div');
      modal.id = 'gods-bookmark-search-modal';
      modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh;';
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = 'width: 90%; max-width: 600px; background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden;';
      
      const modalHeader = document.createElement('div');
      modalHeader.style.cssText = 'padding: 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: rgba(139, 92, 246, 0.1);';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.id = 'gods-bookmark-search-input';
      searchInput.autocomplete = 'off';
      searchInput.placeholder = '搜索书签或输入关键词搜索网络...';
      searchInput.style.cssText = 'width: 100%; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.5rem; color: #f1f5f9; font-size: 1rem; outline: none; box-sizing: border-box;';
      
      const resultsContainer = document.createElement('div');
      resultsContainer.id = 'gods-bookmark-search-results';
      resultsContainer.style.cssText = 'max-height: 400px; overflow-y: auto; padding: 2rem; color: #f1f5f9; font-size: 0.9rem; text-align: center;';
      resultsContainer.textContent = '输入关键词后按回车键搜索';
      
      modalHeader.appendChild(searchInput);
      modalContent.appendChild(modalHeader);
      modalContent.appendChild(resultsContainer);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
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
      
      sendResponse({ success: true });
    }
  });
  
  console.log('[God\'s Bookmark Search] Content script initialized');
})();

(async function () {
    'use strict';

    console.log('[InjectedSearch] 搜索浮窗脚本已加载');

    // ===== 1. 从Chrome存储读取书签数据 =====
    async function getSearchDataFromExtension() {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['godsBookmarkSearchData'], (data) => {
                    if (chrome.runtime.lastError) {
                        console.error('[InjectedSearch] 读取存储失败:', chrome.runtime.lastError);
                        resolve(null);
                    } else {
                        resolve(data.godsBookmarkSearchData);
                    }
                });
            });

            if (!result) {
                return {
                    bookmarksCache: [],
                    functionItems: [],
                    clickStatsCache: {},
                    lastUpdate: 0
                };
            }

            return result;

        } catch (error) {
            console.error('[InjectedSearch] 获取搜索数据失败:', error);
            return {
                bookmarksCache: [],
                functionItems: [],
                clickStatsCache: {},
                lastUpdate: 0
            };
        }
    }

    // ===== 2. 搜索函数（复制自app.js的逻辑） =====
    function searchBookmarks(query, bookmarksCache, clickStatsCache = {}) {
        if (!query || !bookmarksCache || bookmarksCache.length === 0) {
            return [];
        }

        const results = [];
        const queryLower = query.toLowerCase();

        bookmarksCache.forEach(bookmark => {
            if (!bookmark || !bookmark.name) return;

            const nameLower = bookmark.name.toLowerCase();
            const urlLower = (bookmark.url || '').toLowerCase();
            const categoryLower = (bookmark.category || '').toLowerCase();

            let score = 0;

            // 名称匹配
            if (nameLower === queryLower) score += 100;
            else if (nameLower.startsWith(queryLower)) score += 50;
            else if (nameLower.includes(queryLower)) score += 30;

            // URL匹配
            if (urlLower.includes(queryLower)) score += 20;

            // 分类匹配
            if (categoryLower.includes(queryLower)) score += 10;

            if (score > 0) {
                const clickCount = clickStatsCache[bookmark.url] || 0;
                const frequencyScore = Math.min(clickCount / 10, 50);

                results.push({
                    ...bookmark,
                    score: score + frequencyScore,
                    type: 'bookmark'
                });
            }
        });

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, 5);
    }

    function searchFunctions(query, functionItems) {
        if (!query || !functionItems || functionItems.length === 0) {
            return [];
        }

        const results = [];
        const queryLower = query.toLowerCase();

        functionItems.forEach(func => {
            if (!func || !func.name) return;

            let score = 0;
            const nameLower = func.name.toLowerCase();

            // 名称匹配
            if (nameLower === queryLower) score += 100;
            else if (nameLower.startsWith(queryLower)) score += 80;
            else if (nameLower.includes(queryLower)) score += 60;

            // 关键词匹配
            if (func.keywords && Array.isArray(func.keywords)) {
                func.keywords.forEach(keyword => {
                    const keywordLower = keyword.toLowerCase();
                    if (keywordLower === queryLower) score += 70;
                    else if (keywordLower.includes(queryLower)) score += 40;
                    else if (queryLower.includes(keywordLower)) score += 30;
                });
            }

            if (score > 0) {
                results.push({
                    id: func.id,
                    name: func.name,
                    icon: func.icon,
                    type: 'function',
                    score: score,
                    action: func.action
                });
            }
        });

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, 3);
    }

    function performSearch(query, searchData) {
        const functionResults = searchFunctions(query, searchData.functionItems);
        const bookmarkResults = searchBookmarks(query, searchData.bookmarksCache, searchData.clickStatsCache);
        return [...functionResults, ...bookmarkResults];
    }

    // ===== 3. 创建搜索浮窗UI =====
    function createSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'gods-bookmark-search-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh;';

        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'width: 90%; max-width: 600px; background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden;';

        const modalHeader = document.createElement('div');
        modalHeader.style.cssText = 'padding: 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: rgba(139, 92, 246, 0.1);';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'injected-search-input';
        searchInput.autocomplete = 'off';
        searchInput.placeholder = '搜索书签或输入关键词搜索网络...';
        searchInput.style.cssText = 'width: 100%; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.5rem; color: #f1f5f9; font-size: 1rem; outline: none; box-sizing: border-box;';

        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'injected-search-results';
        resultsContainer.style.cssText = 'max-height: 400px; overflow-y: auto; padding: 0.5rem;';

        modalHeader.appendChild(searchInput);
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(resultsContainer);
        modal.appendChild(modalContent);

        return modal;
    }

    // ===== 4. 渲染搜索结果 =====
    let selectedResultIndex = -1;
    let currentResults = [];

    function renderResults(results, container) {
        container.innerHTML = '';
        currentResults = results;
        selectedResultIndex = -1;

        if (results.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.875rem;';
            empty.textContent = '暂无匹配的书签';
            container.appendChild(empty);
            return;
        }

        results.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.setAttribute('data-index', index);
            item.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.75rem;';

            // 图标
            const iconDiv = document.createElement('div');
            iconDiv.style.cssText = 'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
            if (result.icon && result.icon.includes('<img')) {
                iconDiv.innerHTML = result.icon;
            } else {
                iconDiv.textContent = result.icon || '🔗';
                iconDiv.style.fontSize = '1.25rem';
            }

            // 内容
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = 'flex: 1; min-width: 0;';

            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'color: #f1f5f9; font-size: 0.875rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
            nameDiv.textContent = result.name;

            const metaDiv = document.createElement('div');
            metaDiv.style.cssText = 'color: #94a3b8; font-size: 0.75rem; margin-top: 0.125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
            metaDiv.textContent = result.type === 'function' ? '功能' : (result.category || result.url || '');

            contentDiv.appendChild(nameDiv);
            contentDiv.appendChild(metaDiv);

            item.appendChild(iconDiv);
            item.appendChild(contentDiv);

            // 鼠标悬停
            item.addEventListener('mouseenter', () => {
                selectedResultIndex = index;
                updateSelection(container);
            });

            // 点击
            item.addEventListener('click', () => {
                openResult(result);
            });

            container.appendChild(item);
        });
    }

    function updateSelection(container) {
        const items = container.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            if (index === selectedResultIndex) {
                item.style.background = 'rgba(139, 92, 246, 0.2)';
            } else {
                item.style.background = 'transparent';
            }
        });
    }

    function openResult(result) {
        if (result.type === 'function') {
            console.log('[InjectedSearch] 功能项在注入脚本中暂不支持执行:', result.name);
            alert('此功能需要在书签网站中使用');
        } else if (result.url) {
            window.open(result.url, '_blank');
            removeModal();
        }
    }

    function removeModal() {
        const modal = document.getElementById('gods-bookmark-search-modal');
        if (modal) {
            modal.remove();
        }
    }

    // ===== 5. 主逻辑 =====
    // 检查是否已存在浮窗
    const existing = document.getElementById('gods-bookmark-search-modal');
    if (existing) {
        existing.remove();
    }

    // 获取搜索数据
    const searchData = await getSearchDataFromExtension();

    // 创建浮窗
    const modal = createSearchModal();
    document.body.appendChild(modal);

    const searchInput = document.getElementById('injected-search-input');
    const resultsContainer = document.getElementById('injected-search-results');

    // 显示初始状态
    if (searchData.bookmarksCache.length === 0) {
        resultsContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #94a3b8;">
                <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">📌</p>
                <p>暂无书签数据</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem; color: #64748b;">
                    请先访问书签网站加载数据
                </p>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.875rem;">
                输入关键词开始搜索
            </div>
        `;
    }

    // 聚焦输入框
    searchInput.focus();

    // 输入事件
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (!query) {
            resultsContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.875rem;">
                    输入关键词开始搜索
                </div>
            `;
            return;
        }

        const results = performSearch(query, searchData);
        renderResults(results, resultsContainer);
    });

    // 键盘事件
    searchInput.addEventListener('keydown', (e) => {
        const query = searchInput.value.trim();

        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedResultIndex >= 0 && currentResults[selectedResultIndex]) {
                openResult(currentResults[selectedResultIndex]);
            } else if (query) {
                // 使用Bing搜索
                const searchUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
                window.open(searchUrl, '_blank');
                removeModal();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentResults.length > 0) {
                selectedResultIndex = (selectedResultIndex + 1) % currentResults.length;
                updateSelection(resultsContainer);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentResults.length > 0) {
                selectedResultIndex = selectedResultIndex <= 0 ? currentResults.length - 1 : selectedResultIndex - 1;
                updateSelection(resultsContainer);
            }
        } else if (e.key === 'Escape') {
            removeModal();
        }
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            removeModal();
        }
    });

    console.log('[InjectedSearch] 搜索浮窗已就绪');
})();

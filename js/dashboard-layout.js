/**
 * Dashboard Layout Manager
 * 管理员卡片自定义功能：颜色、透明度、拖拽布局、尺寸调整
 */

let isLayoutEditing = false;
let draggedItem = null;

// ===== 侧边栏控制 =====
async function toggleSettingsSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
        if (sidebar.classList.contains('open')) {
            closeSettingsSidebar();
        } else {
            sidebar.classList.add('open');
            document.body.classList.add('sidebar-open');
            await renderCardControls();
        }
    }
}

async function openSettingsSidebar() {
    await toggleSettingsSidebar();
}

function closeSettingsSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        
        // 不再需要禁用拖拽和调整大小（因为已经禁用了）
        // disableTodosDragAndResize();
        // 关闭时自动保存布局（已在autoSave中处理）
    }
}

// 设置面板常驻右侧，除非用户手动关闭（已移除点击空白处关闭的逻辑）

// ===== 渲染卡片控制面板 =====
async function renderCardControls() {
    const container = document.getElementById('card-controls-list');
    if (!container) return;

    // 获取配置以读取网站标题
    const config = await dataManager.getDashboardConfig();
    const siteTitle = config.siteTitle || 'God\'s Bookmark';

    // 获取便签待办设置
    const todosSettings = config.todosSettings || {
        title: '便签待办',
        visible: true,
    };

    // 获取书签缩放比例（默认100%，即1.0）
    const bookmarkScale = config.bookmarkScale !== undefined ? config.bookmarkScale : 1.0;

    // 获取主题设置（默认dark）
    const theme = config.theme || 'dark';

    // 全局搜索配置（快捷键 & 搜索引擎）
    const searchShortcut = config.searchShortcut || 'Ctrl+Space';
    const searchEngine = config.searchEngine || 'https://www.bing.com/search?q=';
    
    // 检查当前用户是否是管理员 / 已登录
    let isAdmin = false;
    let isLoggedIn = false;
    try {
        if (window.userManager) {
            const currentUser = window.userManager.getCurrentUser && window.userManager.getCurrentUser();
            if (currentUser) {
                isLoggedIn = true;
                isAdmin = currentUser.role === 'admin';
            }
        }
    } catch (e) {
        console.error('[renderCardControls] 检查管理员权限失败:', e);
    }
    
    // 全局设置卡片（包含管理按钮、主题、网站标题、便签待办、书签大小）
    let html = `
        <!-- 全局设置卡片 -->
        <div class="card-control-item" style="border-bottom: 2px solid var(--card-border); padding: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0; color: var(--accent-color); font-size: 1.35rem; font-weight: 600; text-align: center;">全局设置</h4>
            </div>
            ${
                (isAdmin || isLoggedIn)
                    ? `
            <!-- 管理功能图标按钮（管理员：用户/备份管理；所有登录用户：修改密码） -->
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--card-border);">
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    ${
                        isAdmin
                            ? `
                    <button id="user-management-btn" class="management-icon-btn" title="用户管理" style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 0.25rem;
                        padding: 0.75rem 1rem;
                        background: var(--card-bg);
                        border: 1px solid var(--card-border);
                        border-radius: 0.75rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: var(--text-primary);
                        min-width: 80px;
                    ">
                        <span style="font-size: 1.2rem;">👥</span>
                        <span style="font-size: 0.7rem; font-weight: 500;">用户管理</span>
                    </button>
                    <button id="backup-management-btn" class="management-icon-btn" title="备份管理" style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 0.25rem;
                        padding: 0.75rem 1rem;
                        background: var(--card-bg);
                        border: 1px solid var(--card-border);
                        border-radius: 0.75rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: var(--text-primary);
                        min-width: 80px;
                    ">
                        <span style="font-size: 1.2rem;">💾</span>
                        <span style="font-size: 0.7rem; font-weight: 500;">备份管理</span>
                    </button>
                            `
                            : ''
                    }
                    ${
                        isLoggedIn
                            ? `
                    <button id="change-password-btn" class="management-icon-btn" title="修改密码" style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 0.25rem;
                        padding: 0.75rem 1rem;
                        background: var(--card-bg);
                        border: 1px solid var(--card-border);
                        border-radius: 0.75rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: var(--text-primary);
                        min-width: 80px;
                    ">
                        <span style="font-size: 1.2rem;">🔐</span>
                        <span style="font-size: 0.7rem; font-weight: 500;">修改密码</span>
                    </button>
                            `
                            : ''
                    }
                </div>
            </div>
                    `
                    : ''
            }
            <!-- 全局搜索设置 -->
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--card-border);">
                <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">🔍 全局搜索</label>
                <div class="control-row" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <label style="width: 70px; font-size: 0.75rem;">快捷键</label>
                    <input type="text" id="search-shortcut-input" value="${searchShortcut}"
                        style="flex: 1; padding: 0.4rem 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--card-border); color: var(--text-primary); border-radius: 0.375rem; font-size: 0.8rem;"
                        placeholder="例如：Ctrl+Space">
                </div>
                <div class="control-row" style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="width: 70px; font-size: 0.75rem;">搜索引擎</label>
                    <input type="text" id="search-engine-input" value="${searchEngine}"
                        style="flex: 1; padding: 0.4rem 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--card-border); color: var(--text-primary); border-radius: 0.375rem; font-size: 0.8rem;"
                        placeholder="例如：https://www.bing.com/search?q=">
                </div>
            </div>
            <!-- 主题设置 -->
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--card-border);">
                <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">🎨 主题设置</label>
                <div style="display: flex; gap: 0.75rem;">
                    <label style="flex: 1; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; padding: 0.5rem; border: 1px solid var(--card-border); border-radius: 0.375rem; transition: all 0.2s; font-size: 0.8rem; background: ${theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'transparent'};" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='${theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'transparent'}'">
                        <input type="radio" name="theme-select" value="dark" ${theme === 'dark' ? 'checked' : ''} style="accent-color: var(--accent-color);">
                        <span>🌙 暗色</span>
                    </label>
                    <label style="flex: 1; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; padding: 0.5rem; border: 1px solid var(--card-border); border-radius: 0.375rem; transition: all 0.2s; font-size: 0.8rem; background: ${theme === 'light' ? 'rgba(139, 92, 246, 0.2)' : 'transparent'};" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='${theme === 'light' ? 'rgba(139, 92, 246, 0.2)' : 'transparent'}'">
                        <input type="radio" name="theme-select" value="light" ${theme === 'light' ? 'checked' : ''} style="accent-color: var(--accent-color);">
                        <span>☀️ 亮色</span>
                    </label>
                </div>
            </div>
            
            <!-- 网站标题 -->
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--card-border);">
                <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">🌐 网站标题</label>
                <input type="text" id="site-title-input" value="${siteTitle}" 
                    style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--card-border); color: var(--text-primary); border-radius: 0.375rem; font-size: 0.85rem; font-weight: 500;"
                    placeholder="输入网站标题">
            </div>
            
            <!-- 便签待办 -->
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--card-border);">
                <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">📝 便签待办</label>
                <input type="text" id="todos-title-input" value="${todosSettings.title}" 
                    style="width: 100%; margin-bottom: 0.5rem; padding: 0.4rem; background: rgba(0,0,0,0.2); border: 1px solid var(--card-border); color: var(--text-primary); border-radius: 0.375rem; font-size: 0.8rem;"
                    placeholder="输入便签待办标题">
                <div class="control-row" style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="width: 70px; font-size: 0.75rem;">显示/隐藏</label>
                    <button id="todos-visibility-btn"
                        style="flex: 1; padding: 0.4rem; background: ${todosSettings.visible ? 'var(--success-color)' : 'rgba(239, 68, 68, 0.3)'}; color: ${todosSettings.visible ? 'white' : 'var(--text-secondary)'}; border: 1px solid var(--card-border); border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem;"
                        title="${todosSettings.visible ? '点击隐藏' : '点击显示'}">
                        ${todosSettings.visible ? '显示中' : '已隐藏'}
                    </button>
                </div>
            </div>
            
            <!-- 书签大小 -->
            <div style="margin-bottom: 0;">
                <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">📚 书签大小</label>
                <div class="control-row" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                    <label style="width: 70px; font-size: 0.75rem;">缩放比例</label>
                    <input type="range" id="bookmark-scale-range" min="0.5" max="2.0" step="0.1" value="${bookmarkScale}"
                        style="flex: 1;">
                    <span id="bookmark-scale-value" style="font-size: 0.75rem; width: 45px; text-align: right; color: var(--accent-color); font-weight: 500;">${(bookmarkScale * 100).toFixed(0)}%</span>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-secondary);">
                    基础尺寸: 120px × 30px
                </div>
            </div>
        </div>
    `;

    const monitorCards = document.querySelectorAll('#monitor-section .glass-card');
    const bookmarkCards = document.querySelectorAll('#bookmarks-container .glass-card');
    const allCards = [...monitorCards, ...bookmarkCards];

    allCards.forEach((card, globalIndex) => {
        const cardId = card.id || `card-${globalIndex}`;
        const cardName = getCardName(card);
        const currentOpacity = card.dataset.customOpacity || '0.7';
        const currentColor = card.dataset.customColor || '#8b5cf6';
        
        // 判断是否是书签卡片
        const isBookmarkCard = card.classList.contains('bookmark-card');
        
        // 如果是书签卡片，获取分类名称（用于删除）
        let bookmarkCategoryIndex = null;
        if (isBookmarkCard) {
            const categoryName = card.dataset.category;
            if (categoryName) {
                // 存储分类名称而不是索引，在删除时通过名称查找索引
                bookmarkCategoryIndex = categoryName;
            }
        }

        // 获取卡片的实际背景颜色（如果有渐变或填充色）
        let cardBackgroundColor = currentColor;
        // 检查卡片是否有渐变背景
        const cardComputedStyle = window.getComputedStyle(card);
        const cardBgImage = cardComputedStyle.backgroundImage;
        if (cardBgImage && cardBgImage !== 'none') {
            // 如果有渐变背景，使用自定义颜色
            cardBackgroundColor = currentColor;
        } else {
            // 如果没有渐变，尝试获取背景色
            const bgColor = cardComputedStyle.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                cardBackgroundColor = bgColor;
            }
        }
        
        // 计算合适的边框颜色和背景透明度（与书签面板一致）
        const borderColor = cardBackgroundColor;
        const op = parseFloat(currentOpacity) || 0.7;
        
        // 使用与 applyCardGradient 相同的渐变逻辑来创建背景
        // 将颜色转换为 rgba 格式以支持透明度
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        
        function hexToRgba(hex, alpha) {
            const rgb = hexToRgb(hex);
            if (rgb) {
                return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            }
            return hex;
        }

        // 计算同色系深色
        function hexToDarkColor(hex) {
            const rgb = hexToRgb(hex);
            if (rgb) {
                const darkR = Math.floor(rgb.r * 0.6);
                const darkG = Math.floor(rgb.g * 0.6);
                const darkB = Math.floor(rgb.b * 0.6);
                return `rgb(${darkR}, ${darkG}, ${darkB})`;
            }
            return hex;
        }
        
        // 检查当前主题（更可靠的检测方式）
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme') || 'dark';
        let isLightTheme = false;
        
        if (currentTheme === 'light') {
                isLightTheme = true;
        }
        
        // 使用与书签卡片相同的渐变逻辑（与 applyCardGradient 函数保持一致）
        const colorHex = cardBackgroundColor.startsWith('#') ? cardBackgroundColor : '#8b5cf6';
        let bgColorStyle;
        
        if (isLightTheme) {
            // 亮色主题：从设置颜色渐变到白色
            const gradientStart = hexToRgba(colorHex, 0.2 * op);
            const gradientMid = hexToRgba(colorHex, 0.1 * op);
            // 结束颜色使用白色，根据透明度调整
            const gradientEnd = `rgba(255, 255, 255, ${0.95 * op})`;
            bgColorStyle = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 40%, ${gradientEnd} 100%)`;
        } else {
            // 暗色主题：原有逻辑
            const gradientStart = hexToRgba(colorHex, 0.3 * op);
            const gradientMid = hexToRgba(colorHex, 0.1 * op);
            const gradientEnd = `rgba(30, 41, 59, ${0.7 * op})`;
            bgColorStyle = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 40%, ${gradientEnd} 100%)`;
        }

        // 获取隐藏状态
        const bookmarkLayout = config.bookmarkLayout || [];
        const bookmarkLayoutItem = bookmarkLayout.find(item => {
            if (isBookmarkCard && bookmarkCategoryIndex) {
                return item.category === bookmarkCategoryIndex;
            }
            return false;
        });
        const isHidden = bookmarkLayoutItem?.hidden === true;
        
        html += `
            <div class="card-control-item" data-card-index="${globalIndex}" 
                style="border-bottom: ${globalIndex < allCards.length - 1 ? '1px solid var(--card-border)' : 'none'}; 
                       padding-bottom: ${globalIndex < allCards.length - 1 ? '1rem' : '0'}; 
                       margin-bottom: ${globalIndex < allCards.length - 1 ? '1rem' : '0'}; 
                       background: ${bgColorStyle};
                       border-left: 3px solid ${borderColor};
                       box-shadow: 0 0 10px ${borderColor}40;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; position: relative;">
                    <div class="drag-handle-container" style="display:flex; align-items:center; gap:4px;">
                        <button class="card-move-up-btn" data-card-index="${globalIndex}" title="上移"
                            style="width:20px;height:20px;border-radius:999px;border:1px solid rgba(148,163,184,0.8);background:rgba(15,23,42,0.9);color:rgba(248,250,252,0.85);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.65rem;padding:0;">
                            ↑
                        </button>
                        <button class="card-move-down-btn" data-card-index="${globalIndex}" title="下移"
                            style="width:20px;height:20px;border-radius:999px;border:1px solid rgba(148,163,184,0.8);background:rgba(15,23,42,0.9);color:rgba(248,250,252,0.85);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.65rem;padding:0;">
                            ↓
                        </button>
                    <h4 style="margin: 0; font-size: 0.85rem; color: ${borderColor};">📦 ${cardName}</h4>
                    </div>
                    <div style="display: flex; gap: 4px; position: absolute; top: 0; right: 0;">
                        ${isBookmarkCard && bookmarkCategoryIndex !== null ? `
                        <button class="toggle-bookmark-visibility-btn" data-category-name="${bookmarkCategoryIndex}" 
                            style="width: 20px; height: 20px; padding: 0; background: ${isHidden ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${isHidden ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)'}; border: 1px solid ${isHidden ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; line-height: 1; font-weight: 500;"
                            title="${isHidden ? '点击显示' : '点击隐藏'}">
                            ${isHidden ? '○' : '●'}
                        </button>
                        <button class="delete-category-btn" data-category-name="${bookmarkCategoryIndex}" 
                            style="width: 18px; height: 18px; padding: 0; background: transparent; color: var(--text-secondary); border: 1px solid transparent; border-radius: 50%; cursor: pointer; transition: all 0.2s; font-size: 0.5rem; display: flex; align-items: center; justify-content: center; line-height: 1; font-weight: 300;"
                            title="删除此分类">
                            ❌
                        </button>
                        ` : ''}
                    </div>
                </div>
                <input type="text" class="card-name-input" data-card-index="${globalIndex}" value="${cardName}" 
                    style="width: 100%; margin-bottom: 0.35rem; padding: 0.2rem; background: rgba(0,0,0,0.2); border: 1px solid var(--card-border); color: var(--text-primary); border-radius: 0.25rem; font-size: 0.75rem;">
                
                <div class="control-row" style="margin-bottom: 0;">
                    <label style="width: 50px; font-size: 0.7rem;">透明/色</label>
                    <input type="range" class="card-opacity-range" data-card-index="${globalIndex}" min="0.1" max="1" step="0.1" value="${currentOpacity}"
                        style="flex: 1; max-width: 120px;">
                    <span class="value-display" style="font-size: 0.7rem; width: 34px; text-align: right;">${currentOpacity}</span>
                    <input type="color" class="card-color-input" data-card-index="${globalIndex}" value="${currentColor}" 
                        style="width: 24px; height: 24px; margin-left: 4px;">
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // 绑定事件监听器（避免内联事件处理器，符合CSP）
    bindDashboardLayoutEvents(container);

    // 绑定管理功能按钮事件
    bindManagementButtons();
    
    // 不再启用设置面板中的卡片拖拽排序，改用上下移动按钮

    // 布局编辑默认开启（仅启用可视上的联动逻辑，不再启用卡片拖拽）
    // enableLayoutEditing();
    
    // 不再启用便签待办的拖拽和调整大小（固定位置，不可移动和调整大小）
    // if (document.body.classList.contains('sidebar-open')) {
    //     enableTodosDragAndResize();
    // }

    // 绑定卡片点击事件
    bindCardClickEvents();
    
    // 为所有书签卡片添加右边和下边的调整大小手柄（仅设置模式）
    if (document.body.classList.contains('sidebar-open')) {
        setTimeout(() => {
            const bookmarkCards = document.querySelectorAll('#bookmarks-container .bookmark-card');
            bookmarkCards.forEach(card => {
                if (typeof window.addBookmarkCardResizeHandles === 'function') {
                    window.addBookmarkCardResizeHandles(card);
                }
            });
        }, 200);
    }
    
    // 更新常用网站标题颜色（布局设置面板打开后）
    if (typeof window.updateFrequentHeaderColor === 'function') {
        window.updateFrequentHeaderColor();
    }
}

// 绑定dashboard-layout中的所有事件监听器（符合CSP）
function bindDashboardLayoutEvents(container) {
    // 网站标题输入框
    const siteTitleInput = container.querySelector('#site-title-input');
    if (siteTitleInput) {
        siteTitleInput.addEventListener('change', (e) => {
            const value = e.target.value;
            if (window.updateSiteTitle) {
                window.updateSiteTitle(value);
            }
        });
        siteTitleInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        siteTitleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });
    }

    // 右边和下边拖动调整卡片大小（仅设置面板中的控制卡片）
    const resizeControlsList = document.getElementById('card-controls-list');
    if (resizeControlsList) {
        // 已删除右侧设置面板中卡片的右边和下边调整大小功能
    }

    // 便签待办标题输入框
    const todosTitleInput = container.querySelector('#todos-title-input');
    if (todosTitleInput) {
        todosTitleInput.addEventListener('change', (e) => {
            const value = e.target.value;
            if (window.updateTodosTitle) {
                window.updateTodosTitle(value);
            }
        });
        todosTitleInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        todosTitleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });
    }

    // 全局搜索快捷键输入框
    const searchShortcutInput = container.querySelector('#search-shortcut-input');
    if (searchShortcutInput) {
        searchShortcutInput.addEventListener('change', async (e) => {
            let value = (e.target.value || '').trim();
            if (!value) {
                value = 'Ctrl+Space';
                e.target.value = value;
            }
            try {
                const config = await dataManager.getDashboardConfig();
                config.searchShortcut = value;
                await dataManager.saveDashboardConfig(config);
                // 同步到前端搜索配置
                if (!window.searchConfig) window.searchConfig = {};
                window.searchConfig.shortcut = value;
                console.log('[GlobalSettings] 已更新搜索快捷键为:', value);
            } catch (err) {
                console.error('[GlobalSettings] 更新搜索快捷键失败:', err);
            }
        });
        searchShortcutInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        searchShortcutInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });
    }

    // 全局搜索引擎输入框
    const searchEngineInput = container.querySelector('#search-engine-input');
    if (searchEngineInput) {
        searchEngineInput.addEventListener('change', async (e) => {
            let value = (e.target.value || '').trim();
            if (!value) {
                value = 'https://www.bing.com/search?q=';
                e.target.value = value;
            }
            try {
                const config = await dataManager.getDashboardConfig();
                config.searchEngine = value;
                await dataManager.saveDashboardConfig(config);
                // 同步到前端搜索配置
                if (!window.searchConfig) window.searchConfig = {};
                window.searchConfig.searchEngine = value;
                console.log('[GlobalSettings] 已更新搜索引擎为:', value);
            } catch (err) {
                console.error('[GlobalSettings] 更新搜索引擎失败:', err);
            }
        });
        searchEngineInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        searchEngineInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });
    }

    // 主题切换
    const themeRadios = container.querySelectorAll('input[name="theme-select"]');
    if (themeRadios.length > 0) {
        themeRadios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                const selectedTheme = e.target.value;
                await applyTheme(selectedTheme);
                await saveTheme(selectedTheme);
            });
            radio.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    // 书签大小缩放滑杆
    const bookmarkScaleRange = container.querySelector('#bookmark-scale-range');
    const bookmarkScaleValue = container.querySelector('#bookmark-scale-value');
    if (bookmarkScaleRange && bookmarkScaleValue) {
        // 实时更新显示值
        bookmarkScaleRange.addEventListener('input', (e) => {
            const scale = parseFloat(e.target.value);
            bookmarkScaleValue.textContent = (scale * 100).toFixed(0) + '%';
            // 实时应用缩放
            applyBookmarkScale(scale);
        });
        
        // 释放时保存配置
        bookmarkScaleRange.addEventListener('change', async (e) => {
            const scale = parseFloat(e.target.value);
            await saveBookmarkScale(scale);
        });
        
        bookmarkScaleRange.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 卡片顺序上下移动按钮
    const controlsList = document.getElementById('card-controls-list');
    if (controlsList) {
        controlsList.querySelectorAll('.card-move-up-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-card-index'));
                if (isNaN(index) || index <= 0) return;
                await moveCardControl(index, -1);
            });
        });
        controlsList.querySelectorAll('.card-move-down-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-card-index'));
                if (isNaN(index)) return;
                await moveCardControl(index, 1);
            });
        });
    }

    // 卡片顺序上下移动按钮
    // 卡片顺序上下移动按钮
    container.querySelectorAll('.card-move-up-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-card-index'));
            if (isNaN(index) || index <= 0) return;
            await moveCardControl(index, -1);
        });
    });
    container.querySelectorAll('.card-move-down-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-card-index'));
            if (isNaN(index)) return;
            await moveCardControl(index, 1);
        });
    });

    // 便签待办显示/隐藏按钮
    const todosVisibilityBtn = container.querySelector('#todos-visibility-btn');
    if (todosVisibilityBtn) {
        todosVisibilityBtn.addEventListener('click', () => {
            if (window.toggleTodosVisibility) {
                window.toggleTodosVisibility();
            }
        });
    }

    // 使用事件委托处理动态生成的卡片控制项
    container.addEventListener('click', (e) => {
        // 处理卡片点击高亮
        const cardControlItem = e.target.closest('.card-control-item');
        if (cardControlItem && cardControlItem.hasAttribute('data-card-index')) {
            const index = parseInt(cardControlItem.getAttribute('data-card-index'));
            if (!isNaN(index)) {
                // 点击右侧设置面板时，右侧设置卡片高亮不居中，左侧对应的书签卡片居中高亮，只有左侧卡片滚动
                highlightCardControl(index, false, true);
            }
        }

        // 处理删除分类按钮
        if (e.target.closest('.delete-category-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.delete-category-btn');
            const categoryName = btn.getAttribute('data-category-name');
            if (categoryName && window.deleteCategoryByName) {
                window.deleteCategoryByName(categoryName);
            }
        }

        // 处理隐藏/显示书签卡片按钮
        if (e.target.closest('.toggle-bookmark-visibility-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const btn = e.target.closest('.toggle-bookmark-visibility-btn');
            const categoryName = btn.getAttribute('data-category-name');
            console.log('[bindDashboardLayoutEvents] Visibility button clicked, category:', categoryName);
            if (categoryName) {
                if (typeof toggleBookmarkCardVisibility === 'function') {
                toggleBookmarkCardVisibility(categoryName);
                } else if (typeof window.toggleBookmarkCardVisibility === 'function') {
                    window.toggleBookmarkCardVisibility(categoryName);
                } else {
                    console.error('[bindDashboardLayoutEvents] toggleBookmarkCardVisibility function not found');
                }
            } else {
                console.warn('[bindDashboardLayoutEvents] No category name found on button');
            }
        }
    });

    // 处理所有卡片名称输入框
    container.querySelectorAll('.card-name-input').forEach((input, index) => {
        const cardIndex = parseInt(input.getAttribute('data-card-index'));
        if (!isNaN(cardIndex)) {
            input.addEventListener('change', (e) => {
                const value = e.target.value;
                if (window.renameCard) {
                    window.renameCard(cardIndex, value);
                }
            });
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    });

    // 处理所有透明度滑块
    container.querySelectorAll('.card-opacity-range').forEach((range) => {
        const cardIndex = parseInt(range.getAttribute('data-card-index'));
        if (!isNaN(cardIndex)) {
            range.addEventListener('input', (e) => {
                const value = e.target.value;
                if (window.previewCardOpacity) {
                    window.previewCardOpacity(cardIndex, value);
                }
            });
            range.addEventListener('change', (e) => {
                const value = e.target.value;
                if (window.updateCardOpacity) {
                    window.updateCardOpacity(cardIndex, value);
                }
            });
        }
    });

    // 处理所有颜色选择器
    container.querySelectorAll('.card-color-input').forEach((colorInput) => {
        const cardIndex = parseInt(colorInput.getAttribute('data-card-index'));
        if (!isNaN(cardIndex)) {
            // 实时预览（input事件）
            colorInput.addEventListener('input', (e) => {
                const value = e.target.value;
                if (window.updateCardColor) {
                    window.updateCardColor(cardIndex, value);
                }
            });
            // 保存（change事件）
            colorInput.addEventListener('change', (e) => {
                const value = e.target.value;
                if (window.updateCardColor) {
                    window.updateCardColor(cardIndex, value);
                }
            });
        }
    });
}

function getCardName(card) {
    if (card.id === 'cpu-gauge') return 'CPU 使用率';
    if (card.id === 'ram-gauge') return '内存使用率';
    if (card.id === 'storage-gauge') return '存储空间';

    // 对于书签卡片，优先使用 dataset.category
    if (card.classList.contains('bookmark-card')) {
        const categoryName = card.dataset.category;
        if (categoryName && categoryName.trim()) {
            return categoryName.trim();
        }
    }

    // 尝试从 h3 元素获取名称
    const h3 = card.querySelector('h3');
    if (h3 && h3.textContent && h3.textContent.trim()) {
        return h3.textContent.trim();
    }

    // 如果都没有，返回默认值
    return '卡片';
}

// ===== 卡片透明度（保留颜色）=====
function previewCardOpacity(index, value) {
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    const card = cards[index];
    if (card) {
        card.dataset.customOpacity = value;
        const color = card.dataset.customColor || '#8b5cf6';
        applyCardGradient(card, color, value);
        
        // 实时更新设置面板中对应卡片控制项的颜色
        updateCardControlItemColor(index, color, value);
    }
    // 更新显示值
    const display = document.querySelector(`.card-control-item[data-card-index="${index}"] .value-display`);
    if (display) display.textContent = value;
}

function updateCardOpacity(index, value) {
    previewCardOpacity(index, value);
    saveCardConfig(index, { opacity: value });
    // 自动保存
    autoSave();
}

// ===== 卡片颜色（渐变效果）=====
async function updateCardColor(index, color) {
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    const card = cards[index];
    if (card) {
        card.dataset.customColor = color;
        const opacity = card.dataset.customOpacity || '0.7';
        // 应用渐变背景
        applyCardGradient(card, color, opacity);
        // 给进度条也应用颜色
        const fill = card.querySelector('.progress-fill');
        if (fill) fill.style.background = color;
        
        // 实时更新设置面板中对应卡片控制项的颜色
        updateCardControlItemColor(index, color, opacity);
        
        // 实时更新右侧导航中对应卡片的文字颜色
        updateRightNavCardColor(card, color);
        
        // 如果是书签卡片，需要同时更新 bookmarkLayout 中的颜色配置
        if (card.classList.contains('bookmark-card')) {
            const categoryName = card.dataset.category;
            if (categoryName) {
                const config = await dataManager.getDashboardConfig();
                if (!config.bookmarkLayout) {
                    config.bookmarkLayout = [];
                }
                
                // 查找对应的布局项
                let layoutItem = config.bookmarkLayout.find(item => item.category === categoryName);
                if (layoutItem) {
                    // 更新颜色
                    layoutItem.color = color;
                    layoutItem.opacity = opacity;
                } else {
                    // 如果不存在，创建一个新的配置项
                    config.bookmarkLayout.push({
                        category: categoryName,
                        color: color,
                        opacity: opacity,
                        index: 999,
                        hidden: false,
                        collapsed: false
                    });
                }
                
                await dataManager.saveDashboardConfig(config);
                console.log('[书签颜色更新] 已保存到 bookmarkLayout:', categoryName, color);
            }
        }
    }
    
    // 同时也保存到 cards 配置（用于监控卡片等）
    saveCardConfig(index, { color: color });
    // 自动保存
    autoSave();
}

// 更新设置面板中卡片控制项的颜色
function updateCardControlItemColor(index, color, opacity) {
    const controlItem = document.querySelector(`.card-control-item[data-card-index="${index}"]`);
    if (controlItem) {
        // 将颜色转换为 rgba 以便创建渐变
        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // 计算同色系深色
        const hexToDarkColor = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const darkR = Math.floor(r * 0.6);
            const darkG = Math.floor(g * 0.6);
            const darkB = Math.floor(b * 0.6);
            return `rgb(${darkR}, ${darkG}, ${darkB})`;
        };
        
        const op = parseFloat(opacity);
        
        // 检查当前主题
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const isLightTheme = currentTheme === 'light';
        
        let bgColorStyle;
        let borderColor;
        
        if (isLightTheme) {
            // 亮色主题：从设置颜色渐变到白色
            const gradientStart = hexToRgba(color, 0.2 * op);
            const gradientMid = hexToRgba(color, 0.1 * op);
            // 结束颜色使用白色，根据透明度调整
            const gradientEnd = `rgba(255, 255, 255, ${0.95 * op})`;
            bgColorStyle = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 40%, ${gradientEnd} 100%)`;
            borderColor = hexToRgba(color, 0.25);
        } else {
            // 暗色主题：原有逻辑
            const gradientStart = hexToRgba(color, 0.3 * op);
            const gradientMid = hexToRgba(color, 0.1 * op);
            const gradientEnd = `rgba(30, 41, 59, ${0.7 * op})`;
            bgColorStyle = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 40%, ${gradientEnd} 100%)`;
            borderColor = hexToRgba(color, 0.4);
        }
        
        // 更新背景和边框（使用 setProperty 确保样式优先级）
        controlItem.style.setProperty('background', bgColorStyle, 'important');
        controlItem.style.setProperty('border-left', `3px solid ${borderColor}`, 'important');
        controlItem.style.setProperty('box-shadow', `0 0 10px ${borderColor}40`, 'important');
        
        // 更新标题颜色
        const title = controlItem.querySelector('h4');
        if (title) {
            title.style.setProperty('color', borderColor, 'important');
        }
        
        // 强制触发重绘，确保样式立即生效
        void controlItem.offsetHeight;
    }
}

// 更新右侧导航中对应卡片的文字颜色
function updateRightNavCardColor(card, color) {
    // 如果是书签卡片，获取分类名称
    if (card.classList.contains('bookmark-card')) {
        const categoryName = card.dataset.category;
        if (categoryName) {
            // 查找右侧导航中对应的导航项
            const rightNav = document.getElementById('right-nav-container');
            if (rightNav) {
                // 通过data-category属性匹配，更可靠
                const wrapper = rightNav.querySelector(`.nav-dot-wrapper[data-category="${categoryName}"]`);
                if (wrapper) {
                    // 更新导航点的颜色
                    const dot = wrapper.querySelector('.nav-dot');
                    if (dot) {
                        dot.style.background = color;
                    }
                    // 更新导航文字的字体颜色
                    const label = wrapper.querySelector('.nav-label');
                    if (label) {
                        label.style.color = color;
                    }
                    // 更新CSS变量
                    wrapper.style.setProperty('--card-color', color);
                    console.log('[右侧导航颜色更新]', categoryName, color);
                } else {
                    console.warn('[右侧导航颜色更新] 未找到对应的导航项:', categoryName);
                }
            } else {
                console.warn('[右侧导航颜色更新] 右侧导航容器不存在');
            }
        }
    }
}

// 应用渐变背景到卡片（支持独立的透明度和颜色）
function applyCardGradient(card, color, opacity = '0.7') {
    // 将颜色转换为 rgba 以便创建渐变
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // 计算同色系深色（将RGB值降低一定比例）
    const hexToDarkColor = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        // 降低到原来的60%，使其变深
        const darkR = Math.floor(r * 0.6);
        const darkG = Math.floor(g * 0.6);
        const darkB = Math.floor(b * 0.6);
        return `rgb(${darkR}, ${darkG}, ${darkB})`;
    };

    const op = parseFloat(opacity);
    
    // 检查当前主题（更可靠的检测方式）
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    let isLightTheme = false;
    
    if (currentTheme === 'light') {
            isLightTheme = true;
    }
    
    if (isLightTheme) {
        // 亮色主题：从设置颜色渐变到白色
        const gradientStart = hexToRgba(color, 0.2 * op);
        const gradientMid = hexToRgba(color, 0.1 * op);
        // 结束颜色使用白色，根据透明度调整
        const gradientEnd = `rgba(255, 255, 255, ${0.95 * op})`;
        card.style.background = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 40%, ${gradientEnd} 100%)`;
        
        // 边框使用较浅的同色系颜色
        const borderColor = hexToRgba(color, 0.25);
        card.style.border = `1px solid ${borderColor}`;
    } else {
        // 暗色主题：原有逻辑
        const gradientStart = hexToRgba(color, 0.3 * op);
        const gradientMid = hexToRgba(color, 0.1 * op);
        const gradientEnd = `rgba(30, 41, 59, ${0.7 * op})`;
        card.style.background = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 40%, ${gradientEnd} 100%)`;
        
        // 边框使用纯色渐变起始色（保持圆角）
        const borderColor = hexToRgba(color, 0.4);
        card.style.border = `1px solid ${borderColor}`;
    }
    
    card.style.borderRadius = '1rem';  // 确保圆角
}

// ===== 卡片尺寸 =====
function setCardSpan(index, span) {
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    const card = cards[index];
    if (card) {
        card.classList.remove('span-2', 'span-3', 'span-4');
        if (span === 2) card.classList.add('span-2');
        if (span === 3) card.classList.add('span-3');
        if (span === 4) card.classList.add('span-4');
    }
    saveCardConfig(index, { span: span });
    // 自动保存布局状态
    autoSave();
    renderCardControls().catch(err => console.error('renderCardControls error:', err)); // 刷新按钮状态
}

// ===== 拖拽控制 =====
function toggleCardDraggable(index) {
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    const card = cards[index];
    if (card) {
        if (card.classList.contains('draggable')) {
            disableCardDrag(card);
        } else {
            enableCardDrag(card);
        }
    }
    renderCardControls().catch(err => console.error('renderCardControls error:', err));
}

function toggleAllDraggable() {
    isLayoutEditing = !isLayoutEditing;
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');

    cards.forEach(card => {
        if (isLayoutEditing) {
            enableCardDrag(card);
        } else {
            disableCardDrag(card);
        }
    });

    if (!isLayoutEditing) {
        saveLayoutState();
    }

    renderCardControls().catch(err => console.error('renderCardControls error:', err));
}

// 启用书签拖拽
function enableBookmarkDrag(item, catIndex, itemIndex) {
    if (!item) return;
    item.classList.add('bookmark-draggable');
    item.setAttribute('draggable', 'true');
    item.dataset.dragCatInfo = JSON.stringify({ cat: catIndex, idx: itemIndex }); // 存储索引信息

    // 复用通用的拖拽 handler，但在内部区分
    // 移除旧的事件监听器（如果存在）
    item.removeEventListener('dragstart', handleBookmarkDragStart);
    item.removeEventListener('dragend', handleBookmarkDragEnd);
    // 添加新的事件监听器
    item.addEventListener('dragstart', handleBookmarkDragStart);
    item.addEventListener('dragend', handleBookmarkDragEnd);
}

// 暴露到全局供 app.js 使用
window.enableBookmarkDrag = enableBookmarkDrag;

// 禁用书签拖拽
function disableBookmarkDrag(item) {
    if (!item) return;
    item.classList.remove('bookmark-draggable');
    item.setAttribute('draggable', 'false');
    item.removeEventListener('dragstart', handleBookmarkDragStart);
    item.removeEventListener('dragend', handleBookmarkDragEnd);
}

function enableCardDrag(card) {
    card.classList.add('draggable');
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    // 同时使内部书签可拖拽（如果是在设置模式下）
    const bookmarks = card.querySelectorAll('.bookmark-item-wrapper');
    const catIndex = getCategoryIndex(card);
    bookmarks.forEach((bmWrapper, idx) => {
        enableBookmarkDrag(bmWrapper, catIndex, idx);
    });
}

function disableCardDrag(card) {
    card.classList.remove('draggable');
    card.setAttribute('draggable', 'false');
    card.removeEventListener('dragstart', handleDragStart);
    card.removeEventListener('dragover', handleDragOver);
    card.removeEventListener('drop', handleDrop);
    card.removeEventListener('dragend', handleDragEnd);

    // 禁用内部书签拖拽
    const bookmarks = card.querySelectorAll('.bookmark-item-wrapper');
    bookmarks.forEach(bm => disableBookmarkDrag(bm));
}

// 辅助：获取卡片的分类索引
function getCategoryIndex(card) {
    const cards = document.querySelectorAll('.bookmark-card');
    return Array.from(cards).indexOf(card);
}


// ===== 拖拽处理函数 =====
let draggedType = null; // 'card' or 'bookmark'

function handleDragStart(e) {
    e.stopPropagation(); // 防止冒泡
    draggedItem = this;
    draggedType = 'card';
    setTimeout(() => {
        this.classList.add('dragging');
        document.body.classList.add('is-dragging');
    }, 0);
}

// 书签拖拽 Start
function handleBookmarkDragStart(e) {
    e.stopPropagation();
    draggedItem = this;
    draggedType = 'bookmark';
    setTimeout(() => {
        this.classList.add('dragging');
        document.body.classList.add('is-dragging');
    }, 0);
}

function handleDragEnd(e) {
    e.stopPropagation();
    this.classList.remove('dragging');
    document.body.classList.remove('is-dragging');
    draggedItem = null;
    draggedType = null;

    // 拖拽卡片后，无论是否在布局编辑模式，都应该保存布局状态
    autoSave();
}

// 书签拖拽 End
function handleBookmarkDragEnd(e) {
    e.stopPropagation();
    this.classList.remove('dragging');
    document.body.classList.remove('is-dragging');
    draggedType = null;
    draggedItem = null;
}

function handleDragOver(e) {
    e.preventDefault();
}

async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    // 1. 卡片拖拽逻辑 (Card Swap)
    if (draggedType === 'card' && this.classList.contains('glass-card')) {
        if (this === draggedItem) return;
        const container = this.parentNode;
        const allItems = [...container.children];
        const draggedIdx = allItems.indexOf(draggedItem);
        const droppedIdx = allItems.indexOf(this);

        if (draggedIdx < droppedIdx) {
            this.after(draggedItem);
        } else {
            this.before(draggedItem);
        }
        // Save layout happens in dragEnd or explicitly here if needed
    }

    // 2. 书签拖拽逻辑 (Bookmark Move)
    // 允许 drop 到卡片上 (追加) 或 书签上 (插入)
    else if (draggedType === 'bookmark') {
        const targetCard = this.closest('.bookmark-card');
        if (!targetCard) return; // 必须 drop 在卡片区域内

        // 获取源数据信息
        const srcInfo = JSON.parse(draggedItem.dataset.dragCatInfo);
        const srcCatIdx = srcInfo.cat;
        const srcItemIdx = srcInfo.idx;

        // 获取目标卡片信息
        const targetCatName = targetCard.dataset.category;
        const bookmarks = await dataManager.getBookmarks();
        const targetCatIdx = bookmarks.findIndex(c => c.category === targetCatName);

        if (targetCatIdx === -1) return;

        // 获取移动的项目数据
        const itemData = bookmarks[srcCatIdx].items[srcItemIdx];

        // 从源移除
        bookmarks[srcCatIdx].items.splice(srcItemIdx, 1);

        // 确定插入位置
        // 如果 drop target 是 bookmark-item-wrapper，则插入其前/后
        const dropTargetBm = e.target.closest('.bookmark-item-wrapper');

        if (dropTargetBm && this.contains(dropTargetBm)) {
            // Drop on a bookmark
            // 需要重新计算索引，因为从源移除了一个，如果是同一个分类且源在目标前，目标索引可能变化
            // 为简化，我们先处理跨分类或同分类简单情况

            // 这里为了稳健，直接找到 dropTargetBm 在 targetCat 中的当前索引
            // 注意：此时源数据已被修改(内存中)，但 DOM 还没变，可以通过 DOM 查找索引
            let dropTargetIndex = -1;
            const targetBmList = Array.from(targetCard.querySelectorAll('.bookmark-item-wrapper'));
            dropTargetIndex = targetBmList.indexOf(dropTargetBm);

            // 如果是在同一分类，且源 < 目标，源的移除会使目标索引 -1
            if (srcCatIdx === targetCatIdx && srcItemIdx < dropTargetIndex) {
                // dropTargetIndex adjusted automatically? No, we modify array.
                // 实际上这里逻辑比较绕。重新加载数据最安全。
            }

            // 简单策略：如果是同一个项，忽略
            // 插入位置：总是插入到目标位置
            if (srcCatIdx === targetCatIdx && srcItemIdx === dropTargetIndex) {
                // 原地不动，把数据放回去
                bookmarks[srcCatIdx].items.splice(srcItemIdx, 0, itemData);
                return;
            }

            bookmarks[targetCatIdx].items.splice(dropTargetIndex, 0, itemData);

        } else {
            // Drop on the card blank area -> append to end
            bookmarks[targetCatIdx].items.push(itemData);
        }

        // 保存并重新渲染
        await dataManager.saveBookmarks(bookmarks);
        // 使用 window.loadBookmarks 确保调用到全局函数
        if (typeof window.loadBookmarks === 'function') {
            window.loadBookmarks();
        } else {
            location.reload();
        }
    }
}


// ===== 便签待办拖拽和调整大小 =====
function enableTodosDragAndResize() {
    const todosSection = document.getElementById('todos-section');
    if (!todosSection || todosSection.style.display === 'none') return;
    
    // 待办面板已固定位置，不再启用拖拽和调整大小功能
    // 保持固定在左侧：left: 2rem, top: 280px, width: 320px
    todosSection.style.position = 'fixed';
    todosSection.style.left = '2rem';
    todosSection.style.right = 'auto';
    todosSection.style.top = '280px';
    todosSection.style.width = '320px';
    
    // 不再启用拖拽和调整大小功能（待办面板固定位置）
    return;
    
    // 创建拖拽手柄（位于便签待办顶部）
    let dragHandle = todosSection.querySelector('.todos-drag-handle');
    if (!dragHandle) {
        dragHandle = document.createElement('div');
        dragHandle.className = 'todos-drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.style.cssText = `
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            width: 2rem;
            height: 1.5rem;
            background: rgba(139, 92, 246, 0.3);
            border: 1px solid var(--accent-color);
            border-radius: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            color: var(--accent-color);
            font-size: 0.875rem;
            z-index: 1000;
            user-select: none;
        `;
        const todosContainer = todosSection.querySelector('div');
        if (todosContainer) {
            todosContainer.style.position = 'relative';
            todosContainer.insertBefore(dragHandle, todosContainer.firstChild);
        }
    } else {
        dragHandle.style.display = 'flex';
    }
    
    // 拖拽手柄事件
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    
    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        
        const rect = todosSection.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        
        todosSection.style.transition = 'none';
        document.addEventListener('mousemove', handleTodosDrag);
        document.addEventListener('mouseup', stopTodosDrag);
    });
    
    function handleTodosDrag(e) {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const newLeft = startLeft + dx;
        const newTop = startTop + dy;
        
        const maxLeft = window.innerWidth - todosSection.offsetWidth;
        const maxTop = window.innerHeight - 100;
        
        todosSection.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        todosSection.style.top = Math.max(80, Math.min(newTop, maxTop)) + 'px';
        todosSection.style.right = 'auto';
    }
    
    function stopTodosDrag() {
        if (isDragging) {
            isDragging = false;
            todosSection.style.transition = '';
            saveTodosPosition();
            document.removeEventListener('mousemove', handleTodosDrag);
            document.removeEventListener('mouseup', stopTodosDrag);
        }
    }
    
    // 添加调整大小手柄
    let resizeHandle = todosSection.querySelector('.todos-resize-handle');
    if (!resizeHandle) {
        resizeHandle = document.createElement('div');
        resizeHandle.className = 'todos-resize-handle';
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            right: 0;
            width: 20px;
            height: 20px;
            background: var(--accent-color);
            cursor: se-resize;
            border-radius: 0 0 0.75rem 0;
            opacity: 0.7;
            z-index: 1000;
        `;
        todosSection.style.position = 'relative';
        todosSection.appendChild(resizeHandle);
    } else {
        resizeHandle.style.display = 'block';
    }
    
    // 调整大小事件
    let isResizing = false;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartWidth = todosSection.offsetWidth;
        resizeStartHeight = todosSection.offsetHeight;
        
        todosSection.style.transition = 'none';
        document.addEventListener('mousemove', handleTodosResize);
        document.addEventListener('mouseup', stopTodosResize);
    });
    
    function handleTodosResize(e) {
        if (!isResizing) return;
        
        const dx = e.clientX - resizeStartX;
        const dy = e.clientY - resizeStartY;
        
        let newWidth = Math.max(250, Math.min(800, resizeStartWidth + dx));
        let newHeight = Math.max(200, Math.min(600, resizeStartHeight + dy));
        
        todosSection.style.width = newWidth + 'px';
        todosSection.style.height = newHeight + 'px';
        todosSection.style.maxHeight = newHeight + 'px';
    }
    
    function stopTodosResize() {
        if (isResizing) {
            isResizing = false;
            todosSection.style.transition = '';
            saveTodosPosition();
            document.removeEventListener('mousemove', handleTodosResize);
            document.removeEventListener('mouseup', stopTodosResize);
        }
    }
    
    // 加载保存的位置和尺寸
    loadTodosPosition();
}

function disableTodosDragAndResize() {
    const todosSection = document.getElementById('todos-section');
    if (!todosSection) return;
    
    todosSection.classList.remove('todos-draggable');
    todosSection.style.cursor = '';
    
    const dragHandle = todosSection.querySelector('.todos-drag-handle');
    const resizeHandle = todosSection.querySelector('.todos-resize-handle');
    if (dragHandle) dragHandle.style.display = 'none';
    if (resizeHandle) resizeHandle.style.display = 'none';
    
    saveTodosPosition();
}

async function saveTodosPosition() {
    const todosSection = document.getElementById('todos-section');
    if (!todosSection) return;
    
    const config = await dataManager.getDashboardConfig();
    if (!config.todosPosition) config.todosPosition = {};
    
    config.todosPosition = {
        left: todosSection.style.left || '',
        top: todosSection.style.top || '',
        right: todosSection.style.right || '',
        width: todosSection.style.width || '',
        height: todosSection.style.height || '',
        maxHeight: todosSection.style.maxHeight || ''
    };
    
    await dataManager.saveDashboardConfig(config);
    autoSave();
}

async function loadTodosPosition() {
    const todosSection = document.getElementById('todos-section');
    if (!todosSection) return;
    
    // 待办面板固定在左侧，不再加载保存的位置
    // 始终固定在左侧：left: 2rem, top: 280px, width: 320px
    todosSection.style.position = 'fixed';
    todosSection.style.left = '2rem';
    todosSection.style.right = 'auto';
    todosSection.style.top = '280px';
    todosSection.style.width = '320px';
    
    // 不再加载保存的位置和尺寸（待办面板固定位置）
    // try {
    //     const config = await dataManager.getDashboardConfig();
    //     if (config.todosPosition) {
    //         const pos = config.todosPosition;
    //         if (pos.left) {
    //             todosSection.style.left = pos.left;
    //             todosSection.style.right = 'auto';
    //         }
    //         if (pos.top) todosSection.style.top = pos.top;
    //         if (pos.right && !pos.left) {
    //             todosSection.style.right = pos.right;
    //             todosSection.style.left = 'auto';
    //         }
    //         if (pos.width) todosSection.style.width = pos.width;
    //         if (pos.height) todosSection.style.height = pos.height;
    //         if (pos.maxHeight) todosSection.style.maxHeight = pos.maxHeight;
    //     }
    // } catch (error) {
    //     console.error('加载便签待办位置失败:', error);
    // }
}

// 暴露到全局
window.loadTodosPosition = loadTodosPosition;

// ===== 配置持久化 =====
async function saveCardConfig(index, updates) {
    const config = await dataManager.getDashboardConfig();
    if (!config.cards) config.cards = {};

    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    const card = cards[index];
    const cardId = card?.id || `card-${index}`;

    config.cards[cardId] = { ...config.cards[cardId], ...updates };
    await dataManager.saveDashboardConfig(config);
}

async function saveAllCardSettings() {
    await saveLayoutState();
    alert('所有设置已保存！');
}

// ===== 更新网站标题 =====
async function updateSiteTitle(newTitle) {
    if (!newTitle || newTitle.trim() === '') {
        newTitle = 'God\'s Bookmark'; // 默认标题
    }
    
    const titleValue = newTitle.trim();
    
    // 更新header中的logo
    const logoElement = document.querySelector('.logo');
    if (logoElement) {
        logoElement.textContent = titleValue;
    }
    
    // 更新页面标题
    document.title = titleValue;
    
    // 保存到配置
    const config = await dataManager.getDashboardConfig();
    config.siteTitle = titleValue;
    await dataManager.saveDashboardConfig(config);
    
    // 自动保存
    autoSave();
    
    console.log('网站标题已更新为:', titleValue);
}

// 暴露到全局
window.updateSiteTitle = updateSiteTitle;

// ===== 便签待办设置 =====
async function updateTodosTitle(newTitle) {
    if (!newTitle || newTitle.trim() === '') {
        newTitle = '便签待办'; // 默认标题
    }
    
    const titleValue = newTitle.trim();
    
    // 更新便签待办区域中的标题（保留钉住状态，取消📍图标）
    const todosTitleElement = document.querySelector('#todos-section h3');
    if (todosTitleElement) {
        // 检查当前状态（通过查看指示器或使用全局变量）
        const currentText = todosTitleElement.textContent;
        const isPinned = currentText.trim().startsWith('📌');
        
        // 使用清理函数移除所有图标标记
        let cleanedText = currentText;
        if (typeof window.cleanTodosTitle === 'function') {
            cleanedText = window.cleanTodosTitle(currentText);
        } else {
            // 备用清理方法
            cleanedText = currentText.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}❓?▶▼📌📍]\s*/gu, '').trim();
        }
        
        // 根据状态显示相应图标（取消📍图标）
        if (isPinned) {
            todosTitleElement.textContent = `📌 ${titleValue}`;
        } else {
            // 未钉住时不显示图标
            todosTitleElement.textContent = titleValue;
        }
        
        // 重新绑定双击事件（因为标题文本已更新）
        if (window.bindTodosTitleDoubleClick && typeof window.bindTodosTitleDoubleClick === 'function') {
            window.bindTodosTitleDoubleClick();
        }
    }
    
    // 保存到配置
    try {
        const config = await dataManager.getDashboardConfig();
        if (!config.todosSettings) {
            config.todosSettings = {};
        }
        config.todosSettings.title = titleValue;
        await dataManager.saveDashboardConfig(config);
        
        // 自动保存
        autoSave();
    } catch (error) {
        console.error('保存便签待办标题失败:', error);
    }
}

async function toggleTodosVisibility() {
    try {
        const config = await dataManager.getDashboardConfig();
        if (!config.todosSettings) {
            config.todosSettings = {};
        }
        
        const currentVisible = config.todosSettings.visible !== false; // 默认为true
        const newVisible = !currentVisible;
        config.todosSettings.visible = newVisible;
        
        // 更新显示状态
        const todosSection = document.getElementById('todos-section');
        if (todosSection) {
            todosSection.style.display = newVisible ? 'block' : 'none';
        }
        
        // 更新按钮文本
        const visibilityBtn = document.getElementById('todos-visibility-btn');
        if (visibilityBtn) {
            visibilityBtn.textContent = newVisible ? '显示中' : '已隐藏';
            visibilityBtn.style.background = newVisible ? 'var(--success-color)' : 'rgba(239, 68, 68, 0.3)';
            visibilityBtn.style.color = newVisible ? 'white' : 'var(--text-secondary)';
            visibilityBtn.title = newVisible ? '点击隐藏' : '点击显示';
        }
        
        // 保存配置
        await dataManager.saveDashboardConfig(config);
        autoSave();
    } catch (error) {
        console.error('切换便签待办显示状态失败:', error);
    }
}



// 应用便签待办透明度（应用到面板背景）
async function applyTodosOpacity(opacity) {
    const todosSection = document.getElementById('todos-section');
    if (!todosSection) return;
    
    const todosContainer = todosSection.querySelector('div');
    if (!todosContainer) return;
    
    // 获取当前主颜色
    try {
        const config = await dataManager.getDashboardConfig();
        const todosSettings = config.todosSettings || {};
        const mainColor = todosSettings.mainColor || '#8b5cf6';
        
        // 将hex颜色转换为rgba
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        
        const rgb = hexToRgb(mainColor);
        if (rgb) {
            todosContainer.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        }
    } catch (error) {
        console.error('应用便签待办透明度失败:', error);
    }
}

// 应用便签待办主颜色（应用到面板背景）
async function applyTodosMainColor(color) {
    const todosSection = document.getElementById('todos-section');
    if (!todosSection) return;
    
    const todosContainer = todosSection.querySelector('div');
    if (!todosContainer) return;
    
    // 获取当前透明度
    try {
        const config = await dataManager.getDashboardConfig();
        const todosSettings = config.todosSettings || {};
        const opacity = todosSettings.opacity !== undefined ? todosSettings.opacity : 0.7;
        
        // 将hex颜色转换为rgba
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        
        const rgb = hexToRgb(color);
        if (rgb) {
            todosContainer.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        }
    } catch (error) {
        console.error('应用便签待办主颜色失败:', error);
    }
}

window.updateTodosTitle = updateTodosTitle;
window.toggleTodosVisibility = toggleTodosVisibility;

// 切换书签卡片隐藏/显示
async function toggleBookmarkCardVisibility(categoryName) {
    try {
        console.log('[toggleBookmarkCardVisibility] Toggling visibility for category:', categoryName);
        
        const card = document.querySelector(`.bookmark-card[data-category="${categoryName}"]`);
        if (!card) {
            console.error('[toggleBookmarkCardVisibility] Card not found for category:', categoryName);
            return;
        }

        // 检查当前隐藏状态
        const isHidden = card.style.display === 'none';
        console.log('[toggleBookmarkCardVisibility] Current hidden state:', isHidden);
        
        // 使用内联样式设置display，并添加CSS类确保优先级
        if (isHidden) {
            // 显示卡片
            card.style.display = '';
            card.style.removeProperty('display');
            card.classList.remove('bookmark-card-hidden');
            console.log('[toggleBookmarkCardVisibility] Card shown');
        } else {
            // 隐藏卡片
            card.style.display = 'none';
            card.classList.add('bookmark-card-hidden');
            console.log('[toggleBookmarkCardVisibility] Card hidden');
        }

        // 更新配置
        const dataManagerInstance = window.dataManager || dataManager;
        if (!dataManagerInstance) {
            console.error('[toggleBookmarkCardVisibility] dataManager not available');
            return;
        }
        
        const config = await dataManagerInstance.getDashboardConfig();
        if (!config.bookmarkLayout) {
            config.bookmarkLayout = [];
        }

        let layoutItem = config.bookmarkLayout.find(item => item.category === categoryName);
        if (layoutItem) {
            layoutItem.hidden = !isHidden;
        } else {
            // 如果不存在，创建一个新的配置项
            config.bookmarkLayout.push({
                category: categoryName,
                index: 999,
                hidden: !isHidden,
                collapsed: false
            });
        }

        await dataManagerInstance.saveDashboardConfig(config);
        console.log('[toggleBookmarkCardVisibility] Config saved');

        // 更新设置面板中的按钮状态
        const btn = document.querySelector(`.toggle-bookmark-visibility-btn[data-category-name="${categoryName}"]`);
        if (btn) {
            const newHidden = !isHidden;
            btn.style.background = newHidden ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
            btn.style.color = newHidden ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
            btn.style.borderColor = newHidden ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)';
            btn.title = newHidden ? '点击显示' : '点击隐藏';
            btn.textContent = newHidden ? '○' : '●';
            console.log('[toggleBookmarkCardVisibility] Button state updated');
        } else {
            console.warn('[toggleBookmarkCardVisibility] Button not found for category:', categoryName);
        }
    } catch (error) {
        console.error('[toggleBookmarkCardVisibility] 切换书签卡片显示状态失败:', error);
    }
}

// 切换书签卡片折叠/展开
window.toggleBookmarkCardCollapse = async function(categoryName) {
    try {
        const card = document.querySelector(`.bookmark-card[data-category="${categoryName}"]`);
        if (!card) return;

        const grid = card.querySelector('.bookmark-grid');
        if (!grid) return;

        const isCollapsed = card.classList.contains('bookmark-card-collapsed');

        if (isCollapsed) {
            // 展开
            card.classList.remove('bookmark-card-collapsed');
            grid.classList.remove('bookmark-grid-collapsed');
            grid.style.display = 'grid';
        } else {
            // 折叠
            card.classList.add('bookmark-card-collapsed');
            grid.classList.add('bookmark-grid-collapsed');
            grid.style.display = 'none';
        }

        // 更新配置
        const config = await dataManager.getDashboardConfig();
        if (!config.bookmarkLayout) {
            config.bookmarkLayout = [];
        }

        let layoutItem = config.bookmarkLayout.find(item => item.category === categoryName);
        if (layoutItem) {
            layoutItem.collapsed = !isCollapsed;
        } else {
            // 如果不存在，创建一个新的配置项
            config.bookmarkLayout.push({
                category: categoryName,
                index: 999,
                hidden: false,
                collapsed: !isCollapsed
            });
        }

        await dataManager.saveDashboardConfig(config);
    } catch (error) {
        console.error('切换书签卡片折叠状态失败:', error);
    }
};

// 手动保存设置函数（已改为自动保存，此函数保留兼容性）
window.saveSettings = async function() {
    try {
        await saveLayoutState();
        // 不再显示提示，因为已经是自动保存
    } catch (error) {
        console.error('保存设置失败:', error);
    }
};

async function saveLayoutState() {
    const config = await dataManager.getDashboardConfig();

    // 保存监控区域布局
    const monitorSection = document.getElementById('monitor-section');
    const monitorContainer = monitorSection?.querySelector('.grid');

    const widgets = [];
    if (monitorContainer) {
        [...monitorContainer.children].forEach(child => {
            if (child.id) {
                let span = 1;
                if (child.classList.contains('span-2')) span = 2;
                if (child.classList.contains('span-3')) span = 3;

                widgets.push({
                    id: child.id,
                    span,
                    width: child.style.width || '',
                    height: child.style.height || ''
                });
            }
        });
    }
    config.layout = widgets;

    // 保存书签区域布局
    const bookmarksContainer = document.getElementById('bookmarks-container');
    if (bookmarksContainer) {
        const bookmarkCards = [];
        [...bookmarksContainer.children].forEach((child, index) => {
            // 获取卡片的分类名称作为标识（优先使用 dataset.category，兼容 h3.textContent）
            let categoryName = child.dataset.category;
            if (!categoryName) {
                const h3 = child.querySelector('h3');
                categoryName = h3 ? h3.textContent.trim() : `bookmark-${index}`;
            } else {
                categoryName = categoryName.trim();
            }

            let span = 1;
            if (child.classList.contains('span-2')) span = 2;
            if (child.classList.contains('span-3')) span = 3;
            if (child.classList.contains('span-4')) span = 4;

            // 获取隐藏和折叠状态
            const isHidden = child.style.display === 'none';
            const isCollapsed = child.classList.contains('bookmark-card-collapsed');
            
            bookmarkCards.push({
                category: categoryName,
                index: index,
                span,
                width: child.style.width || '',
                height: child.style.height || '',
                color: child.dataset.customColor || '',
                opacity: child.dataset.customOpacity || '0.7', // 保存透明度
                hidden: isHidden || false, // 保存隐藏状态
                collapsed: isCollapsed || false // 保存折叠状态
            });
        });
        config.bookmarkLayout = bookmarkCards;
    }

    await dataManager.saveDashboardConfig(config);
}

async function restoreLayout() {
    const config = await dataManager.getDashboardConfig();


    // 恢复监控区域布局
    if (config.layout) {
        const container = document.querySelector('#monitor-section .grid');
        if (container) {
            config.layout.forEach(item => {
                const el = document.getElementById(item.id);
                if (el) {
                    el.classList.remove('span-2', 'span-3');
                    if (item.span === 2) el.classList.add('span-2');
                    if (item.span === 3) el.classList.add('span-3');

                    // 恢复自定义尺寸
                    if (item.width) el.style.width = item.width;
                    if (item.height) el.style.height = item.height;

                    container.appendChild(el);
                }
            });
        }
    }

    // 恢复卡片单独配置（包含渐变色）
    if (config.cards) {
        Object.keys(config.cards).forEach(cardId => {
            const card = document.getElementById(cardId);
            const cardConfig = config.cards[cardId];
            if (card && cardConfig) {
                const opacity = cardConfig.opacity || '0.7';
                const color = cardConfig.color || '#8b5cf6';

                card.dataset.customOpacity = opacity;
                card.dataset.customColor = color;

                applyCardGradient(card, color, opacity);

                const fill = card.querySelector('.progress-fill');
                if (fill) fill.style.background = color;
            }
        });
    }

    // 书签布局在 loadBookmarks() 完成后通过 restoreBookmarkStyles() 恢复
    // 这里不再单独恢复，避免与 loadBookmarks() 中的恢复逻辑冲突
}

// 恢复书签卡片布局
async function restoreBookmarkLayout(config) {
    if (!config.bookmarkLayout) return;

    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    const cards = [...container.children];

    // 创建一个映射来存储卡片
    const cardMap = new Map();
    cards.forEach(card => {
        // 优先使用 dataset.category，兼容 h3.textContent
        let categoryName = card.dataset.category;
        if (!categoryName) {
            const h3 = card.querySelector('h3');
            categoryName = h3 ? h3.textContent.trim() : null;
        } else {
            categoryName = categoryName.trim();
        }
        if (categoryName) {
            cardMap.set(categoryName, card);
        }
    });

    // 首先强制重置所有卡片的大小（防止配置中还有大小数据）
    cards.forEach(card => {
        card.style.width = '';
        card.style.height = '';
    });

    // 第一步：恢复所有卡片的样式
    const sortedCards = [];
    config.bookmarkLayout.forEach(item => {
        const categoryName = item.category.trim();
        const card = cardMap.get(categoryName);

        if (card) {
            // 恢复尺寸类
            card.classList.remove('span-2', 'span-3', 'span-4');
            if (item.span === 2) card.classList.add('span-2');
            if (item.span === 3) card.classList.add('span-3');
            if (item.span === 4) card.classList.add('span-4');

            // 不恢复自定义尺寸（宽度和高度），确保调整后的大小在刷新后不恢复
            // 重置为默认大小，并清除配置中的大小数据
            card.style.width = '';
            card.style.height = '';
            
            // 清除配置中的大小数据
            if (item.width !== undefined) {
                delete item.width;
            }
            if (item.height !== undefined) {
                delete item.height;
            }

            // 恢复渐变色和透明度
            const opacity = item.opacity || card.dataset.customOpacity || '0.7';
            const color = item.color || card.dataset.customColor || '#8b5cf6';

            card.dataset.customOpacity = opacity;
            card.dataset.customColor = color;

            // 应用渐变样式
            applyCardGradient(card, color, opacity);

            // 保存到排序数组
            sortedCards.push({ card, index: item.index !== undefined ? item.index : 999 });
        }
    });
    
    // 再次确保所有卡片的大小都被重置（在清除配置数据后）
    cards.forEach(card => {
        card.style.width = '';
        card.style.height = '';
    });
    
    // 清除配置中的大小数据后，保存配置
    let needSaveConfig = false;
    config.bookmarkLayout.forEach(item => {
        if (item.width !== undefined || item.height !== undefined) {
            if (item.width !== undefined) delete item.width;
            if (item.height !== undefined) delete item.height;
            needSaveConfig = true;
        }
    });
    
    if (needSaveConfig) {
        try {
            await dataManager.saveDashboardConfig(config);
            console.log('[恢复布局] 已清除卡片大小配置并保存');
        } catch (err) {
            console.error('[恢复布局] 保存配置失败:', err);
        }
    }

    // 第二步：按保存的 index 重新排序
    sortedCards.sort((a, b) => a.index - b.index);
    sortedCards.forEach(({ card }) => {
        container.appendChild(card);
    });
    
    // 卡片重新排序后，更新右侧导航栏
    if (typeof window.renderRightNav === 'function') {
        setTimeout(() => {
            window.renderRightNav();
        }, 100);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', restoreLayout);

// ===== 布局编辑默认开启 (全局拖拽) =====
function enableLayoutEditing() {
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    cards.forEach(card => {
        enableCardDrag(card);
    });
    isLayoutEditing = true;
}

// ===== 卡片高亮联动 =====
function highlightCard(index) {
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    const card = cards[index];
    if (card) {
        // Remove previous highlights
        cards.forEach(c => c.classList.remove('highlighted-card'));
        const controls = document.querySelectorAll('.card-control-item');
        controls.forEach(c => c.classList.remove('highlighted'));

        // Add highlight
        card.classList.add('highlighted-card');
        
        // 滚动卡片，使卡片顶部对齐到视口中间位置
        const cardRect = card.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportMiddle = viewportHeight / 2;
        
        // 计算卡片顶部到视口中间的距离
        const cardTop = cardRect.top;
        const distanceToMiddle = cardTop - viewportMiddle;
        
        // 滚动页面，使卡片顶部对齐到中间
        window.scrollTo({
            top: window.scrollY + distanceToMiddle,
            behavior: 'smooth'
        });

        // Highlight control panel item too
        const controlItem = document.querySelector(`.card-control-item[data-card-index="${index}"]`);
        if (controlItem) {
            controlItem.classList.add('highlighted');
            
            // 同时滚动右侧设置面板，使控制项滚动到中间位置
            const sidebar = document.getElementById('admin-sidebar');
            const controlsList = document.getElementById('card-controls-list');
            if (controlsList && sidebar) {
                const sidebarRect = sidebar.getBoundingClientRect();
                const itemRect = controlItem.getBoundingClientRect();
                
                const sidebarMiddle = sidebarRect.top + sidebarRect.height / 2;
                const itemTop = itemRect.top;
                const distanceToMiddle = itemTop - sidebarMiddle;
                
                const currentScrollTop = controlsList.scrollTop;
                const newScrollTop = currentScrollTop + distanceToMiddle;
                const maxScrollTop = controlsList.scrollHeight - controlsList.clientHeight;
                const finalScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
                
                controlsList.scrollTo({
                    top: finalScrollTop,
                    behavior: 'smooth'
                });
            }
        }

        // Auto remove highlight after 2s
        setTimeout(() => {
            card.classList.remove('highlighted-card');
        }, 2000);
    }
}

// ===== 重命名卡片 =====
async function renameCard(index, newName) {
    if (!newName) return;
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    const card = cards[index];
    if (!card) return;

    const h3 = card.querySelector('h3');
    if (h3) h3.textContent = newName;

    // 如果是书签卡片，需要更新数据源和布局状态
    if (card.classList.contains('bookmark-card')) {
        // 获取旧名字用于查找 (或者通过 index)
        // 为了安全，重新读取数据并按索引更新
        const bookmarks = await dataManager.getBookmarks();
        // 注意：这里的 index 混合了 monitor 和 bookmark cards。
        // 需要计算 bookmark index.
        const monitorCardsCount = document.querySelectorAll('#monitor-section .glass-card').length;
        const bookmarkIndex = index - monitorCardsCount;

        if (bookmarkIndex >= 0 && bookmarks[bookmarkIndex]) {
            bookmarks[bookmarkIndex].category = newName;
            await dataManager.saveBookmarks(bookmarks);
            
            // 更新 dataset.category，以便布局状态保存时使用正确的分类名称
            card.dataset.category = newName;
            
            // 自动保存布局状态（包括分类名称的更新）
            autoSave();
        }
    }

    // 重新渲染控制面板以更新名字
    // renderCardControls(); // 这会导致 input失去焦点，暂不刷新或仅更新部分
}

// ===== 卡片点击高亮并滚动 (仅设置模式) =====
function bindCardClickEvents() {
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');

    cards.forEach((card, index) => {
        // 移除旧的事件监听器（避免重复绑定）
        // 使用 once 选项确保只绑定一次，或者使用标记来避免重复绑定
        if (card.dataset.cardClickBound) return;
        card.dataset.cardClickBound = 'true';
        
        card.addEventListener('click', (e) => {
            // 忽略拖拽或调整大小时的点击
            if (e.target.classList.contains('resize-handle') || 
                e.target.classList.contains('bookmark-resize-handle-right') ||
                e.target.classList.contains('bookmark-resize-handle-bottom')) return;
            
            // 忽略点击书签项内部链接的点击（让链接正常跳转，由 handleBookmarkClick 处理）
            if (e.target.closest('.bookmark-item')) {
                return;
            }

            // 忽略点击标题和输入框（标题有自己的双击事件，输入框有自己的点击事件）
            if (e.target.classList.contains('bookmark-card-title') || 
                e.target.classList.contains('bookmark-card-title-editable') ||
                e.target.classList.contains('category-name-input')) {
                return;
            }

            // 只有当侧边栏打开时才触发高亮
            const sidebar = document.getElementById('admin-sidebar');
            if (sidebar && sidebar.classList.contains('open')) {
                e.stopPropagation(); // 阻止冒泡，避免触发关闭逻辑
                // 点击左侧卡片空白位置，滚动右侧设置面板使其居中，但不滚动左侧卡片
                highlightCardControl(index, true, false);
            }
        });
    });
}

function highlightCardControl(index, shouldScroll = true, scrollLeftCard = true) {
    // 移除所有高亮
    document.querySelectorAll('.card-control-item').forEach(item => {
        item.classList.remove('highlighted');
    });
    document.querySelectorAll('.highlighted-card').forEach(card => {
        card.classList.remove('highlighted-card');
    });

    // 添加高亮到对应控制项
    const controlItem = document.querySelector(`.card-control-item[data-card-index="${index}"]`);
    if (controlItem) {
        controlItem.classList.add('highlighted');
    }

    // 添加高亮到对应的卡片
    const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
    const card = cards[index];
    if (card) {
        card.classList.add('highlighted-card');
    }

    // 当点击左侧卡片时，只滚动右侧设置面板使其居中，不滚动左侧卡片
    // shouldScroll: 是否滚动右侧设置面板
    // scrollLeftCard: 是否滚动左侧卡片（默认true，从右侧点击时为true，从左侧点击时为false）
    
    // 滚动控制面板到中间位置（垂直滚动）
    if (shouldScroll && controlItem) {
        const sidebar = document.getElementById('admin-sidebar');
        const controlsList = document.getElementById('card-controls-list');
        if (controlsList && sidebar) {
            // 获取侧边栏和控制项的位置信息
            const sidebarRect = sidebar.getBoundingClientRect();
            const itemRect = controlItem.getBoundingClientRect();
            
            // 计算侧边栏的中间位置（垂直方向）
            const sidebarMiddle = sidebarRect.top + sidebarRect.height / 2;
            
            // 计算控制项顶部到侧边栏中间的距离
            const itemTop = itemRect.top;
            const distanceToMiddle = itemTop - sidebarMiddle;
            
            // 计算需要滚动的距离（使控制项顶部对齐到中间位置）
            const currentScrollTop = controlsList.scrollTop;
            const newScrollTop = currentScrollTop + distanceToMiddle;
            
            // 确保滚动位置有效（不能小于0，不能超过最大滚动距离）
            const maxScrollTop = controlsList.scrollHeight - controlsList.clientHeight;
            const finalScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
            
            // 平滑滚动到中间位置
            controlsList.scrollTo({
                top: finalScrollTop,
                behavior: 'smooth'
            });
        }
    }

    // 只有当需要滚动左侧卡片时才执行（从右侧设置卡片点击时为true，从左侧书签卡片点击时为false）
    if (scrollLeftCard && card) {
        // 查找卡片的标题元素
        const title = card.querySelector('.bookmark-card-title, .bookmark-card-title-editable, h3');
        let targetElement = title || card;
        
        const targetRect = targetElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportMiddle = viewportHeight / 2;
        
        // 计算标题中心到视口中间的距离
        const targetCenter = targetRect.top + targetRect.height / 2;
        const distanceToMiddle = targetCenter - viewportMiddle;
        
        // 滚动页面，使标题中心对齐到视口中间
        window.scrollTo({
            top: window.scrollY + distanceToMiddle,
            behavior: 'smooth'
        });
    }
}

// ===== 书签缩放功能 =====
// 应用书签缩放
function applyBookmarkScale(scale) {
    // 基础尺寸：120px × 30px
    const baseWidth = 120;
    const baseHeight = 30;
    
    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;
    
    // 更新所有书签项的样式
    const wrappers = document.querySelectorAll('#bookmarks-container .bookmark-item-wrapper');
    wrappers.forEach(wrapper => {
        wrapper.style.width = `${scaledWidth}px`;
        wrapper.style.minWidth = `${scaledWidth}px`;
        wrapper.style.maxWidth = `${scaledWidth}px`;
        wrapper.style.height = `${scaledHeight}px`;
        wrapper.style.minHeight = `${scaledHeight}px`;
        wrapper.style.maxHeight = `${scaledHeight}px`;
    });
    
    const items = document.querySelectorAll('#bookmarks-container .bookmark-item');
    items.forEach(item => {
        item.style.height = `${scaledHeight}px`;
        item.style.minHeight = `${scaledHeight}px`;
        item.style.maxHeight = `${scaledHeight}px`;
        item.style.lineHeight = `${scaledHeight}px`;
    });
    
    // 更新网格布局的列宽
    const grids = document.querySelectorAll('#bookmarks-container .bookmark-grid');
    grids.forEach(grid => {
        grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${scaledWidth}px, ${scaledWidth}px))`;
    });
}

// 保存书签缩放比例
async function saveBookmarkScale(scale) {
    try {
        const config = await dataManager.getDashboardConfig();
        config.bookmarkScale = scale;
        await dataManager.saveDashboardConfig(config);
        console.log('[书签缩放] 已保存缩放比例:', scale);
    } catch (error) {
        console.error('[书签缩放] 保存失败:', error);
    }
}

// 恢复书签缩放比例
async function restoreBookmarkScale() {
    try {
        const config = await dataManager.getDashboardConfig();
        const scale = config.bookmarkScale !== undefined ? config.bookmarkScale : 1.0;
        applyBookmarkScale(scale);
    } catch (error) {
        console.error('[书签缩放] 恢复失败:', error);
        // 使用默认缩放
        applyBookmarkScale(1.0);
    }
}

// ===== 自动保存 =====
let autoSaveTimer = null;

function autoSave() {
    // 防抖处理
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
        await saveLayoutState();
    }, 500);
}

// 暴露到全局
window.openSettingsSidebar = openSettingsSidebar;
window.toggleSettingsSidebar = toggleSettingsSidebar;
window.closeSettingsSidebar = closeSettingsSidebar;
window.renderCardControls = renderCardControls;
window.previewCardOpacity = previewCardOpacity;
window.updateCardOpacity = updateCardOpacity;
window.updateCardColor = updateCardColor;
window.setCardSpan = setCardSpan;
window.applyCardGradient = applyCardGradient;
window.highlightCardControl = highlightCardControl;
window.toggleBookmarkCardVisibility = toggleBookmarkCardVisibility;
window.applyBookmarkScale = applyBookmarkScale;
window.restoreBookmarkScale = restoreBookmarkScale;
window.enableCardControlsDragSort = enableCardControlsDragSort;
window.bindManagementButtons = bindManagementButtons;
window.showUserManagementModal = showUserManagementModal;
window.hideUserManagementModal = hideUserManagementModal;
window.showBackupManagementModal = showBackupManagementModal;
window.hideBackupManagementModal = hideBackupManagementModal;
window.showUserProfileModal = showUserProfileModal;
window.hideUserProfileModal = hideUserProfileModal;

// ===== 主题切换功能 =====
// 应用主题
async function applyTheme(theme) {
    // theme: 'dark', 'light'
    const root = document.documentElement;
    // 如果主题是auto，转换为dark（兼容旧配置）
    if (theme === 'auto') {
        theme = 'dark';
    }
    root.setAttribute('data-theme', theme);
    console.log('[主题切换] 已切换到:', theme);
    
    // 更新所有卡片的渐变背景
    updateAllCardGradients();
}

// 更新所有卡片的渐变背景（主题切换时调用）
function updateAllCardGradients() {
    // 使用 setTimeout 确保主题属性已经正确设置到 DOM
    setTimeout(() => {
        const cards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .glass-card');
        cards.forEach((card, index) => {
            const color = card.dataset.customColor || '#8b5cf6';
            const opacity = card.dataset.customOpacity || '0.7';
            applyCardGradient(card, color, opacity);
            
            // 同时更新设置面板中对应控制项的颜色
            updateCardControlItemColor(index, color, opacity);
        });
    }, 50);
}

// 保存主题设置
async function saveTheme(theme) {
    try {
        const dataManagerInstance = window.dataManager || dataManager;
        if (!dataManagerInstance) {
            console.error('[saveTheme] dataManager not available');
            return;
        }
        const config = await dataManagerInstance.getDashboardConfig();
        config.theme = theme;
        await dataManagerInstance.saveDashboardConfig(config);
        console.log('[主题切换] 已保存主题设置:', theme);
    } catch (error) {
        console.error('[主题切换] 保存失败:', error);
    }
}

// 恢复主题设置
async function restoreTheme() {
    try {
        const dataManagerInstance = window.dataManager || dataManager;
        if (!dataManagerInstance) {
            console.error('[restoreTheme] dataManager not available');
            await applyTheme('dark');
            return;
        }
        const config = await dataManagerInstance.getDashboardConfig();
        const theme = config.theme || 'dark'; // 默认暗色
        await applyTheme(theme);
    } catch (error) {
        console.error('[主题切换] 恢复失败:', error);
        // 使用默认主题
        await applyTheme('dark');
    }
}

window.applyTheme = applyTheme;
window.restoreTheme = restoreTheme;

// ===== 设置面板卡片拖拽排序 =====
let isCardControlsDragging = false;
let draggedControlItem = null;
let draggedControlIndex = null;
let cardControlsDragPreviewIndicator = null;
let cardControlsLastTargetItem = null;
let cardControlsDragStartY = 0;
let cardControlsDragCurrentY = 0;

// 启用设置面板中的卡片拖拽排序
function enableCardControlsDragSort() {
    const container = document.getElementById('card-controls-list');
    if (!container) return;
    
    const items = container.querySelectorAll('.card-control-item');
    items.forEach((item, index) => {
        // 查找拖拽手柄容器（在h4前面的容器）
        const dragHandleContainer = item.querySelector('.drag-handle-container');
        if (!dragHandleContainer) return;

        // 如果已经有拖拽手柄，跳过
        if (dragHandleContainer.querySelector('.drag-handle-controls')) return;

        // 添加拖拽图标和样式
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle-controls';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.style.cssText = `
            width: 32px;
            height: 32px;
            cursor: move;
            color: var(--text-secondary);
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.6;
            transition: opacity 0.2s;
            user-select: none;
            line-height: 1;
        `;
        dragHandle.title = '拖动调整位置';

        // 悬停时显示
        dragHandle.addEventListener('mouseenter', () => {
            dragHandle.style.opacity = '1';
        });
        dragHandle.addEventListener('mouseleave', () => {
            dragHandle.style.opacity = '0.6';
        });

        // 拖拽开始
        dragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const cardIndex = parseInt(item.dataset.cardIndex);
            if (!isNaN(cardIndex)) {
                startCardControlsDrag(e, item, cardIndex);
            }
        });

        // 插入到拖拽手柄容器中
        dragHandleContainer.appendChild(dragHandle);
    });
}

// 开始拖拽设置面板中的卡片
function startCardControlsDrag(e, item, cardIndex) {
    e.preventDefault();
    e.stopPropagation();
    
    isCardControlsDragging = true;
    draggedControlItem = item;
    draggedControlIndex = cardIndex;
    cardControlsDragStartY = e.clientY;
    cardControlsDragCurrentY = e.clientY;
    
    // 添加视觉反馈
    draggedControlItem.style.opacity = '0.7';
    draggedControlItem.style.transform = 'scale(0.98)';
    draggedControlItem.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
    draggedControlItem.style.zIndex = '1000';
    draggedControlItem.style.cursor = 'grabbing';
    draggedControlItem.style.transition = 'none';
    
    // 为其他项添加过渡效果
    const container = document.getElementById('card-controls-list');
    if (container) {
        const allItems = container.querySelectorAll('.card-control-item');
        allItems.forEach(otherItem => {
            if (otherItem !== draggedControlItem) {
                otherItem.style.transition = 'transform 0.2s ease';
            }
        });
    }
    
    document.addEventListener('mousemove', handleCardControlsDrag);
    document.addEventListener('mouseup', stopCardControlsDrag);
}

// 处理拖拽过程
function handleCardControlsDrag(e) {
    if (!isCardControlsDragging || !draggedControlItem) return;
    
    e.preventDefault();
    cardControlsDragCurrentY = e.clientY;
    
    const container = document.getElementById('card-controls-list');
    if (!container) return;
    
    // 更新拖拽项的位置
    const deltaY = cardControlsDragCurrentY - cardControlsDragStartY;
    draggedControlItem.style.transform = `translateY(${deltaY}px) scale(0.98)`;
    
    // 查找目标位置
    const allItems = Array.from(container.querySelectorAll('.card-control-item[data-card-index]'));
    let targetItem = null;
    let targetIndex = -1;
    
    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        if (item === draggedControlItem) continue;
        
        const rect = item.getBoundingClientRect();
        const itemMiddle = rect.top + rect.height / 2;
        
        if (cardControlsDragCurrentY < itemMiddle && i < draggedControlIndex) {
            targetItem = item;
            targetIndex = i;
            break;
        } else if (cardControlsDragCurrentY > itemMiddle && i > draggedControlIndex) {
            targetItem = item;
            targetIndex = i;
        }
    }
    
    // 更新预览指示器和目标项样式
    if (targetItem && targetItem !== cardControlsLastTargetItem) {
        // 移除旧的预览指示器
        if (cardControlsDragPreviewIndicator && cardControlsDragPreviewIndicator.parentNode) {
            cardControlsDragPreviewIndicator.parentNode.removeChild(cardControlsDragPreviewIndicator);
        }
        
        // 恢复上一个目标项的样式
        if (cardControlsLastTargetItem && cardControlsLastTargetItem !== draggedControlItem) {
            cardControlsLastTargetItem.style.transform = '';
            cardControlsLastTargetItem.style.marginTop = '';
            cardControlsLastTargetItem.style.marginBottom = '';
        }
        
        // 创建新的预览指示器
        cardControlsDragPreviewIndicator = document.createElement('div');
        cardControlsDragPreviewIndicator.style.cssText = `
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
            margin: 4px 0;
            border-radius: 1px;
            opacity: 0.8;
            pointer-events: none;
            animation: previewPulse 1s ease-in-out infinite;
        `;
        
        // 添加动画
        if (!document.getElementById('previewPulseAnimation')) {
            const style = document.createElement('style');
            style.id = 'previewPulseAnimation';
            style.textContent = `
                @keyframes previewPulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // 插入预览指示器
        const insertBefore = cardControlsDragCurrentY < targetItem.getBoundingClientRect().top + targetItem.getBoundingClientRect().height / 2;
        if (insertBefore) {
            container.insertBefore(cardControlsDragPreviewIndicator, targetItem);
    } else {
            if (targetItem.nextSibling) {
                container.insertBefore(cardControlsDragPreviewIndicator, targetItem.nextSibling);
            } else {
                container.appendChild(cardControlsDragPreviewIndicator);
            }
        }
        
        // 高亮目标项
        targetItem.style.transform = `translateY(${insertBefore ? '-4px' : '4px'})`;
        cardControlsLastTargetItem = targetItem;
        
        // 实际移动DOM元素（在下一帧执行，确保预览先显示）
        requestAnimationFrame(() => {
            if (draggedControlItem && targetItem && cardControlsDragPreviewIndicator) {
                // 临时移除预览指示器
                const tempIndicator = cardControlsDragPreviewIndicator;
                if (tempIndicator.parentNode) {
                    tempIndicator.parentNode.removeChild(tempIndicator);
                }
                
                // 移动拖拽项
                if (insertBefore) {
                    container.insertBefore(draggedControlItem, targetItem);
                } else {
                    if (targetItem.nextSibling) {
                        container.insertBefore(draggedControlItem, targetItem.nextSibling);
                    } else {
                        container.appendChild(draggedControlItem);
                    }
                }
                
                // 重新插入预览指示器
                if (insertBefore) {
                    container.insertBefore(tempIndicator, draggedControlItem);
                } else {
                    if (draggedControlItem.nextSibling) {
                        container.insertBefore(tempIndicator, draggedControlItem.nextSibling);
                    } else {
                        container.appendChild(tempIndicator);
                    }
                }
                
                // 更新索引
                const newItems = Array.from(container.querySelectorAll('.card-control-item[data-card-index]'));
                draggedControlIndex = newItems.indexOf(draggedControlItem);
            }
        });
    } else if (!targetItem && cardControlsDragPreviewIndicator) {
        // 没有目标项，移除预览指示器
        if (cardControlsDragPreviewIndicator.parentNode) {
            cardControlsDragPreviewIndicator.parentNode.removeChild(cardControlsDragPreviewIndicator);
            cardControlsDragPreviewIndicator = null;
        }
    }
}

async function stopCardControlsDrag(e) {
    if (!isCardControlsDragging || !draggedControlItem) {
        isCardControlsDragging = false;
        draggedControlItem = null;
        draggedControlIndex = null;
        cardControlsDragPreviewIndicator = null;
        cardControlsLastTargetItem = null;
        document.removeEventListener('mousemove', handleCardControlsDrag);
        document.removeEventListener('mouseup', stopCardControlsDrag);
        return;
    }
    
    // 移除预览指示器
    if (cardControlsDragPreviewIndicator && cardControlsDragPreviewIndicator.parentNode) {
        cardControlsDragPreviewIndicator.parentNode.removeChild(cardControlsDragPreviewIndicator);
        cardControlsDragPreviewIndicator = null;
    }
    
    // 恢复目标项的样式
    if (cardControlsLastTargetItem && cardControlsLastTargetItem !== draggedControlItem) {
        cardControlsLastTargetItem.style.transform = '';
        cardControlsLastTargetItem.style.marginTop = '';
        cardControlsLastTargetItem.style.marginBottom = '';
        cardControlsLastTargetItem = null;
    }
    
    // 获取新的顺序
    const container = document.getElementById('card-controls-list');
    if (!container) return;
    
    const allControlItems = Array.from(container.querySelectorAll('.card-control-item[data-card-index]'));
    const newOrder = [];
    
    allControlItems.forEach((item, newIndex) => {
        const cardIndex = parseInt(item.dataset.cardIndex);
        if (isNaN(cardIndex)) return;
        
        // 获取对应的书签卡片
        const allCards = document.querySelectorAll('#monitor-section .glass-card, #bookmarks-container .bookmark-card');
        const card = allCards[cardIndex];
        if (card && card.classList.contains('bookmark-card')) {
            const category = card.dataset.category;
            if (category) {
                newOrder.push({ category, index: newIndex });
            }
        }
    });
    
    // 更新配置中的index
    const dataManagerInstance = window.dataManager || dataManager;
    if (!dataManagerInstance) {
        console.error('[stopCardControlsDrag] dataManager not available');
        return;
    }
    const config = await dataManagerInstance.getDashboardConfig();
    if (!config.bookmarkLayout) {
        config.bookmarkLayout = [];
    }
    
    // 更新每个书签卡片的index
    newOrder.forEach(({ category, index }) => {
        let layoutItem = config.bookmarkLayout.find(item => item.category === category);
        if (layoutItem) {
            layoutItem.index = index;
        } else {
            config.bookmarkLayout.push({
                category: category,
                index: index,
                hidden: false,
                collapsed: false
            });
        }
    });
    
    await dataManager.saveDashboardConfig(config);
    
    // 同步更新左侧书签卡片位置
    await syncBookmarkCardOrder(config.bookmarkLayout);
    
    // 恢复拖拽项的样式（带动画）
    draggedControlItem.style.transition = 'transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease';
    draggedControlItem.style.opacity = '';
    draggedControlItem.style.cursor = '';
    draggedControlItem.style.transform = '';
    draggedControlItem.style.boxShadow = '';
    draggedControlItem.style.zIndex = '';
    
    // 等待动画完成后再移除过渡
    setTimeout(() => {
        if (draggedControlItem) {
            draggedControlItem.style.transition = '';
        }
    }, 300);
    
    // 重置状态
    isCardControlsDragging = false;
    draggedControlItem = null;
    draggedControlIndex = null;
    document.removeEventListener('mousemove', handleCardControlsDrag);
    document.removeEventListener('mouseup', stopCardControlsDrag);
}

// 同步书签卡片顺序（左侧）
async function syncBookmarkCardOrder(bookmarkLayout) {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;
    
    // 按index排序
    const sortedLayout = [...bookmarkLayout].sort((a, b) => {
        const aIndex = a.index !== undefined ? a.index : 999;
        const bIndex = b.index !== undefined ? b.index : 999;
        return aIndex - bIndex;
    });
    
    // 重新排序DOM元素
    sortedLayout.forEach(layoutItem => {
        const card = container.querySelector(`.bookmark-card[data-category="${layoutItem.category}"]`);
        if (card) {
            container.appendChild(card);
        }
    });
}

// 更新书签卡片顺序（当左侧拖动时）
async function updateBookmarkCardOrder() {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;
    
    // 获取所有书签卡片的当前顺序
    const cards = Array.from(container.querySelectorAll('.bookmark-card'));
    const newOrder = cards.map((card, index) => ({
        category: card.dataset.category,
        index: index
    }));
    
    // 更新配置
    const dataManagerInstance = window.dataManager || dataManager;
    if (!dataManagerInstance) {
        console.error('[updateBookmarkCardOrder] dataManager not available');
        return;
    }
    const config = await dataManagerInstance.getDashboardConfig();
    if (!config.bookmarkLayout) {
        config.bookmarkLayout = [];
    }
    
    // 更新每个卡片的index
    newOrder.forEach(({ category, index }) => {
        let layoutItem = config.bookmarkLayout.find(item => item.category === category);
        if (layoutItem) {
            layoutItem.index = index;
        } else {
            config.bookmarkLayout.push({
                category: category,
                index: index,
                hidden: false,
                collapsed: false
            });
        }
    });
    
    await dataManagerInstance.saveDashboardConfig(config);
    
    // 同步更新设置菜单中的位置
    await renderCardControls();
}

// 使用上下箭头移动设置面板中的卡片顺序，并同步到左侧书签卡片
async function moveCardControl(currentIndex, delta) {
    const dataManagerInstance = window.dataManager || dataManager;
    if (!dataManagerInstance) return;

    const config = await dataManagerInstance.getDashboardConfig();
    if (!config.bookmarkLayout || !Array.isArray(config.bookmarkLayout)) {
        return;
    }

    const layout = [...config.bookmarkLayout];
    // 根据 index 排序，保证顺序一致
    layout.sort((a, b) => {
        const ai = a.index ?? 999;
        const bi = b.index ?? 999;
        return ai - bi;
    });

    const pos = layout.findIndex(item => (item.index ?? 999) === currentIndex);
    if (pos === -1) return;

    const targetPos = pos + delta;
    if (targetPos < 0 || targetPos >= layout.length) return;

    // 交换 index
    const currentItem = layout[pos];
    const targetItem = layout[targetPos];
    const tmpIndex = currentItem.index;
    currentItem.index = targetItem.index;
    targetItem.index = tmpIndex;

    config.bookmarkLayout = layout;
    await dataManagerInstance.saveDashboardConfig(config);
    await syncBookmarkCardOrder(config.bookmarkLayout);
    await renderCardControls();
}

// ===== 管理功能按钮绑定 =====
function bindManagementButtons() {
    // 用户管理按钮
    const userManagementBtn = document.getElementById('user-management-btn');
    if (userManagementBtn) {
        const newBtn = userManagementBtn.cloneNode(true);
        userManagementBtn.parentNode.replaceChild(newBtn, userManagementBtn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showUserManagementModal();
        });
    } else {
        console.warn('[bindManagementButtons] User management button not found');
    }
    
    // 备份管理按钮
    const backupManagementBtn = document.getElementById('backup-management-btn');
    if (backupManagementBtn) {
        const newBtn = backupManagementBtn.cloneNode(true);
        backupManagementBtn.parentNode.replaceChild(newBtn, backupManagementBtn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showBackupManagementModal();
        });
    } else {
        console.warn('[bindManagementButtons] Backup management button not found');
    }
    
    // 修改密码按钮
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        const newBtn = changePasswordBtn.cloneNode(true);
        changePasswordBtn.parentNode.replaceChild(newBtn, changePasswordBtn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showUserProfileModal();
        });
    } else {
        console.warn('[bindManagementButtons] User profile button not found');
    }
}

// ===== 用户管理模态框 =====
function showUserManagementModal() {
    const modal = document.getElementById('user-management-modal');
    if (modal) {
        modal.style.display = 'flex';
        loadUsersList();
    }
}

function hideUserManagementModal() {
    const modal = document.getElementById('user-management-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== 备份管理模态框 =====
function showBackupManagementModal() {
    const modal = document.getElementById('backup-management-modal');
    if (modal) {
        modal.style.display = 'flex';
        loadBackupConfigs();
    }
}

function hideBackupManagementModal() {
    const modal = document.getElementById('backup-management-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== 用户资料模态框（修改密码）=====
function showUserProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    if (modal && window.userManager && window.userManager.currentUser) {
        const usernameInput = document.getElementById('user-profile-username');
        if (usernameInput) {
            usernameInput.value = window.userManager.currentUser.username || '';
        }
        modal.style.display = 'flex';
    }
}

function hideUserProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    if (modal) {
        modal.style.display = 'none';
        // 清空表单
        const oldPasswordInput = document.getElementById('user-profile-old-password');
        const newPasswordInput = document.getElementById('user-profile-new-password');
        const confirmPasswordInput = document.getElementById('user-profile-confirm-password');
        if (oldPasswordInput) oldPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
    }
}

// ===== 加载用户列表 =====
async function loadUsersList() {
    try {
        if (!window.userManager) {
            console.error('[loadUsersList] userManager not available');
            return;
        }
        
        const resp = await window.userManager.listUsers();
        if (!resp || !resp.success) {
            console.error('[loadUsersList] listUsers failed:', resp && resp.error);
            renderUsersList([]);
            return;
        }
        renderUsersList(resp.users || []);
    } catch (error) {
        console.error('[loadUsersList] 加载用户列表失败:', error);
    }
}

// ===== 渲染用户列表 =====
function renderUsersList(users) {
    const container = document.getElementById('users-list');
    if (!container) return;
    
    if (!users || users.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">暂无用户</div>';
        return;
    }
    
    let html = '';
    users.forEach(user => {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background: rgba(139, 92, 246, 0.05); border-radius: 0.5rem; border: 1px solid var(--card-border);">
                <div>
                    <div style="font-weight: 500; color: var(--text-primary);">${user.username}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${user.role === 'admin' ? '管理员' : '普通用户'}</div>
                </div>
                <button class="edit-user-btn" data-user-id="${user.id}" style="padding: 0.4rem 0.8rem; background: var(--accent-color); color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem;">编辑</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    bindUserAndBackupEvents();
}

let lastBackupConfigs = [];

// ===== 加载备份配置列表 =====
async function loadBackupConfigs() {
    try {
        if (!window.backupManager) {
            console.error('[loadBackupConfigs] backupManager not available');
            return;
        }
        
        const resp = await window.backupManager.getBackupConfigs();
        if (!resp || !resp.success) {
            console.error('[loadBackupConfigs] getBackupConfigs failed:', resp && resp.error);
            lastBackupConfigs = [];
            renderBackupConfigs([]);
            return;
        }
        lastBackupConfigs = resp.configs || [];
        renderBackupConfigs(lastBackupConfigs);
    } catch (error) {
        console.error('[loadBackupConfigs] 加载备份配置失败:', error);
    }
}

// ===== 渲染备份配置列表 =====
function renderBackupConfigs(configs) {
    const container = document.getElementById('backup-configs-list');
    if (!container) return;
    
    if (!configs || configs.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">暂无备份配置</div>';
        return;
    }
    
    let html = '';
    configs.forEach(config => {
        const configData = typeof config.config === 'string' ? JSON.parse(config.config) : (config.config || {});
        const type = config.backup_type || config.backupType || config.backup_type;
        html += `
            <div style="padding: 1rem; margin-bottom: 0.75rem; background: rgba(139, 92, 246, 0.05); border-radius: 0.5rem; border: 1px solid var(--card-border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 500; color: var(--text-primary);">${type === 'local' ? '本地/NAS' : type === 'aliyun' ? '阿里云OSS' : type === 'baidu' ? '百度云' : (type || '')}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${config.enabled ? '已启用' : '已禁用'} | ${config.schedule || '手动'}</div>
                    </div>
                    <button class="edit-backup-config-btn" data-config-id="${config.id}" style="padding: 0.4rem 0.8rem; background: var(--accent-color); color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem;">编辑</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    bindUserAndBackupEvents();
}

// ===== 绑定用户和备份管理事件 =====
function bindUserAndBackupEvents() {
    // 用户管理模态框关闭按钮
    const userManagementClose = document.getElementById('user-management-close');
    if (userManagementClose) {
        userManagementClose.onclick = hideUserManagementModal;
    }
    
    // 备份管理模态框关闭按钮
    const backupManagementClose = document.getElementById('backup-management-close');
    if (backupManagementClose) {
        backupManagementClose.onclick = hideBackupManagementModal;
    }
    
    // 用户资料模态框关闭按钮
    const userProfileClose = document.getElementById('user-profile-close');
    if (userProfileClose) {
        userProfileClose.onclick = hideUserProfileModal;
    }
    
    // 添加用户按钮
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.onclick = () => {
            // 打开用户编辑模态框（添加模式）
            const editModal = document.getElementById('user-edit-modal');
            const title = document.getElementById('user-edit-title');
            if (editModal && title) {
                title.textContent = '添加用户';
                editModal.style.display = 'flex';
                document.getElementById('user-edit-username').value = '';
                document.getElementById('user-edit-password').value = '';
                document.getElementById('user-edit-role').value = 'user';
                delete editModal.dataset.userId;
                
                // 添加模式下隐藏删除按钮
                const deleteBtn = document.getElementById('user-edit-delete');
                if (deleteBtn) {
                    deleteBtn.style.display = 'none';
                }
            }
        };
    }
    
    
    // 编辑用户按钮（事件委托）
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.onclick = async () => {
            const userId = parseInt(btn.getAttribute('data-user-id'));
            if (!isNaN(userId) && window.userManager) {
                const resp = await window.userManager.listUsers();
                const users = resp && resp.success ? (resp.users || []) : [];
                const user = users.find(u => u.id === userId);
                if (user) {
                    const editModal = document.getElementById('user-edit-modal');
                    const title = document.getElementById('user-edit-title');
                    if (editModal && title) {
                        title.textContent = '编辑用户';
                        editModal.style.display = 'flex';
                        document.getElementById('user-edit-username').value = user.username;
                        document.getElementById('user-edit-password').value = '';
                        document.getElementById('user-edit-role').value = user.role;
                        editModal.dataset.userId = userId;
                        
                        // 编辑模式下显示删除按钮
                        const deleteBtn = document.getElementById('user-edit-delete');
                        if (deleteBtn) {
                            deleteBtn.style.display = 'inline-flex';
                        }
                    }
                }
            }
        };
    });
    
    // 辅助函数：根据类型构建备份配置表单
    function buildBackupConfigOptions(type, configData = {}) {
        const container = document.getElementById('backup-config-options');
        if (!container) return;
        let html = '';
        if (type === 'local') {
            html = `
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">本地/NAS 路径</label>
                <input type="text" id="backup-config-local-path" class="input-field"
                    placeholder="例如：D:\\\\Backups 或 \\\\NAS\\\\share\\\\backups"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;"
                    value="${configData.path || ''}">
            `;
        } else if (type === 'aliyun') {
            html = `
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">区域 Region</label>
                <input type="text" id="backup-config-aliyun-region" class="input-field"
                    placeholder="例如：oss-cn-hangzhou"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.region || ''}">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">AccessKey ID</label>
                <input type="text" id="backup-config-aliyun-ak" class="input-field"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.accessKeyId || ''}">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">AccessKey Secret</label>
                <input type="password" id="backup-config-aliyun-sk" class="input-field"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.accessKeySecret || ''}">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">Bucket</label>
                <input type="text" id="backup-config-aliyun-bucket" class="input-field"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.bucket || ''}">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">路径前缀（可选）</label>
                <input type="text" id="backup-config-aliyun-prefix" class="input-field"
                    placeholder="例如：gods-bookmark/backups"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.prefix || ''}">
            `;
        } else if (type === 'baidu') {
            html = `
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">区域 Region</label>
                <input type="text" id="backup-config-baidu-region" class="input-field"
                    placeholder="例如：bj"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.region || ''}">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">AccessKey ID</label>
                <input type="text" id="backup-config-baidu-ak" class="input-field"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.accessKeyId || ''}">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">Secret Key</label>
                <input type="password" id="backup-config-baidu-sk" class="input-field"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.secretKey || ''}">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">Bucket</label>
                <input type="text" id="backup-config-baidu-bucket" class="input-field"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.bucket || ''}">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">路径前缀（可选）</label>
                <input type="text" id="backup-config-baidu-prefix" class="input-field"
                    placeholder="例如：gods-bookmark/backups"
                    style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;"
                    value="${configData.prefix || ''}">
            `;
        }
        container.innerHTML = html;
    }

    function getBackupConfigFormValues(type) {
        const cfg = {};
        if (type === 'local') {
            const pathInput = document.getElementById('backup-config-local-path');
            cfg.path = pathInput ? pathInput.value.trim() : '';
        } else if (type === 'aliyun') {
            cfg.region = (document.getElementById('backup-config-aliyun-region')?.value || '').trim();
            cfg.accessKeyId = (document.getElementById('backup-config-aliyun-ak')?.value || '').trim();
            cfg.accessKeySecret = (document.getElementById('backup-config-aliyun-sk')?.value || '').trim();
            cfg.bucket = (document.getElementById('backup-config-aliyun-bucket')?.value || '').trim();
            cfg.prefix = (document.getElementById('backup-config-aliyun-prefix')?.value || '').trim();
        } else if (type === 'baidu') {
            cfg.region = (document.getElementById('backup-config-baidu-region')?.value || '').trim();
            cfg.accessKeyId = (document.getElementById('backup-config-baidu-ak')?.value || '').trim();
            cfg.secretKey = (document.getElementById('backup-config-baidu-sk')?.value || '').trim();
            cfg.bucket = (document.getElementById('backup-config-baidu-bucket')?.value || '').trim();
            cfg.prefix = (document.getElementById('backup-config-baidu-prefix')?.value || '').trim();
        }
        return cfg;
    }

    function presetToCron(preset) {
        switch (preset) {
            case 'daily':
                return '0 2 * * *';       // 每天凌晨2点
            case 'weekly':
                return '0 2 * * 0';       // 每周日凌晨2点
            case 'monthly':
                return '0 2 1 * *';       // 每月1日凌晨2点
            case 'quarterly':
                return '0 2 1 */3 *';     // 每3个月的1日凌晨2点
            default:
                return '';
        }
    }

    function cronToPreset(cron) {
        cron = (cron || '').trim();
        if (!cron) return '';
        if (cron === '0 2 * * *') return 'daily';
        if (cron === '0 2 * * 0') return 'weekly';
        if (cron === '0 2 1 * *') return 'monthly';
        if (cron === '0 2 1 */3 *') return 'quarterly';
        return '';
    }

    function openBackupConfigEditModal(config) {
        const modal = document.getElementById('backup-config-edit-modal');
        if (!modal) return;

        const title = document.getElementById('backup-config-edit-title');
        const typeSelect = document.getElementById('backup-config-type');
        const enabledCheckbox = document.getElementById('backup-config-enabled');
        const scheduleInput = document.getElementById('backup-config-schedule');
        const schedulePreset = document.getElementById('backup-config-schedule-preset');

        const isAdmin = window.userManager && window.userManager.isAdmin && window.userManager.isAdmin();

        const deleteBtn = document.getElementById('backup-config-edit-delete');
        
        if (config) {
            // 编辑模式
            const type = config.backup_type || config.backupType || config.backup_type || 'aliyun';
            const cfgData = typeof config.config === 'string' ? JSON.parse(config.config) : (config.config || {});

            if (title) title.textContent = '编辑备份配置';
            modal.dataset.configId = config.id;
            
            // 显示删除按钮
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-flex';
            }

            if (typeSelect) {
                typeSelect.value = type;
                // 应用管理员权限（本地/NAS 仅管理员）
                Array.from(typeSelect.options).forEach(opt => {
                    if (opt.value === 'local') {
                        opt.disabled = !isAdmin;
                    }
                });
            }

            buildBackupConfigOptions(type, cfgData);

            if (enabledCheckbox) {
                enabledCheckbox.checked = !!config.enabled;
            }

            if (scheduleInput) {
                scheduleInput.value = config.schedule || '';
            }

            if (schedulePreset && scheduleInput) {
                schedulePreset.value = cronToPreset(scheduleInput.value);
            }
        } else {
            // 添加模式
            if (title) title.textContent = '添加备份配置';
            delete modal.dataset.configId;
            
            // 隐藏删除按钮
            if (deleteBtn) {
                deleteBtn.style.display = 'none';
            }

            if (typeSelect) {
                Array.from(typeSelect.options).forEach(opt => {
                    if (opt.value === 'local') {
                        opt.disabled = !isAdmin;
                    }
                });
                typeSelect.value = isAdmin ? 'local' : 'aliyun';
                buildBackupConfigOptions(typeSelect.value, {});
            }

            if (enabledCheckbox) enabledCheckbox.checked = true;
            if (scheduleInput) scheduleInput.value = '';
            if (schedulePreset) schedulePreset.value = '';
        }

        modal.style.display = 'flex';
    }

    // 添加备份配置按钮
    const addBackupConfigBtn = document.getElementById('add-backup-config-btn');
    if (addBackupConfigBtn) {
        addBackupConfigBtn.onclick = () => {
            // 打开备份配置编辑模态框（添加模式）
            openBackupConfigEditModal(null);
        };
    }
    

    // 编辑备份配置按钮
    document.querySelectorAll('.edit-backup-config-btn').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.getAttribute('data-config-id'));
            if (!isNaN(id)) {
                const cfg = lastBackupConfigs.find(c => c.id === id);
                if (cfg) {
                    openBackupConfigEditModal(cfg);
                }
            }
        };
    });
    
    // 用户编辑模态框保存和取消按钮
    const userEditSave = document.getElementById('user-edit-save');
    const userEditCancel = document.getElementById('user-edit-cancel');
    const userEditDelete = document.getElementById('user-edit-delete');
    if (userEditSave) {
        userEditSave.onclick = async () => {
            const editModal = document.getElementById('user-edit-modal');
            const userId = editModal.dataset.userId;
            const username = document.getElementById('user-edit-username').value;
            const password = document.getElementById('user-edit-password').value;
            const role = document.getElementById('user-edit-role').value;
            
            if (!username) {
                alert('请输入用户名');
                return;
            }
            
            try {
                if (userId) {
                    // 编辑用户
                    await window.userManager.updateUser(userId, { username, password, role });
                    } else {
                        // 添加用户
                        if (!password) {
                            alert('请输入密码');
                            return;
                        }
                        await window.userManager.createUser(username, password, role);
                    }
                editModal.style.display = 'none';
                loadUsersList();
            } catch (error) {
                console.error('[保存用户] 失败:', error);
                alert('保存失败: ' + (error.message || '未知错误'));
            }
        };
    }
    if (userEditDelete) {
        userEditDelete.onclick = async () => {
            const editModal = document.getElementById('user-edit-modal');
            const userId = editModal.dataset.userId;
            if (!userId) {
                return;
            }
            if (!window.userManager || !window.userManager.isAdmin || !window.userManager.isAdmin()) {
                alert('只有管理员可以删除用户');
                return;
            }
            
            // 使用统一的确认模态框
            const confirmed = await window.showCustomConfirm(
                '确定要删除该用户吗？此操作不可恢复。',
                '删除用户'
            );
            
            if (!confirmed) {
                return;
            }
            
            try {
                const resp = await window.userManager.deleteUser(userId);
                if (!resp || !resp.success) {
                    alert('删除失败: ' + (resp && resp.error ? resp.error : '未知错误'));
                    return;
                }
                editModal.style.display = 'none';
                loadUsersList();
            } catch (error) {
                console.error('[删除用户] 失败:', error);
                alert('删除失败: ' + (error.message || '未知错误'));
            }
        };
    }
    if (userEditCancel) {
        userEditCancel.onclick = () => {
            document.getElementById('user-edit-modal').style.display = 'none';
        };
    }
    
    // 用户资料模态框保存和取消按钮（修改密码）
    const userProfileSave = document.getElementById('user-profile-save');
    const userProfileCancel = document.getElementById('user-profile-cancel');
    if (userProfileSave) {
        userProfileSave.onclick = async () => {
            const oldPassword = document.getElementById('user-profile-old-password').value;
            const newPassword = document.getElementById('user-profile-new-password').value;
            const confirmPassword = document.getElementById('user-profile-confirm-password').value;
            
            if (!oldPassword || !newPassword || !confirmPassword) {
                alert('请填写所有字段');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('新密码和确认密码不一致');
                return;
            }
            
            try {
                if (window.userManager && window.userManager.currentUser) {
                    await window.userManager.changePassword(window.userManager.currentUser.id, oldPassword, newPassword);
                    alert('密码修改成功');
                    hideUserProfileModal();
                }
            } catch (error) {
                console.error('[修改密码] 失败:', error);
                alert('修改失败: ' + (error.message || '未知错误'));
            }
        };
    }
    if (userProfileCancel) {
        userProfileCancel.onclick = hideUserProfileModal;
    }

    // 备份配置类型切换
    const backupTypeSelect = document.getElementById('backup-config-type');
    if (backupTypeSelect) {
        backupTypeSelect.onchange = () => {
            const type = backupTypeSelect.value;
            buildBackupConfigOptions(type, {});
        };
    }

    // 备份配置定时计划快捷选择
    const schedulePreset = document.getElementById('backup-config-schedule-preset');
    const scheduleInput = document.getElementById('backup-config-schedule');
    if (schedulePreset && scheduleInput) {
        schedulePreset.onchange = () => {
            const preset = schedulePreset.value;
            scheduleInput.value = presetToCron(preset);
        };
    }

    // 备份配置保存 & 取消按钮
    const backupEditSave = document.getElementById('backup-config-edit-save');
    const backupEditCancel = document.getElementById('backup-config-edit-cancel');
    const backupEditDelete = document.getElementById('backup-config-edit-delete');
    
    // 删除备份配置按钮
    if (backupEditDelete) {
        backupEditDelete.onclick = async () => {
            const modal = document.getElementById('backup-config-edit-modal');
            if (!modal) return;
            const configId = modal.dataset.configId;
            
            if (!configId) {
                alert('无法删除：未找到配置ID');
                return;
            }
            
            // 使用统一的确认模态框
            const confirmed = await window.showCustomConfirm(
                '确定要删除此备份配置吗？删除后无法恢复。',
                '删除备份配置'
            );
            
            if (!confirmed) {
                return;
            }
            
            try {
                if (!window.backupManager) {
                    // 使用统一的提示（如果需要，可以创建类似的提示模态框）
                    alert('备份管理器不可用');
                    return;
                }
                
                const resp = await window.backupManager.deleteBackupConfig(configId);
                if (!resp || !resp.success) {
                    alert('删除备份配置失败: ' + (resp && resp.error ? resp.error : '未知错误'));
                    return;
                }
                
                // 删除成功，关闭模态框并刷新列表
                modal.style.display = 'none';
                await loadBackupConfigs();
            } catch (error) {
                console.error('[删除备份配置] 失败:', error);
                alert('删除备份配置失败: ' + (error.message || '未知错误'));
            }
        };
    }
    
    if (backupEditSave) {
        backupEditSave.onclick = async () => {
            const modal = document.getElementById('backup-config-edit-modal');
            if (!modal) return;
            const configId = modal.dataset.configId;
            const typeSelectEl = document.getElementById('backup-config-type');
            const enabledEl = document.getElementById('backup-config-enabled');
            const scheduleEl = document.getElementById('backup-config-schedule');

            const backupType = typeSelectEl ? typeSelectEl.value : 'aliyun';
            const enabled = !!(enabledEl && enabledEl.checked);
            const schedule = (scheduleEl && scheduleEl.value.trim()) || null;
            const configData = getBackupConfigFormValues(backupType);

            if (backupType === 'local' && !configData.path) {
                alert('请填写本地/NAS 路径');
                return;
            }

            try {
                let resp;
                if (configId) {
                    resp = await window.backupManager.updateBackupConfig(configId, {
                        backupType,
                        config: configData,
                        enabled,
                        schedule
                    });
                } else {
                    resp = await window.backupManager.saveBackupConfig({
                        backupType,
                        config: configData,
                        enabled,
                        schedule
                    });
                }
                if (!resp || !resp.success) {
                    alert('保存备份配置失败: ' + (resp && resp.error ? resp.error : '未知错误'));
                    return;
                }
                modal.style.display = 'none';
                loadBackupConfigs();
            } catch (error) {
                console.error('[保存备份配置] 失败:', error);
                alert('保存备份配置失败: ' + (error.message || '未知错误'));
            }
        };
    }
    if (backupEditCancel) {
        backupEditCancel.onclick = () => {
            const modal = document.getElementById('backup-config-edit-modal');
            if (modal) modal.style.display = 'none';
        };
    }
}

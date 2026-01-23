/**
 * DataManager - Handles API calls to backend server
 */
class DataManager {
    constructor() {
        this.API_BASE = ''; // 使用相对路径，与服务器同域
        this.authChecked = false;
        this.authStatus = false;
    }

    // 辅助方法：发送 API 请求
    async apiRequest(endpoint, options = {}) {
        try {
            const url = `${this.API_BASE}${endpoint}`;
            console.log(`[API Request] ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, {
                credentials: 'include', // 重要：包含 cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            console.log(`[API Response] ${response.status} ${response.statusText}`);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            
            // 如果是因为网络错误（服务器未运行或CORS问题）
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                throw new Error('无法连接到服务器。请检查：1) 服务器是否正在运行  2) 端口是否正确（默认3000）  3) 浏览器控制台是否有CORS错误');
            }
            
            throw error;
        }
    }

    // --- Auth ---
    // 向后兼容：使用默认 admin 用户名
    async login(password) {
        try {
            console.log('[DataManager] Login attempt (backward compatibility mode)');
            // 使用新的多用户登录接口，默认用户名为 admin
            const result = await this.apiRequest('/api/users/login', {
                method: 'POST',
                body: JSON.stringify({ username: 'admin', password })
            });
            
            console.log('[DataManager] Login API response:', result);
            
            if (result && result.success === true) {
                console.log('[DataManager] Login successful, updating auth status');
                this.authStatus = true;
                this.authChecked = true;
                return true;
            }
            console.error('[DataManager] Login failed - invalid response:', result);
            return false;
        } catch (error) {
            console.error('[DataManager] Login error:', error);
            console.error('[DataManager] Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            // 如果服务器未运行或网络错误，显示更友好的提示
            if (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.name === 'TypeError') {
                alert('无法连接到服务器，请确保服务器正在运行！\n错误: ' + error.message);
            }
            return false;
        }
    }

    async logout() {
        try {
            await this.apiRequest('/api/users/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.authStatus = false;
            this.authChecked = true;
            window.location.reload();
        }
    }

    async isLoggedIn() {
        // 避免重复请求，使用缓存
        if (this.authChecked) {
            return this.authStatus;
        }

        try {
            // 使用新的认证端点
            const result = await this.apiRequest('/api/users/check-auth');
            this.authStatus = result.isLoggedIn || false;
            this.authChecked = true;
            return this.authStatus;
        } catch (error) {
            console.error('Auth check error:', error);
            this.authStatus = false;
            this.authChecked = true;
            return false;
        }
    }

    // --- Bookmarks ---
    async getBookmarks() {
        try {
            console.log('[DataManager] Fetching bookmarks from /api/bookmarks...');
            const data = await this.apiRequest('/api/bookmarks');
            console.log('[DataManager] Bookmarks fetched successfully:', data?.length || 0, 'categories');
            return data || [];
        } catch (error) {
            console.error('[DataManager] Get bookmarks error:', error);
            console.log('[DataManager] Falling back to default bookmarks');
            return this.getDefaultBookmarks(); // 返回默认数据作为降级
        }
    }

    async saveBookmarks(data) {
        try {
            const response = await this.apiRequest('/api/bookmarks', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            return true;
        } catch (error) {
            console.error('Save bookmarks error:', error);
            // 如果是网络错误，提供更清晰的错误信息
            if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                throw new Error('无法连接到服务器，请确保服务器正在运行');
            }
            throw error;
        }
    }

    // --- Dashboard ---
    async getDashboardConfig() {
        try {
            const data = await this.apiRequest('/api/config');
            return data || this.getDefaultDashboardConfig();
        } catch (error) {
            console.error('Get config error:', error);
            return this.getDefaultDashboardConfig();
        }
    }

    async saveDashboardConfig(config) {
        try {
            await this.apiRequest('/api/config', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            return true;
        } catch (error) {
            console.error('Save config error:', error);
            throw error;
        }
    }

    // --- Click Statistics ---
    async recordBookmarkClick(url, name, icon) {
        try {
            await this.apiRequest('/api/bookmark/click', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, name, icon })
            });
        } catch (error) {
            console.error('Record bookmark click error:', error);
            // 不抛出错误，避免影响用户跳转
        }
    }

    async getTopBookmarks(limit = 10) {
        try {
            const response = await this.apiRequest(`/api/bookmark/top?limit=${limit}`, {
                method: 'GET'
            });
            return response.topBookmarks || [];
        } catch (error) {
            console.error('Get top bookmarks error:', error);
            return [];
        }
    }

    // --- Todos ---
    async getTodos() {
        try {
            const todos = await this.apiRequest('/api/todos');
            return Array.isArray(todos) ? todos : [];
        } catch (error) {
            console.error('Get todos error:', error);
            return [];
        }
    }

    async saveTodos(todos) {
        try {
            // 验证输入
            if (!Array.isArray(todos)) {
                console.error('[DataManager] saveTodos: Invalid input, not an array', typeof todos);
                throw new Error('todos must be an array');
            }

            console.log('[DataManager] saveTodos: Saving', todos.length, 'todos');
            console.log('[DataManager] saveTodos: Todos data:', JSON.stringify(todos).substring(0, 200));

            const response = await this.apiRequest('/api/todos', {
                method: 'POST',
                body: JSON.stringify(todos)
            });
            
            console.log('[DataManager] saveTodos: Response received', response);
            
            if (response && response.success) {
                console.log('[DataManager] saveTodos: Save successful');
                return true;
            }
            
            console.error('[DataManager] saveTodos: Invalid response', response);
            throw new Error('Save todos failed: Invalid response from server');
        } catch (error) {
            console.error('[DataManager] saveTodos error:', error);
            console.error('[DataManager] Error type:', error.name);
            console.error('[DataManager] Error message:', error.message);
            console.error('[DataManager] Todos data:', todos);
            
            // 如果是网络错误，提供更友好的错误信息
            if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network'))) {
                throw new Error('无法连接到服务器，请确保服务器正在运行');
            }
            
            // 如果是认证错误
            if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
                throw new Error('未登录或登录已过期，请重新登录');
            }
            
            throw error;
        }
    }

    // --- Defaults ---
    getDefaultBookmarks() {
        return [
            {
                category: "Daily",
                items: [
                    { name: "Google", url: "https://google.com", icon: "🔍" },
                    { name: "GitHub", url: "https://github.com", icon: "🐙" }
                ]
            },
            {
                category: "Dev",
                items: [
                    { name: "MDN", url: "https://developer.mozilla.org", icon: "📚" }
                ]
            }
        ];
    }

    getDefaultDashboardConfig() {
        return {
            theme: 'dark', // 新用户默认暗色主题
            showCpu: true,
            showRam: true,
            showStorage: true,
            todosSettings: {
                title: '便签待办',
                visible: true
            }
        };
    }
}

const dataManager = new DataManager();

// 暴露到全局，确保所有地方都能访问
window.dataManager = dataManager;

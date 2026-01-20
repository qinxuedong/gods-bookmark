// Login page script
(function() {
    'use strict';
    
    const form = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-msg');
    let isSubmitting = false; // 防止重复提交

    // Check if already logged in (只在页面加载时检查，不在提交时检查)
    async function checkAuth() {
        if (!window.userManager) {
            // 向后兼容：如果没有userManager，使用旧的dataManager
            try {
                const isLoggedIn = await window.dataManager.isLoggedIn();
                if (isLoggedIn && !isSubmitting) {
                    console.log('[Login] Already logged in, redirecting...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 100);
                }
            } catch (error) {
                console.error('[Login] Error checking login status:', error);
            }
            return;
        }
        
        try {
            const result = await window.userManager.checkAuth();
            if (result && result.isLoggedIn && !isSubmitting) {
                console.log('[Login] Already logged in, redirecting...');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 100);
            }
        } catch (error) {
            console.error('[Login] Error checking login status:', error);
        }
    }
    
    checkAuth();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 防止重复提交
        if (isSubmitting) {
            console.log('[Login] Already submitting, ignoring...');
            return;
        }
        
        isSubmitting = true;
        errorMsg.style.display = 'none'; // 重置错误消息
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            errorMsg.innerText = '请输入用户名和密码';
            errorMsg.style.display = 'block';
            isSubmitting = false;
            return;
        }

        // 显示加载状态
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = '登录中...';
        submitBtn.disabled = true;

        try {
            console.log('[Login] Attempting login with username:', username);
            console.log('[Login] userManager available:', !!window.userManager);
            
            // 优先使用新的用户管理系统
            if (window.userManager) {
                console.log('[Login] Using userManager to login');
                const result = await window.userManager.login(username, password);
                console.log('[Login] Login result:', result);
                
                if (result && result.success) {
                    console.log('[Login] Login successful');
                    // 登录成功，清除之前的状态缓存
                    if (window.dataManager) {
                        window.dataManager.authChecked = false;
                        window.dataManager.authStatus = false;
                    }
                    
                    // 验证Cookie是否已设置
                    console.log('[Login] Verifying cookies...');
                    try {
                        const checkResult = await window.userManager.checkAuth();
                        console.log('[Login] Auth check after login:', checkResult);
                        if (checkResult && checkResult.isLoggedIn) {
                            console.log('[Login] Cookie verified, redirecting...');
                            window.location.href = 'index.html';
                        } else {
                            console.error('[Login] Cookie not set properly, retrying...');
                            // 如果Cookie没有设置，等待更长时间
                            setTimeout(() => {
                                console.log('[Login] Redirecting to index.html (delayed)...');
                                window.location.href = 'index.html';
                            }, 500);
                        }
                    } catch (error) {
                        console.error('[Login] Error verifying cookies:', error);
                        // 即使验证失败，也尝试跳转
                        setTimeout(() => {
                            console.log('[Login] Redirecting to index.html (fallback)...');
                            window.location.href = 'index.html';
                        }, 300);
                    }
                } else {
                    console.error('[Login] Login failed:', result);
                    const errorText = result?.error || '用户名或密码错误';
                    errorMsg.innerText = errorText;
                    errorMsg.style.display = 'block';
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    isSubmitting = false;
                }
            } else {
                // 向后兼容：使用旧的登录方式（只使用密码）
                if (!password) {
                    errorMsg.innerText = '请输入密码';
                    errorMsg.style.display = 'block';
                    isSubmitting = false;
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    return;
                }
                
                const success = await window.dataManager.login(password);
                console.log('[Login] Login result:', success);
                
                if (success) {
                    console.log('[Login] Login API call successful');
                    if (window.dataManager) {
                        window.dataManager.authChecked = false;
                        window.dataManager.authStatus = false;
                    }
                    window.location.href = 'index.html';
                } else {
                    errorMsg.innerText = '密码错误或无法连接到服务器';
                    errorMsg.style.display = 'block';
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    isSubmitting = false;
                }
            }
        } catch (error) {
            console.error('[Login] Login form error:', error);
            console.error('[Login] Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            let errorText = '登录失败: ' + (error.message || '未知错误');
            // 如果是网络错误，提供更友好的提示
            if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network'))) {
                errorText = '无法连接到服务器，请确保服务器正在运行';
            }
            errorMsg.innerText = errorText;
            errorMsg.style.display = 'block';
            isSubmitting = false;
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // 回车键登录
    document.getElementById('password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            form.dispatchEvent(new Event('submit'));
        }
    });
})();

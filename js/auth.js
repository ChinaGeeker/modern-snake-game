// ============================================
// auth.js — 用户登录/注册认证模块
// ============================================

const Auth = (() => {
    let isLoginMode = true; // true = 登录模式, false = 注册模式

    /**
     * 初始化认证模块，绑定事件
     */
    function init() {
        const authForm = document.getElementById('auth-form');
        const toggleBtn = document.getElementById('toggle-auth-mode');
        const logoutBtn = document.getElementById('logout-btn');

        // 表单提交
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAuth();
        });

        // 切换登录/注册模式
        toggleBtn.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            updateAuthUI();
        });

        // 退出登录
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }

    /**
     * 处理登录/注册逻辑
     */
    async function handleAuth() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorEl = document.getElementById('auth-error');

        // 清除错误信息
        errorEl.textContent = '';
        errorEl.style.display = 'none';

        // 验证输入
        if (!username || !password) {
            showError('请输入用户名和密码');
            return;
        }

        if (username.length < 2) {
            showError('用户名至少需要2个字符');
            return;
        }

        if (password.length < 3) {
            showError('密码至少需要3个字符');
            return;
        }

        try {
            if (isLoginMode) {
                // 登录
                const isValid = await window.Storage.validateUser(username, password);
                if (isValid) {
                    window.Storage.addLoginRecord(username);
                    window.Storage.setCurrentUser(username);
                    onLoginSuccess(username);
                } else {
                    showError('用户名或密码错误');
                }
            } else {
                // 注册
                const isRegistered = await window.Storage.saveUser(username, password);
                if (isRegistered) {
                    window.Storage.addLoginRecord(username);
                    window.Storage.setCurrentUser(username);
                    onLoginSuccess(username);
                } else {
                    showError('该用户名已被注册');
                }
            }
        } catch (error) {
            console.error('认证错误:', error);
            showError('认证过程中发生错误，请重试');
        }
    }

    /**
     * 登录成功后的处理
     * @param {string} username - 用户名
     */
    function onLoginSuccess(username) {
        // 清除表单
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('auth-error').style.display = 'none';

        // 通知 App 切换到游戏视图
        if (window.App && window.App.showGameView) {
            window.App.showGameView(username);
        }
    }

    /**
     * 退出登录
     */
    function logout() {
        window.Storage.clearCurrentUser();
        if (window.App && window.App.showAuthView) {
            window.App.showAuthView();
        }
    }

    /**
     * 显示错误信息
     * @param {string} msg - 错误消息
     */
    function showError(msg) {
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }

    /**
     * 更新认证界面（登录/注册模式切换）
     */
    function updateAuthUI() {
        const submitBtn = document.getElementById('auth-submit-btn');
        const toggleBtn = document.getElementById('toggle-auth-mode');
        const formTitle = document.getElementById('auth-title');

        if (isLoginMode) {
            submitBtn.textContent = '🚀 登录';
            toggleBtn.textContent = '没有账号？点击注册';
            formTitle.textContent = '用户登录';
        } else {
            submitBtn.textContent = '✨ 注册';
            toggleBtn.textContent = '已有账号？点击登录';
            formTitle.textContent = '用户注册';
        }

        // 清除错误信息
        document.getElementById('auth-error').style.display = 'none';
    }

    return { init, logout };
})();

window.Auth = Auth;

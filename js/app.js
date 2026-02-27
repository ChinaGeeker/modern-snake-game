// ============================================
// app.js — 应用主控（页面切换、初始化）
// ============================================

const App = (() => {
    let currentUsername = null;

    /**
     * 应用初始化
     */
    function init() {
        // 初始化各模块
        window.Auth.init();
        window.Game.init();

        // 检查是否有已登录用户
        const savedUser = window.Storage.getCurrentUser();
        if (savedUser && window.Storage.getUser(savedUser)) {
            showGameView(savedUser);
        } else {
            showAuthView();
        }
    }

    /**
     * 显示登录视图
     */
    function showAuthView() {
        currentUsername = null;
        document.getElementById('auth-view').classList.remove('hidden');
        document.getElementById('game-view').classList.add('hidden');

        // 重置游戏状态
        window.Game.reset();
    }

    /**
     * 显示游戏视图
     * @param {string} username - 用户名
     */
    function showGameView(username) {
        currentUsername = username;
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('game-view').classList.remove('hidden');

        // 更新欢迎信息
        document.getElementById('user-display-name').textContent = username;

        // 设置游戏用户
        window.Game.setUser(username);

        // 刷新历史记录
        refreshHistory();
    }

    /**
     * 刷新历史记录面板
     */
    function refreshHistory() {
        if (!currentUsername) return;

        renderScoreHistory();
        renderLeaderboard();
        renderLoginHistory();

        // 确保当前激活的标签页内容显示正确
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            switchTab(activeTab.dataset.tab);
        }
    }

    /**
     * 渲染分数历史
     */
    function renderScoreHistory() {
        const container = document.getElementById('score-history-list');
        const scores = window.Storage.getScores(currentUsername);

        if (scores.length === 0) {
            container.innerHTML = '<div class="empty-history">🎮 暂无游戏记录</div>';
            return;
        }

        // 按分数降序排列
        const sorted = [...scores].sort((a, b) => b.score - a.score);

        container.innerHTML = sorted.map((item, index) => `
      <div class="history-item">
        <span class="history-rank">#${index + 1}</span>
        <span class="history-score-val">${item.score} 分</span>
        <span class="history-date">${item.date}</span>
      </div>
    `).join('');
    }

    /**
     * 渲染登录历史
     */
    function renderLoginHistory() {
        const container = document.getElementById('login-history-list');
        const logins = window.Storage.getLoginHistory(currentUsername);

        if (logins.length === 0) {
            container.innerHTML = '<div class="empty-history">📅 暂无登录记录</div>';
            return;
        }

        // 最近的登录放在最前面
        const reversed = [...logins].reverse();

        container.innerHTML = reversed.map((time, index) => `
      <div class="history-item">
        <span class="history-rank">${reversed.length - index}</span>
        <span class="history-time">${time}</span>
      </div>
    `).join('');
    }

    /**
     * 渲染全局排行榜
     */
    function renderLeaderboard() {
        const container = document.getElementById('leaderboard-list');
        const leaderboard = window.Storage.getGlobalLeaderboard(10);

        if (leaderboard.length === 0) {
            container.innerHTML = '<div class="empty-history">🌍 暂无排行数据</div>';
            return;
        }

        // 奖牌图标：前三名金银铜
        const medals = ['🥇', '🥈', '🥉'];

        container.innerHTML = leaderboard.map((item, index) => {
            const medal = index < 3 ? medals[index] : `#${index + 1}`;
            const isMe = item.username === currentUsername;
            const highlightClass = isMe ? ' leaderboard-me' : '';
            const medalClass = index < 3 ? ' leaderboard-top' : '';
            return `
          <div class="history-item${highlightClass}${medalClass}">
            <span class="history-rank leaderboard-medal">${medal}</span>
            <span class="leaderboard-name${isMe ? ' is-me' : ''}">${item.username}</span>
            <span class="history-score-val">${item.score} 分</span>
            <span class="history-date">${item.date}</span>
          </div>
        `;
        }).join('');
    }

    /**
     * 切换历史标签页
     * @param {string} tabName - 标签名称 'scores' | 'leaderboard' | 'logins'
     */
    function switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 切换内容显示
        document.getElementById('score-history-list').classList.toggle('hidden', tabName !== 'scores');
        document.getElementById('leaderboard-list').classList.toggle('hidden', tabName !== 'leaderboard');
        document.getElementById('login-history-list').classList.toggle('hidden', tabName !== 'logins');
    }

    /**
     * DOM 加载完成后初始化
     */
    document.addEventListener('DOMContentLoaded', () => {
        init();

        // 绑定标签切换事件
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchTab(btn.dataset.tab);
            });
        });
    });

    return { showAuthView, showGameView, refreshHistory };
})();

window.App = App;

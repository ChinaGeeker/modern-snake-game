// ============================================
// game.js — 贪吃蛇核心游戏逻辑
// ============================================

const Game = (() => {
    // ---- 游戏常量 ----
    const GRID_SIZE = 20;       // 网格单元大小（像素）
    const GRID_COUNT = 20;      // 网格数量（20x20）
    const CANVAS_SIZE = GRID_SIZE * GRID_COUNT; // 画布大小 400px

    // ---- 游戏状态 ----
    let canvas, ctx;
    let snake = [];             // 蛇身数组，每个元素 {x, y}
    let food = { x: 0, y: 0 }; // 食物位置
    let direction = { x: 1, y: 0 }; // 当前移动方向
    let nextDirection = { x: 1, y: 0 }; // 下一帧方向（防止快速反向）
    let score = 0;              // 当前分数
    let gameState = 'idle';     // idle | playing | paused | over
    let gameLoopId = null;      // 游戏循环ID
    let speed = 150;            // 初始速度（毫秒/帧）
    let lastTime = 0;           // 上一帧时间
    let currentUser = null;
    let gridCache = null;       // 网格缓存
    let soundEnabled = true;    // 音效开关
    let difficulty = 'normal';  // 游戏难度

    // ---- 颜色主题 ----
    const COLORS = {
        bg: '#0b1121',
        grid: 'rgba(34, 211, 238, 0.04)',
        snakeHead: '#22d3ee',
        snakeBody: '#06b6d4',
        snakeTail: '#0891b2',
        food: '#f43f5e',
        foodGlow: 'rgba(244, 63, 94, 0.6)',
        text: '#e2e8f0'
    };

    // ---- 渐变色动画时间偏移（让颜色随时间流动）----
    let colorOffset = 0;

    // Web Audio API 上下文
    let audioContext = null;

    /**
     * 初始化 Web Audio API
     */
    function initAudioContext() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API 初始化失败:', e);
        }
    }

    /**
     * 使用 Web Audio API 播放音效
     * @param {string} type - 音效类型
     */
    function playSound(type) {
        if (!soundEnabled || !audioContext) return;

        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            switch (type) {
                case 'start':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'eat':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'gameOver':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.3);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
            }
        } catch (e) {
            console.log('音效播放失败:', e);
        }
    }

    // 触摸控制相关变量
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDirection = null; // 当前触摸按下的方向

    /**
     * 处理触摸开始事件
     * @param {TouchEvent} e - 触摸事件
     */
    function handleTouchStart(e) {
        e.preventDefault(); // 阻止默认滚动行为
        if (gameState !== 'playing') return;
        
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        
        // 计算触摸位置相对于画布中心的方向
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left - rect.width / 2;
        const y = touch.clientY - rect.top - rect.height / 2;
        
        // 根据触摸位置确定方向
        if (Math.abs(x) > Math.abs(y)) {
            // 水平方向
            if (x > 0) {
                touchDirection = { x: 1, y: 0 };
            } else {
                touchDirection = { x: -1, y: 0 };
            }
        } else {
            // 垂直方向
            if (y > 0) {
                touchDirection = { x: 0, y: 1 };
            } else {
                touchDirection = { x: 0, y: -1 };
            }
        }
        
        // 应用方向
        if (touchDirection) {
            nextDirection = { ...touchDirection };
        }
    }

    /**
     * 处理触摸结束事件
     * @param {TouchEvent} e - 触摸事件
     */
    function handleTouchEnd(e) {
        e.preventDefault(); // 阻止默认滚动行为
        touchDirection = null;
    }
    
    /**
     * 处理触摸移动事件
     * @param {TouchEvent} e - 触摸事件
     */
    function handleTouchMove(e) {
        e.preventDefault(); // 阻止默认滚动行为
        if (gameState !== 'playing') return;
        
        const touch = e.touches[0];
        
        // 计算触摸位置相对于画布中心的方向
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left - rect.width / 2;
        const y = touch.clientY - rect.top - rect.height / 2;
        
        // 根据触摸位置确定方向
        if (Math.abs(x) > Math.abs(y)) {
            // 水平方向
            if (x > 0 && direction.x !== -1) {
                touchDirection = { x: 1, y: 0 };
            } else if (x < 0 && direction.x !== 1) {
                touchDirection = { x: -1, y: 0 };
            }
        } else {
            // 垂直方向
            if (y > 0 && direction.y !== -1) {
                touchDirection = { x: 0, y: 1 };
            } else if (y < 0 && direction.y !== 1) {
                touchDirection = { x: 0, y: -1 };
            }
        }
        
        // 应用方向
        if (touchDirection) {
            nextDirection = { ...touchDirection };
        }
    }

    /**
     * 根据难度设置游戏速度
     */
    function setSpeedByDifficulty() {
        switch (difficulty) {
            case 'easy':
                speed = 200;
                break;
            case 'normal':
                speed = 150;
                break;
            case 'hard':
                speed = 100;
                break;
        }
    }

    /**
     * 初始化设置面板
     */
    function initSettings() {
        const settingsBtn = document.getElementById('settings-btn');
        const settingsPanel = document.getElementById('settings-panel');
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        const difficultySelect = document.getElementById('difficulty');
        const soundToggle = document.getElementById('sound-toggle');

        // 绑定设置按钮点击事件
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });

        // 绑定保存设置按钮点击事件
        saveSettingsBtn.addEventListener('click', () => {
            // 保存难度设置
            difficulty = difficultySelect.value;
            setSpeedByDifficulty();

            // 保存音效设置
            soundEnabled = soundToggle.checked;

            // 隐藏设置面板
            settingsPanel.classList.add('hidden');
        });

        // 初始化设置值
        difficultySelect.value = difficulty;
        soundToggle.checked = soundEnabled;
    }

    /**
     * 初始化游戏模块
     */
    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;

        // 初始化 Web Audio API
        initAudioContext();

        // 绑定键盘事件
        document.addEventListener('keydown', handleKeyDown);

        // 绑定触摸事件
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);

        // 绑定按钮事件
        document.getElementById('start-btn').addEventListener('click', startGame);
        document.getElementById('pause-btn').addEventListener('click', togglePause);

        // 初始化设置面板
        initSettings();

        // 初始绘制
        drawEmptyBoard();
    }

    /**
     * 设置当前用户
     * @param {string} username - 用户名
     */
    function setUser(username) {
        currentUser = username;
        updateScoreDisplay();
        updateHighScore();
    }

    /**
     * 处理键盘输入
     * @param {KeyboardEvent} e - 键盘事件
     */
    function handleKeyDown(e) {
        if (gameState !== 'playing') return;

        const key = e.key;
        // 防止方向反转（不能直接反向移动）
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
                e.preventDefault();
                break;
        }
    }

    /**
     * 游戏循环函数（使用 requestAnimationFrame）
     */
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;

        if (deltaTime >= speed) {
            gameStep();
            lastTime = timestamp;
        }

        if (gameState === 'playing') {
            gameLoopId = requestAnimationFrame(gameLoop);
        }
    }

    /**
     * 开始游戏
     */
    function startGame() {
        // 重置状态
        snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        // 根据难度设置速度
        setSpeedByDifficulty();
        gameState = 'playing';
        lastTime = 0;

        spawnFood();
        updateScoreDisplay();

        // 更新按钮状态
        document.getElementById('start-btn').textContent = '🔄 重新开始';
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('pause-btn').textContent = '⏸️ 暂停';

        // 播放开始音效
        playSound('start');

        // 启动游戏循环
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
        }
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    /**
     * 暂停/继续
     */
    function togglePause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            if (gameLoopId) {
                cancelAnimationFrame(gameLoopId);
                gameLoopId = null;
            }
            document.getElementById('pause-btn').textContent = '▶️ 继续';
            drawPauseOverlay();
        } else if (gameState === 'paused') {
            gameState = 'playing';
            lastTime = 0;
            gameLoopId = requestAnimationFrame(gameLoop);
            document.getElementById('pause-btn').textContent = '⏸️ 暂停';
        }
    }

    /**
     * 游戏每一帧的逻辑
     */
    function gameStep() {
        // 应用方向
        direction = { ...nextDirection };

        // 计算新头部位置
        const head = { ...snake[0] };
        head.x += direction.x;
        head.y += direction.y;

        // 碰撞检测 — 墙壁
        if (head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT) {
            gameOver();
            return;
        }

        // 碰撞检测 — 自身
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOver();
                return;
            }
        }

        // 将新头部加入蛇身
        snake.unshift(head);

        // 检查是否吃到食物
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            updateScoreDisplay();
            spawnFood();
            
            // 播放吃食物音效
            playSound('eat');

            // 加速（每吃5个食物加速一次，最低60ms）
            if (score % 50 === 0 && speed > 60) {
                speed -= 10;
            }
        } else {
            // 没吃到食物，去掉尾巴
            snake.pop();
        }

        // 绘制画面
        draw();
    }

    /**
     * 生成新的食物位置
     */
    function spawnFood() {
        let newFood;
        let isOnSnake;
        // 确保食物不出现在蛇身上
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_COUNT),
                y: Math.floor(Math.random() * GRID_COUNT)
            };
            isOnSnake = snake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
        } while (isOnSnake);
        food = newFood;
    }

    /**
     * 游戏结束
     */
    function gameOver() {
        gameState = 'over';
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }

        // 播放游戏结束音效
        playSound('gameOver');

        // 保存分数
        if (currentUser && score > 0) {
            window.Storage.saveScore(currentUser, score);
            updateHighScore();
            // 刷新历史记录
            if (window.App && window.App.refreshHistory) {
                window.App.refreshHistory();
            }
        }

        // 绘制结束画面
        drawGameOverOverlay();

        // 重置按钮
        document.getElementById('start-btn').textContent = '🎮 再来一局';
        document.getElementById('pause-btn').disabled = true;
    }

    /**
     * 主绘制函数
     */
    function draw() {
        // 只在游戏状态为 playing 时更新颜色偏移
        if (gameState === 'playing') {
            // 更新色相偏移，让彩虹颜色流动（每帧偏移 2°）
            colorOffset = (colorOffset + 2) % 360;
        }

        // 清空画布
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 绘制网格线
        drawGrid();

        // 绘制食物
        drawFood();

        // 绘制蛇
        drawSnake();
    }

    /**
     * 绘制空棋盘（初始状态）
     */
    function drawEmptyBoard() {
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        drawGrid();

        // 绘制提示文字
        ctx.fillStyle = COLORS.text;
        ctx.font = '18px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('按 "开始游戏" 启动', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        ctx.font = '13px "Outfit", sans-serif';
        ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
        ctx.fillText('使用方向键或 WASD 控制方向', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 30);
    }

    /**
     * 绘制网格
     */
    function drawGrid() {
        if (!gridCache) {
            // 创建离屏 Canvas 缓存网格
            gridCache = document.createElement('canvas');
            gridCache.width = CANVAS_SIZE;
            gridCache.height = CANVAS_SIZE;
            const gridCtx = gridCache.getContext('2d');
            
            gridCtx.strokeStyle = COLORS.grid;
            gridCtx.lineWidth = 0.5;
            for (let i = 0; i <= GRID_COUNT; i++) {
                // 竖线
                gridCtx.beginPath();
                gridCtx.moveTo(i * GRID_SIZE, 0);
                gridCtx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
                gridCtx.stroke();
                // 横线
                gridCtx.beginPath();
                gridCtx.moveTo(0, i * GRID_SIZE);
                gridCtx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
                gridCtx.stroke();
            }
        }
        // 绘制缓存的网格
        ctx.drawImage(gridCache, 0, 0);
    }

    /**
     * 获取蛇身某节的彩虹渐变颜色（HSL 色彩模型）
     * @param {number} index - 当前节的索引（0 为头部）
     * @param {number} total - 蛇的总节数
     * @returns {string} HSL 颜色字符串
     */
    function getSnakeColor(index, total) {
        // 色相：从头到尾跨越 180°（半个彩虹），再加上时间偏移让颜色流动
        const hue = (colorOffset + index * (180 / Math.max(total, 1))) % 360;
        // 饱和度：全段保持高饱和
        const sat = 100;
        // 亮度：头部更亮，尾部稍暗
        const lightness = 60 - (index / total) * 15;
        return `hsl(${hue}, ${sat}%, ${lightness}%)`;
    }

    /**
     * 绘制蛇身（动态彩虹渐变 + 霓虹发光）
     */
    function drawSnake() {
        // 从尾到头绘制，让头部覆盖在最上层
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const color = getSnakeColor(i, snake.length);

            // 绘制圆角矩形
            const x = seg.x * GRID_SIZE + 1;
            const y = seg.y * GRID_SIZE + 1;
            const size = GRID_SIZE - 2;
            const radius = i === 0 ? 6 : 4;

            // 使用路径缓存，减少重复计算
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + size - radius, y);
            ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            ctx.lineTo(x + size, y + size - radius);
            ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            ctx.lineTo(x + radius, y + size);
            ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();

            // 头部更强的发光
            const glowBlur = i === 0 ? 18 : 8;
            ctx.shadowColor = color;
            ctx.shadowBlur = glowBlur;
            ctx.fillStyle = color;
            ctx.fill();
            ctx.shadowBlur = 0;

            // 蛇头额外描边光晕
            if (i === 0) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.shadowColor = color;
                ctx.shadowBlur = 20;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // 蛇眼睛
                drawSnakeEyes(seg);
            }
        }
    }

    /**
     * 绘制蛇眼睛
     * @param {Object} head - 头部位置 {x, y}
     */
    function drawSnakeEyes(head) {
        const cx = head.x * GRID_SIZE + GRID_SIZE / 2;
        const cy = head.y * GRID_SIZE + GRID_SIZE / 2;

        // 根据方向确定眼睛位置
        let leftEye, rightEye;
        if (direction.x === 1) {
            leftEye = { x: cx + 4, y: cy - 4 };
            rightEye = { x: cx + 4, y: cy + 4 };
        } else if (direction.x === -1) {
            leftEye = { x: cx - 4, y: cy - 4 };
            rightEye = { x: cx - 4, y: cy + 4 };
        } else if (direction.y === -1) {
            leftEye = { x: cx - 4, y: cy - 4 };
            rightEye = { x: cx + 4, y: cy - 4 };
        } else {
            leftEye = { x: cx - 4, y: cy + 4 };
            rightEye = { x: cx + 4, y: cy + 4 };
        }

        // 白色眼球
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(leftEye.x, leftEye.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEye.x, rightEye.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // 黑色瞳孔
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(leftEye.x + direction.x, leftEye.y + direction.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEye.x + direction.x, rightEye.y + direction.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 绘制食物（带发光效果）
     */
    function drawFood() {
        const cx = food.x * GRID_SIZE + GRID_SIZE / 2;
        const cy = food.y * GRID_SIZE + GRID_SIZE / 2;

        // 外发光
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
        glow.addColorStop(0, COLORS.foodGlow);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 14, cy - 14, 28, 28);

        // 食物主体
        ctx.fillStyle = COLORS.food;
        ctx.shadowColor = COLORS.food;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 高光点
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 绘制暂停覆盖层
     */
    function drawPauseOverlay() {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 28px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⏸️ 已暂停', CANVAS_SIZE / 2, CANVAS_SIZE / 2);

        ctx.fillStyle = COLORS.text;
        ctx.font = '14px "Outfit", sans-serif';
        ctx.fillText('点击 "继续" 按钮恢复游戏', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 35);
    }

    /**
     * 绘制游戏结束覆盖层
     */
    function drawGameOverOverlay() {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Game Over 文字
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 32px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 20);

        // 分数
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 22px "Outfit", sans-serif';
        ctx.fillText(`得分: ${score}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);

        // 提示
        ctx.fillStyle = COLORS.text;
        ctx.font = '14px "Outfit", sans-serif';
        ctx.fillText('点击 "再来一局" 重新开始', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 55);
    }

    /**
     * 更新分数显示
     */
    function updateScoreDisplay() {
        document.getElementById('current-score').textContent = score;
    }

    /**
     * 更新最高分显示
     */
    function updateHighScore() {
        if (currentUser) {
            const highScore = window.Storage.getHighScore(currentUser);
            document.getElementById('high-score').textContent = highScore;
        }
    }

    /**
     * 重置游戏状态（退出登录时调用）
     */
    function reset() {
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
        gameState = 'idle';
        score = 0;
        currentUser = null;
        snake = [];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };

        document.getElementById('start-btn').textContent = '🎮 开始游戏';
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('pause-btn').textContent = '⏸️ 暂停';
        updateScoreDisplay();

        drawEmptyBoard();
    }

    return { init, setUser, reset };
})();

window.Game = Game;

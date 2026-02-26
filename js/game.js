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
    let gameLoop = null;        // 游戏循环定时器
    let speed = 150;            // 初始速度（毫秒/帧）
    let currentUser = null;

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

    /**
     * 初始化游戏模块
     */
    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;

        // 绑定键盘事件
        document.addEventListener('keydown', handleKeyDown);

        // 绑定按钮事件
        document.getElementById('start-btn').addEventListener('click', startGame);
        document.getElementById('pause-btn').addEventListener('click', togglePause);

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
        speed = 150;
        gameState = 'playing';

        spawnFood();
        updateScoreDisplay();

        // 更新按钮状态
        document.getElementById('start-btn').textContent = '🔄 重新开始';
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('pause-btn').textContent = '⏸️ 暂停';

        // 启动游戏循环
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, speed);
    }

    /**
     * 暂停/继续
     */
    function togglePause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            clearInterval(gameLoop);
            document.getElementById('pause-btn').textContent = '▶️ 继续';
            drawPauseOverlay();
        } else if (gameState === 'paused') {
            gameState = 'playing';
            gameLoop = setInterval(gameStep, speed);
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

            // 加速（每吃5个食物加速一次，最低60ms）
            if (score % 50 === 0 && speed > 60) {
                speed -= 10;
                clearInterval(gameLoop);
                gameLoop = setInterval(gameStep, speed);
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
        clearInterval(gameLoop);

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
        // 更新色相偏移，让彩虹颜色流动（每帧偏移 2°）
        colorOffset = (colorOffset + 2) % 360;

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
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= GRID_COUNT; i++) {
            // 竖线
            ctx.beginPath();
            ctx.moveTo(i * GRID_SIZE, 0);
            ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
            ctx.stroke();
            // 横线
            ctx.beginPath();
            ctx.moveTo(0, i * GRID_SIZE);
            ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
            ctx.stroke();
        }
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
        clearInterval(gameLoop);
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

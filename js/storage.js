// ============================================
// storage.js — localStorage 数据存储封装
// ============================================

const STORAGE_KEY = 'snake_game_data';

/**
 * 获取全部存储数据
 * @returns {Object} 包含 users 和 currentUser 的数据对象
 */
function getAllData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { users: {}, currentUser: null };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { users: {}, currentUser: null };
  }
}

/**
 * 保存全部数据到 localStorage
 * @param {Object} data - 完整数据对象
 */
function saveAllData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 生成密码的安全哈希
 * @param {string} password - 原始密码
 * @returns {Promise<string>} 哈希后的密码
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 保存新用户
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<boolean>} 是否注册成功
 */
async function saveUser(username, password) {
  const data = getAllData();
  if (data.users[username]) {
    return false; // 用户已存在
  }
  const hashedPassword = await hashPassword(password);
  data.users[username] = {
    password: hashedPassword,
    loginHistory: [],
    scores: []
  };
  saveAllData(data);
  return true;
}

/**
 * 验证用户登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<boolean>} 是否验证通过
 */
async function validateUser(username, password) {
  const data = getAllData();
  const user = data.users[username];
  if (!user) return false;
  const hashedPassword = await hashPassword(password);
  return user.password === hashedPassword;
}

/**
 * 获取用户数据
 * @param {string} username - 用户名
 * @returns {Object|null} 用户数据或 null
 */
function getUser(username) {
  const data = getAllData();
  return data.users[username] || null;
}

/**
 * 保存游戏分数
 * @param {string} username - 用户名
 * @param {number} score - 本局得分
 */
function saveScore(username, score) {
  const data = getAllData();
  if (data.users[username]) {
    data.users[username].scores.push({
      score: score,
      date: new Date().toLocaleString('zh-CN')
    });
    saveAllData(data);
  }
}

/**
 * 获取用户历史分数
 * @param {string} username - 用户名
 * @returns {Array} 分数记录数组
 */
function getScores(username) {
  const data = getAllData();
  if (data.users[username]) {
    return data.users[username].scores;
  }
  return [];
}

/**
 * 获取用户最高分
 * @param {string} username - 用户名
 * @returns {number} 最高分
 */
function getHighScore(username) {
  const scores = getScores(username);
  if (scores.length === 0) return 0;
  return Math.max(...scores.map(s => s.score));
}

/**
 * 添加登录记录
 * @param {string} username - 用户名
 */
function addLoginRecord(username) {
  const data = getAllData();
  if (data.users[username]) {
    data.users[username].loginHistory.push(
      new Date().toLocaleString('zh-CN')
    );
    saveAllData(data);
  }
}

/**
 * 获取登录历史
 * @param {string} username - 用户名
 * @returns {Array} 登录时间数组
 */
function getLoginHistory(username) {
  const data = getAllData();
  if (data.users[username]) {
    return data.users[username].loginHistory;
  }
  return [];
}

/**
 * 设置当前登录用户
 * @param {string} username - 用户名
 */
function setCurrentUser(username) {
  const data = getAllData();
  data.currentUser = username;
  saveAllData(data);
}

/**
 * 获取当前登录用户
 * @returns {string|null} 当前用户名
 */
function getCurrentUser() {
  const data = getAllData();
  return data.currentUser;
}

/**
 * 清除当前用户会话
 */
function clearCurrentUser() {
  const data = getAllData();
  data.currentUser = null;
  saveAllData(data);
}

/**
 * 获取全局排行榜（所有用户最高分排名）
 * @param {number} limit - 返回前N名，默认10
 * @returns {Array} 排行榜数组 [{username, score, date}]
 */
function getGlobalLeaderboard(limit = 10) {
  const data = getAllData();
  const leaderboard = [];

  // 遍历所有用户，取每个用户的最高分
  for (const [username, userData] of Object.entries(data.users)) {
    if (userData.scores && userData.scores.length > 0) {
      // 找出该用户的最高分记录
      const best = userData.scores.reduce((prev, curr) =>
        curr.score > prev.score ? curr : prev
      );
      leaderboard.push({
        username,
        score: best.score,
        date: best.date
      });
    }
  }

  // 按分数降序排列，取前N名
  leaderboard.sort((a, b) => b.score - a.score);
  return leaderboard.slice(0, limit);
}

// 导出所有函数供其他模块使用
window.Storage = {
  saveUser,
  validateUser,
  getUser,
  saveScore,
  getScores,
  getHighScore,
  addLoginRecord,
  getLoginHistory,
  setCurrentUser,
  getCurrentUser,
  clearCurrentUser,
  getGlobalLeaderboard
};

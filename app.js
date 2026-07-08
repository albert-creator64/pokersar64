const API_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
const ADMIN_TOKEN_KEY = 'poker_admin_token';

let state = { players: [], isAdmin: false };

function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY); }
function setAdminToken(t) { if (t) localStorage.setItem(ADMIN_TOKEN_KEY, t); else localStorage.removeItem(ADMIN_TOKEN_KEY); }

function apiCall(data) {
    let url = API_URL;
    if (data && data.action && (data.action === 'getPlayers' || data.action === 'getLeaderboard')) {
        const params = new URLSearchParams({ action: data.action });
        if (data.token) params.set('token', data.token);
        url += '?' + params.toString();
        return fetch(url).then(r => r.json());
    }
    return fetch(url, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
}

function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast ' + (type || 'success') + ' show';
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function formatPhone(v) {
    let n = v.replace(/\D/g, '').slice(0, 11);
    if (n.startsWith('8')) n = '7' + n.slice(1);
    if (!n.startsWith('7')) n = '7' + n;
    if (n.length <= 1) return '+7';
    let r = '+7 (' + n.slice(1, 4);
    if (n.length > 4) r += ') ' + n.slice(4, 7);
    if (n.length > 7) r += '-' + n.slice(7, 9);
    if (n.length > 9) r += '-' + n.slice(9, 11);
    return r;
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

document.addEventListener('DOMContentLoaded', () => {
    const token = getAdminToken();
    if (token) { state.isAdmin = true; document.getElementById('adminLoginPanel').style.display = 'none'; document.getElementById('adminPanel').style.display = 'block'; }

    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', () => {
        const s = phoneInput.selectionStart, e = phoneInput.selectionEnd;
        phoneInput.value = formatPhone(phoneInput.value);
        phoneInput.setSelectionRange(s, e);
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nickname = document.getElementById('nickname').value.trim();
        const phone = document.getElementById('phone').value.trim();
        if (!nickname) { showToast('Введите никнейм', 'error'); return; }
        if (phone.replace(/\D/g, '').length !== 11) { showToast('Введите корректный номер телефона', 'error'); return; }
        const res = await apiCall({ action: 'addPlayer', nickname, phone, token: getAdminToken() });
        if (res.error) { showToast(res.error, 'error'); return; }
        document.getElementById('registerForm').reset();
        showToast('Игрок ' + nickname + ' зарегистрирован!');
        loadAll();
    });

    document.getElementById('gameForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const checkboxes = document.querySelectorAll('#playersCheckboxes input:checked');
        const winner = document.getElementById('winnerSelect').value;
        if (checkboxes.length < 2) { showToast('Выберите минимум 2 игроков', 'error'); return; }
        if (!winner) { showToast('Выберите победителя', 'error'); return; }
        const playersInGame = Array.from(checkboxes).map(cb => cb.value);
        if (!playersInGame.includes(winner)) { showToast('Победитель должен быть среди игроков', 'error'); return; }
        const res = await apiCall({ action: 'recordGame', players: playersInGame, winner, token: getAdminToken() });
        if (res.error) { showToast(res.error, 'error'); return; }
        showToast('Игра записана!');
        loadAll();
    });

    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        const res = await apiCall({ action: 'adminLogin', password });
        if (res.error) { showToast(res.error, 'error'); return; }
        setAdminToken(res.token);
        state.isAdmin = true;
        document.getElementById('adminLoginPanel').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        showToast('Добро пожаловать, администратор!');
        loadAll();
    });

    document.getElementById('adminLogout').addEventListener('click', () => {
        setAdminToken(null);
        state.isAdmin = false;
        document.getElementById('adminLoginPanel').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('adminPassword').value = '';
        showToast('Вы вышли из админ-панели');
        loadAll();
    });

    document.getElementById('rebuyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const playerId = document.getElementById('rebuyPlayer').value;
        const amount = parseInt(document.getElementById('rebuyAmount').value);
        if (!playerId) { showToast('Выберите игрока', 'error'); return; }
        if (!amount || amount <= 0) { showToast('Введите сумму', 'error'); return; }
        const res = await apiCall({ action: 'recordRebuy', playerId, amount, token: getAdminToken() });
        if (res.error) { showToast(res.error, 'error'); return; }
        document.getElementById('rebuyForm').reset();
        showToast('Ребай записан!');
        loadAll();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        window.open('https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID', '_blank');
    });

    document.getElementById('sortBy').addEventListener('change', renderLeaderboard);

    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            if (btn.dataset.tab === 'admin' && state.isAdmin) loadAdminData();
        });
    });

    loadAll();
});

async function loadAll() {
    await Promise.all([loadPlayers(), loadLeaderboard()]);
    renderRecent();
    renderGameForm();
}

async function loadPlayers() {
    const res = await apiCall({ action: 'getPlayers', token: getAdminToken() });
    if (res.error) { showToast(res.error, 'error'); return; }
    state.players = res.players || [];
    renderRecent();
    renderGameForm();
}

async function loadLeaderboard() {
    const res = await apiCall({ action: 'getLeaderboard', sortBy: document.getElementById('sortBy').value, token: getAdminToken() });
    if (res.error) { showToast(res.error, 'error'); return; }
    renderLeaderboardList(res.players || []);
}

async function loadAdminData() {
    const res = await apiCall({ action: 'getPlayers', token: getAdminToken() });
    if (res.error) return;
    renderAdminPlayers(res.players || []);
    renderAdminForm(res.players || []);
}

function renderRecent() {
    const container = document.getElementById('recentPlayers');
    const list = [...state.players].reverse().slice(0, 10);
    if (list.length === 0) { container.innerHTML = '<p class="empty-state">Пока нет игроков</p>'; return; }
    container.innerHTML = list.map((p, i) => PlayerItem(p, i + 1, false)).join('');
}

function PlayerItem(p, pos, showPhone) {
    const cls = pos === 1 ? 'top-1' : pos === 2 ? 'top-2' : pos === 3 ? 'top-3' : '';
    const initial = (p.nickname || '?').charAt(0).toUpperCase();
    const phoneHtml = showPhone ? '<div class="player-phone">' + esc(p.phone) + '</div>' :
        '<div class="player-phone phone-hidden">скрыт</div>';
    return '<div class="player-item ' + cls + '" data-id="' + p.id + '">' +
        '<div class="player-info">' +
        '<span class="player-pos">' + pos + '</span>' +
        '<div class="player-avatar">' + initial + '</div>' +
        '<div><div class="player-nick">' + esc(p.nickname) + '</div>' + phoneHtml + '</div></div>' +
        '<div class="player-stats">' +
        '<div class="pts">' + (p.points || 0) + ' pts</div>' +
        '<div class="detail">' + (p.gamesPlayed || 0) + ' игр / ' + (p.gamesWon || 0) + ' побед</div></div></div>';
}

function renderLeaderboard() {
    loadLeaderboard();
}

function renderLeaderboardList(list) {
    const container = document.getElementById('leaderboardList');
    if (list.length === 0) { container.innerHTML = '<p class="empty-state">Нет данных для рейтинга</p>'; return; }
    container.innerHTML = list.map((p, i) => {
        const pos = i + 1;
        const wr = p.gamesPlayed ? Math.round(p.gamesWon / p.gamesPlayed * 100) : 0;
        const cls = pos === 1 ? 'top-1' : pos === 2 ? 'top-2' : pos === 3 ? 'top-3' : '';
        const initial = (p.nickname || '?').charAt(0).toUpperCase();
        return '<div class="player-item ' + cls + '">' +
            '<div class="player-info">' +
            '<span class="player-pos">' + pos + '</span>' +
            '<div class="player-avatar">' + initial + '</div>' +
            '<div><div class="player-nick">' + esc(p.nickname) + '</div></div></div>' +
            '<div class="player-stats">' +
            '<div class="pts">' + (p.points || 0) + ' pts</div>' +
            '<div class="detail">' + (p.gamesPlayed || 0) + ' игр / ' + (p.gamesWon || 0) + ' побед (' + wr + '%)</div></div></div>';
    }).join('');
}

function renderGameForm() {
    const container = document.getElementById('playersCheckboxes');
    const winnerSelect = document.getElementById('winnerSelect');
    if (state.players.length === 0) {
        container.innerHTML = '<p class="empty-state">Сначала зарегистрируйте игроков</p>';
        winnerSelect.innerHTML = '<option value="">-- нет игроков --</option>';
        return;
    }
    container.innerHTML = state.players.map(p =>
        '<label class="checkbox-item"><input type="checkbox" value="' + p.id + '">' + esc(p.nickname) + '</label>'
    ).join('');
    container.querySelectorAll('input').forEach(cb => {
        cb.addEventListener('change', () => {
            cb.parentElement.classList.toggle('active', cb.checked);
            updateWinnerSelect();
        });
    });
    updateWinnerSelect();
}

function updateWinnerSelect() {
    const sel = document.getElementById('winnerSelect');
    const checked = document.querySelectorAll('#playersCheckboxes input:checked');
    sel.innerHTML = '<option value="">-- выберите --</option>';
    checked.forEach(cb => {
        const p = state.players.find(pl => pl.id === cb.value);
        if (p) sel.innerHTML += '<option value="' + p.id + '">' + esc(p.nickname) + '</option>';
    });
}

function renderAdminPlayers(list) {
    const container = document.getElementById('adminPlayersList');
    if (list.length === 0) { container.innerHTML = '<p class="empty-state">Нет игроков</p>'; return; }
    container.innerHTML = list.map((p, i) => {
        const pos = i + 1;
        const initial = (p.nickname || '?').charAt(0).toUpperCase();
        return '<div class="player-item">' +
            '<div class="player-info">' +
            '<div class="player-avatar">' + initial + '</div>' +
            '<div><div class="player-nick">' + esc(p.nickname) + '</div>' +
            '<div class="player-phone">' + esc(p.phone || '—') + '</div></div></div>' +
            '<div class="player-stats">' +
            '<div class="pts">' + (p.points || 0) + ' pts</div>' +
            '<div class="detail">Ребаи: ' + (p.rebuys || 0) + ' (' + (p.rebuyTotal || 0) + ' руб)</div></div></div>';
    }).join('');
}

function renderAdminForm(list) {
    const sel = document.getElementById('rebuyPlayer');
    sel.innerHTML = '<option value="">-- выберите --</option>';
    list.forEach(p => {
        sel.innerHTML += '<option value="' + p.id + '">' + esc(p.nickname) + ' (' + esc(p.phone) + ')</option>';
    });
}
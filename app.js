const STORAGE_KEY = 'poker_lounge';

let data = loadData();

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : { players: [], games: [] };
    } catch { return { players: [], games: [] }; }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast ' + type + ' show';
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function formatPhone(v) {
    let n = v.replace(/\D/g, '').slice(0, 11);
    if (n.startsWith('8')) n = '7' + n.slice(1);
    if (!n.startsWith('7')) n = '7' + n;
    let r = '+7';
    if (n.length > 1) r += ' (' + n.slice(1, 4);
    if (n.length > 4) r += ') ' + n.slice(4, 7);
    if (n.length > 7) r += '-' + n.slice(7, 9);
    if (n.length > 9) r += '-' + n.slice(9, 11);
    return r;
}

function isValidPhone(v) {
    return v.replace(/\D/g, '').length === 11;
}

document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', () => {
        const start = phoneInput.selectionStart, end = phoneInput.selectionEnd;
        phoneInput.value = formatPhone(phoneInput.value);
        phoneInput.setSelectionRange(start, end);
    });

    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const nickname = document.getElementById('nickname').value.trim();
        const phone = document.getElementById('phone').value.trim();
        if (!nickname) { showToast('Введите никнейм', 'error'); return; }
        if (!isValidPhone(phone)) { showToast('Введите корректный номер телефона', 'error'); return; }
        if (data.players.find(p => p.nickname.toLowerCase() === nickname.toLowerCase())) {
            showToast('Игрок с таким ником уже существует', 'error'); return;
        }
        if (data.players.find(p => p.phone === phone)) {
            showToast('Этот номер уже зарегистрирован', 'error'); return;
        }
        const player = { id: Date.now().toString(36), nickname, phone, gamesPlayed: 0, gamesWon: 0, points: 0 };
        data.players.push(player);
        saveData();
        document.getElementById('registerForm').reset();
        showToast('Игрок ' + nickname + ' зарегистрирован!');
        renderAll();
    });

    document.getElementById('gameForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const checkboxes = document.querySelectorAll('#playersCheckboxes input:checked');
        const winner = document.getElementById('winnerSelect').value;
        if (checkboxes.length < 2) { showToast('Выберите минимум 2 игроков', 'error'); return; }
        if (!winner) { showToast('Выберите победителя', 'error'); return; }
        const playersInGame = Array.from(checkboxes).map(cb => cb.value);
        if (!playersInGame.includes(winner)) { showToast('Победитель должен быть среди игроков', 'error'); return; }
        const pointsPerPlayer = Math.max(1, Math.floor(100 / playersInGame.length));
        playersInGame.forEach(id => {
            const p = data.players.find(pl => pl.id === id);
            if (p) { p.gamesPlayed++; p.points += pointsPerPlayer; if (id === winner) { p.gamesWon++; p.points += 20; } }
        });
        data.games.push({ date: new Date().toISOString(), players: playersInGame, winner });
        saveData();
        showToast('Игра записана!');
        renderAll();
    });

    document.getElementById('sortBy').addEventListener('change', renderLeaderboard);

    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

    renderAll();
});

function renderAll() {
    renderRecent();
    renderLeaderboard();
    renderGameForm();
}

function renderRecent() {
    const container = document.getElementById('recentPlayers');
    const sorted = [...data.players].reverse().slice(0, 10);
    if (sorted.length === 0) {
        container.innerHTML = '<p class="empty-state">Пока нет игроков</p>'; return;
    }
    container.innerHTML = sorted.map(p => PlayerItem(p, data.players.indexOf(p) + 1)).join('');
}

function PlayerItem(p, pos, showPhone = true) {
    const cls = pos === 1 ? 'top-1' : pos === 2 ? 'top-2' : pos === 3 ? 'top-3' : '';
    const initial = p.nickname.charAt(0).toUpperCase();
    return '<div class="player-item ' + cls + '">' +
        '<div class="player-info">' +
        '<span class="player-pos">' + pos + '</span>' +
        '<div class="player-avatar">' + initial + '</div>' +
        '<div><div class="player-nick">' + esc(p.nickname) + '</div>' +
        (showPhone ? '<div class="player-phone">' + esc(p.phone) + '</div>' : '') + '</div></div>' +
        '<div class="player-stats">' +
        '<div class="pts">' + p.points + ' pts</div>' +
        '<div class="detail">' + p.gamesPlayed + ' игр / ' + p.gamesWon + ' побед</div></div></div>';
}

function esc(s) {
    const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

function renderLeaderboard() {
    const sort = document.getElementById('sortBy').value;
    const list = [...data.players];
    list.sort((a, b) => {
        if (sort === 'gamesPlayed') return b.gamesPlayed - a.gamesPlayed || b.points - a.points;
        if (sort === 'winRate') {
            const ra = a.gamesPlayed ? a.gamesWon / a.gamesPlayed : 0;
            const rb = b.gamesPlayed ? b.gamesWon / b.gamesPlayed : 0;
            return rb - ra || b.points - a.points;
        }
        return b.points - a.points || b.gamesPlayed - a.gamesPlayed;
    });
    const container = document.getElementById('leaderboardList');
    if (list.length === 0) {
        container.innerHTML = '<p class="empty-state">Нет данных для рейтинга</p>'; return;
    }
    container.innerHTML = list.map((p, i) => {
        const pos = i + 1;
        const wr = p.gamesPlayed ? Math.round(p.gamesWon / p.gamesPlayed * 100) : 0;
        const cls = pos === 1 ? 'top-1' : pos === 2 ? 'top-2' : pos === 3 ? 'top-3' : '';
        const initial = p.nickname.charAt(0).toUpperCase();
        return '<div class="player-item ' + cls + '" data-id="' + p.id + '">' +
            '<div class="player-info">' +
            '<span class="player-pos">' + pos + '</span>' +
            '<div class="player-avatar">' + initial + '</div>' +
            '<div><div class="player-nick">' + esc(p.nickname) + '</div>' +
            '<div class="player-phone">' + esc(p.phone) + '</div></div></div>' +
            '<div class="player-stats">' +
            '<div class="pts">' + p.points + ' pts</div>' +
            '<div class="detail">' + p.gamesPlayed + ' игр / ' + p.gamesWon + ' побед (' + wr + '%)</div></div></div>';
    }).join('');

    container.querySelectorAll('.player-item').forEach(el => {
        el.addEventListener('click', () => showProfile(el.dataset.id));
    });
}

function renderGameForm() {
    const container = document.getElementById('playersCheckboxes');
    const winnerSelect = document.getElementById('winnerSelect');
    if (data.players.length === 0) {
        container.innerHTML = '<p class="empty-state">Сначала зарегистрируйте игроков</p>';
        winnerSelect.innerHTML = '<option value="">-- нет игроков --</option>';
        return;
    }
    container.innerHTML = data.players.map(p =>
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
        const p = data.players.find(pl => pl.id === cb.value);
        if (p) sel.innerHTML += '<option value="' + p.id + '">' + esc(p.nickname) + '</option>';
    });
}

function showProfile(id) {
    const p = data.players.find(pl => pl.id === id);
    if (!p) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="profile"]').classList.add('active');
    document.getElementById('tab-profile').classList.add('active');
    const wr = p.gamesPlayed ? Math.round(p.gamesWon / p.gamesPlayed * 100) : 0;
    document.getElementById('profileInfo').innerHTML =
        '<h3>' + esc(p.nickname) + '</h3><p>' + esc(p.phone) + '</p>';
    document.getElementById('profileStats').style.display = 'block';
    document.getElementById('statGames').textContent = p.gamesPlayed;
    document.getElementById('statWins').textContent = p.gamesWon;
    document.getElementById('statWinRate').textContent = wr + '%';
    document.getElementById('statPoints').textContent = p.points;
}
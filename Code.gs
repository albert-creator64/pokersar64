const SHEET_ID = '1MJEIG7W1VRYfQvCAjzLUEcteKfft-OuPdeoKUKa3r1Y';
const ADMIN_PASSWORD = 'poker2024';

function doGet() {
  return HtmlService.createHtmlOutput(HTML).setTitle('Poker Lounge').addMetaTag('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no');
}

/* === SERVER API === */

function getPlayers(token) {
  const isAdmin = verifyToken(token);
  const sheet = getSheet('Players');
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const players = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    players.push({
      id: row[0], nickname: row[1], phone: isAdmin ? row[2] : '***',
      gamesPlayed: Number(row[3]) || 0, gamesWon: Number(row[4]) || 0,
      points: Number(row[5]) || 0, rebuys: Number(row[6]) || 0,
      rebuyTotal: Number(row[7]) || 0
    });
  }
  return players;
}

function getLeaderboard(token, sortBy) {
  const players = getPlayers(token);
  players.sort((a, b) => {
    if (sortBy === 'gamesPlayed') return b.gamesPlayed - a.gamesPlayed || b.points - a.points;
    if (sortBy === 'winRate') {
      const ra = a.gamesPlayed ? a.gamesWon / a.gamesPlayed : 0;
      const rb = b.gamesPlayed ? b.gamesWon / b.gamesPlayed : 0;
      return rb - ra || b.points - a.points;
    }
    return b.points - a.points || b.gamesPlayed - a.gamesPlayed;
  });
  return players;
}

function addPlayer(nickname, phone) {
  if (!nickname || !nickname.trim()) return { error: 'Р’РІРµРґРёС‚Рµ РЅРёРєРЅРµР№Рј' };
  if (!phone || phone.replace(/\D/g,'').length !== 11) return { error: 'Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ РЅРѕРјРµСЂ' };
  const sheet = getSheet('Players');
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][1] && existing[i][1].toLowerCase() === nickname.toLowerCase().trim()) return { error: 'РќРёРє СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚' };
    if (existing[i][2] === phone) return { error: 'РќРѕРјРµСЂ СѓР¶Рµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅ' };
  }
  const id = Utilities.getUuid();
  sheet.appendRow([id, nickname.trim(), phone, 0, 0, 0, 0, 0, new Date().toISOString()]);
  return { success: true, nickname: nickname.trim() };
}

function recordGame(playerIds, winnerId) {
  if (!playerIds || playerIds.length < 2) return { error: 'РњРёРЅРёРјСѓРј 2 РёРіСЂРѕРєР°' };
  if (!winnerId) return { error: 'РЈРєР°Р¶РёС‚Рµ РїРѕР±РµРґРёС‚РµР»СЏ' };
  const sheet = getSheet('Players');
  const allData = sheet.getDataRange().getValues();
  const pts = Math.max(1, Math.floor(100 / playerIds.length));
  for (let i = 1; i < allData.length; i++) {
    if (playerIds.includes(allData[i][0])) {
      const gp = Number(allData[i][3]) + 1;
      const gw = Number(allData[i][4]) + (allData[i][0] === winnerId ? 1 : 0);
      const p = Number(allData[i][5]) + pts + (allData[i][0] === winnerId ? 20 : 0);
      sheet.getRange(i + 1, 4).setValue(gp);
      sheet.getRange(i + 1, 5).setValue(gw);
      sheet.getRange(i + 1, 6).setValue(p);
    }
  }
  getSheet('Games').appendRow([Utilities.getUuid(), new Date().toISOString(), JSON.stringify(playerIds), winnerId, new Date().toISOString()]);
  return { success: true };
}

function recordRebuy(playerId, amount) {
  if (!playerId || !amount || amount <= 0) return { error: 'РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РґР°РЅРЅС‹Рµ' };
  const sheet = getSheet('Players');
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === playerId) {
      sheet.getRange(i + 1, 7).setValue(Number(allData[i][6]) + 1);
      sheet.getRange(i + 1, 8).setValue(Number(allData[i][7]) + amount);
      getSheet('Rebuys').appendRow([Utilities.getUuid(), new Date().toISOString(), playerId, amount, new Date().toISOString()]);
      return { success: true };
    }
  }
  return { error: 'РРіСЂРѕРє РЅРµ РЅР°Р№РґРµРЅ' };
}

function adminLogin(password) {
  if (password === ADMIN_PASSWORD) {
    const token = Utilities.getUuid();
    getSheet('Settings').appendRow(['adminToken', token]);
    return { success: true, token };
  }
  return { error: 'РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ' };
}

function verifyToken(token) {
  if (!token) return false;
  const data = getSheet('Settings').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'adminToken' && data[i][1] === token) return true;
  }
  return false;
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = { Players: ['id','nickname','phone','gamesPlayed','gamesWon','points','rebuys','rebuyTotal','createdAt'], Games: ['id','date','players','winner','createdAt'], Rebuys: ['id','date','playerId','amount','createdAt'], Settings: ['key','value'] };
    sheet.appendRow(headers[name] || ['key','value']);
    if (name === 'Settings') sheet.appendRow(['adminPassword', ADMIN_PASSWORD]);
  }
  return sheet;
}

/* === HTML APP === */

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Poker Lounge</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0d0d0d;--card:#1a1a2e;--primary:#d4a843;--primary-dark:#b8922e;--text:#f0f0f0;--text-dim:#888;--green:#2ecc71;--red:#e74c3c;--r:12px}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);overflow-x:hidden;-webkit-tap-highlight-color:transparent}
.app{max-width:480px;margin:0 auto;min-height:100vh;padding-bottom:20px}
.header{padding:40px 20px 30px;text-align:center;background:linear-gradient(135deg,#1a0a00,#2d1810,#1a0a00)}
.logo{display:flex;align-items:center;justify-content:center;gap:12px}
.logo h1{font-size:1.8rem;font-weight:700;letter-spacing:2px;background:linear-gradient(135deg,#d4a843,#f5d061);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.logo-suit{font-size:1.5rem;color:var(--primary);opacity:.6}
.subtitle{font-size:.9rem;color:var(--text-dim);margin-top:6px}
.tabs{display:flex;margin:0 16px;background:var(--card);border-radius:var(--r);overflow:hidden}
.tab{flex:1;padding:12px 8px;border:none;background:transparent;color:var(--text-dim);font-size:.85rem;font-weight:600;cursor:pointer;transition:.3s}
.tab.active{color:var(--primary);background:rgba(212,168,67,.1)}
.tab.active::after{content:'';position:absolute;bottom:0;left:20%;right:20%;height:2px;background:var(--primary);border-radius:1px}
.tab:active{opacity:.7}
.tab-content{display:none;padding:16px}
.tab-content.active{display:block}
.card{background:var(--card);border-radius:var(--r);padding:20px;margin-bottom:16px}
.card h2{font-size:1.1rem;margin-bottom:16px;color:var(--primary);font-weight:600}
.field{margin-bottom:16px}
.field label{display:block;font-size:.85rem;color:var(--text-dim);margin-bottom:6px}
.field input,.sort-select{width:100%;padding:12px 16px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.05);color:var(--text);font-size:1rem;outline:none;transition:.3s}
.field input:focus{border-color:var(--primary)}
.btn{width:100%;padding:14px;border:none;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#000;font-size:1rem;font-weight:700;cursor:pointer;transition:.2s}
.btn:active{transform:scale(.98)}
.btn-secondary{background:linear-gradient(135deg,#2c3e50,#34495e);color:var(--text)}
.btn-small{padding:8px 16px;border:none;border-radius:6px;background:rgba(255,255,255,.1);color:var(--text);font-size:.8rem;cursor:pointer}
.empty-state{text-align:center;color:var(--text-dim);padding:30px 0;font-size:.9rem}
.player-item{display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:8px;background:rgba(255,255,255,.03);margin-bottom:8px}
.player-info{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.player-pos{font-size:.8rem;color:var(--primary);font-weight:700;width:24px;flex-shrink:0}
.player-nick{font-weight:600;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.player-phone{font-size:.75rem;color:var(--text-dim)}
.player-stats{text-align:right;flex-shrink:0}
.player-stats .pts{font-weight:700;color:var(--primary)}
.player-stats .detail{font-size:.75rem;color:var(--text-dim)}
.player-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#000;font-weight:700;flex-shrink:0}
.top-1{border:1px solid #d4a843}.top-2{border:1px solid #a8a8a8}.top-3{border:1px solid #cd7f32}
.checkboxes{display:flex;flex-wrap:wrap;gap:8px}
.checkbox-item{display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(255,255,255,.05);border-radius:8px;font-size:.9rem;cursor:pointer}
.checkbox-item input{display:none}
.checkbox-item.active{background:rgba(212,168,67,.2);color:var(--primary)}
.admin-header{display:flex;justify-content:space-between;align-items:center}
.admin-header h2{margin-bottom:0}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--card);color:var(--text);padding:12px 24px;border-radius:8px;border:1px solid var(--primary);font-size:.9rem;z-index:1000;transition:.3s;opacity:0;pointer-events:none}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}
.toast.error{border-color:var(--red)}.toast.success{border-color:var(--green)}
.loader{text-align:center;padding:20px;color:var(--text-dim);font-size:.9rem}
</style>
</head>
<body>
<div class="app">
<div class="header"><div class="logo"><span class="logo-suit">в™ </span><h1>Poker Lounge</h1><span class="logo-suit">в™Ґ</span></div><p class="subtitle">Р—Р°РїРёСЃСЊ Рё СЂРµР№С‚РёРЅРі РёРіСЂРѕРєРѕРІ</p></div>
<nav class="tabs"><button class="tab active" data-tab="register">Р РµРіРёСЃС‚СЂР°С†РёСЏ</button><button class="tab" data-tab="leaderboard">Р РµР№С‚РёРЅРі</button><button class="tab" data-tab="admin">РђРґРјРёРЅ</button></nav>
<main class="content">
<section id="tab-register" class="tab-content active">
<div class="card"><h2>РќРѕРІС‹Р№ РёРіСЂРѕРє</h2><form id="registerForm"><div class="field"><label>РќРёРєРЅРµР№Рј</label><input type="text" id="nickname" placeholder="Р’РІРµРґРёС‚Рµ РЅРёРє" required maxlength="20"></div><div class="field"><label>РќРѕРјРµСЂ С‚РµР»РµС„РѕРЅР°</label><input type="tel" id="phone" placeholder="+7 (999) 999-99-99" required></div><button type="submit" class="btn">Р—Р°РїРёСЃР°С‚СЊСЃСЏ</button></form></div>
<div class="card"><h2>РџРѕСЃР»РµРґРЅРёРµ Р·Р°РїРёСЃРё</h2><div id="recentPlayers"><p class="empty-state">Р—Р°РіСЂСѓР·РєР°...</p></div></div>
</section>
<section id="tab-leaderboard" class="tab-content">
<div class="card"><div class="admin-header"><h2>Р РµР№С‚РёРЅРі РёРіСЂРѕРєРѕРІ</h2><select id="sortBy" class="sort-select" style="width:auto;padding:8px 12px"><option value="points">РџРѕ РѕС‡РєР°Рј</option><option value="gamesPlayed">РџРѕ РёРіСЂР°Рј</option><option value="winRate">РџРѕ % РїРѕР±РµРґ</option></select></div><div id="leaderboardList"><p class="empty-state">Р—Р°РіСЂСѓР·РєР°...</p></div></div>
<div class="card"><h2>Р—Р°РїРёСЃР°С‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚ РёРіСЂС‹</h2><form id="gameForm"><div class="field"><label>Р’С‹Р±РµСЂРёС‚Рµ РёРіСЂРѕРєРѕРІ (РјРёРЅРёРјСѓРј 2)</label><div id="playersCheckboxes" class="checkboxes"></div></div><div class="field"><label>РџРѕР±РµРґРёС‚РµР»СЊ</label><select id="winnerSelect" class="sort-select"><option value="">-- РІС‹Р±РµСЂРёС‚Рµ --</option></select></div><button type="submit" class="btn btn-secondary">Р—Р°РїРёСЃР°С‚СЊ РёРіСЂСѓ</button></form></div>
</section>
<section id="tab-admin" class="tab-content">
<div id="adminLoginPanel"><div class="card"><h2>Р’С…РѕРґ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°</h2><form id="adminLoginForm"><div class="field"><label>РџР°СЂРѕР»СЊ</label><input type="password" id="adminPassword" placeholder="Р’РІРµРґРёС‚Рµ РїР°СЂРѕР»СЊ"></div><button type="submit" class="btn">Р’РѕР№С‚Рё</button></form></div></div>
<div id="adminPanel" style="display:none">
<div class="card"><div class="admin-header"><h2>РџР°РЅРµР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°</h2><button id="adminLogout" class="btn-small">Р’С‹Р№С‚Рё</button></div></div>
<div class="card"><h2>Р’СЃРµ РёРіСЂРѕРєРё (СЃ С‚РµР»РµС„РѕРЅР°РјРё)</h2><div id="adminPlayersList"><p class="empty-state">Р—Р°РіСЂСѓР·РєР°...</p></div></div>
<div class="card"><h2>Р—Р°РїРёСЃР°С‚СЊ СЂРµР±Р°Р№</h2><form id="rebuyForm"><div class="field"><label>РРіСЂРѕРє</label><select id="rebuyPlayer" class="sort-select"></select></div><div class="field"><label>РЎСѓРјРјР°</label><input type="number" id="rebuyAmount" placeholder="РќР°РїСЂРёРјРµСЂ: 500" min="0" step="50"></div><button type="submit" class="btn btn-secondary">Р—Р°РїРёСЃР°С‚СЊ СЂРµР±Р°Р№</button></form></div>
<div class="card"><h2>Р’С‹РіСЂСѓР·РєР° РґР°РЅРЅС‹С…</h2><button id="exportBtn" class="btn btn-secondary">РћС‚РєСЂС‹С‚СЊ Google РўР°Р±Р»РёС†Сѓ</button></div>
</div>
</section>
</main>
<div class="toast" id="toast"></div>
</div>
<script>
const SHEET_ID = '1MJEIG7W1VRYfQvCAjzLUEcteKfft-OuPdeoKUKa3r1Y';
const ADMIN_TOKEN_KEY = 'poker_admin';
let isAdmin = !!localStorage.getItem(ADMIN_TOKEN_KEY);

function toast(m,t){const e=document.getElementById('toast');e.textContent=m;e.className='toast '+(t||'success')+' show';clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2500)}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function fmtPhone(v){let n=v.replace(/\D/g,'').slice(0,11);if(n.startsWith('8'))n='7'+n.slice(1);if(!n.startsWith('7'))n='7'+n;if(n.length<2)return'+7';let r='+7 ('+n.slice(1,4);if(n.length>4)r+=') '+n.slice(4,7);if(n.length>7)r+='-'+n.slice(7,9);if(n.length>9)r+='-'+n.slice(9,11);return r}

function gApi(method,...args){
  return new Promise((resolve,reject)=>{
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(e=>reject(e.message||'РћС€РёР±РєР°'))
      [method](...args);
  });
}

document.addEventListener('DOMContentLoaded',async()=>{
  document.getElementById('phone').addEventListener('input',function(){const s=this.selectionStart,e=this.selectionEnd;this.value=fmtPhone(this.value);this.setSelectionRange(s,e)});

  document.getElementById('registerForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const n=document.getElementById('nickname').value.trim(),p=document.getElementById('phone').value.trim();
    if(!n)return toast('Р’РІРµРґРёС‚Рµ РЅРёРє','error');
    if(p.replace(/\D/g,'').length!==11)return toast('Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ С‚РµР»РµС„РѕРЅ','error');
    const r=await gApi('addPlayer',n,p);
    if(r.error)return toast(r.error,'error');
    document.getElementById('registerForm').reset();
    toast('РРіСЂРѕРє '+n+' Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅ!');
    loadAll();
  });

  document.getElementById('gameForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const cbs=document.querySelectorAll('#playersCheckboxes input:checked'),w=document.getElementById('winnerSelect').value;
    if(cbs.length<2)return toast('РњРёРЅРёРјСѓРј 2 РёРіСЂРѕРєР°','error');
    if(!w)return toast('Р’С‹Р±РµСЂРёС‚Рµ РїРѕР±РµРґРёС‚РµР»СЏ','error');
    const ids=Array.from(cbs).map(c=>c.value);
    if(!ids.includes(w))return toast('РџРѕР±РµРґРёС‚РµР»СЊ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃСЂРµРґРё РёРіСЂРѕРєРѕРІ','error');
    const r=await gApi('recordGame',ids,w);
    if(r.error)return toast(r.error,'error');
    toast('РРіСЂР° Р·Р°РїРёСЃР°РЅР°!');loadAll();
  });

  document.getElementById('adminLoginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const pwd=document.getElementById('adminPassword').value;
    const r=await gApi('adminLogin',pwd);
    if(r.error)return toast(r.error,'error');
    localStorage.setItem(ADMIN_TOKEN_KEY,r.token);isAdmin=true;
    document.getElementById('adminLoginPanel').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    toast('Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ, Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ!');
    loadAll();loadAdminData();
  });

  document.getElementById('adminLogout').addEventListener('click',()=>{
    localStorage.removeItem(ADMIN_TOKEN_KEY);isAdmin=false;
    document.getElementById('adminLoginPanel').style.display='block';
    document.getElementById('adminPanel').style.display='none';
    toast('Р’С‹ РІС‹С€Р»Рё РёР· Р°РґРјРёРЅ-РїР°РЅРµР»Рё');
  });

  document.getElementById('rebuyForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const pid=document.getElementById('rebuyPlayer').value,amt=parseInt(document.getElementById('rebuyAmount').value);
    if(!pid)return toast('Р’С‹Р±РµСЂРёС‚Рµ РёРіСЂРѕРєР°','error');
    if(!amt||amt<=0)return toast('Р’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ','error');
    const r=await gApi('recordRebuy',pid,amt);
    if(r.error)return toast(r.error,'error');
    document.getElementById('rebuyForm').reset();
    toast('Р РµР±Р°Р№ Р·Р°РїРёСЃР°РЅ!');loadAll();loadAdminData();
  });

  document.getElementById('exportBtn').addEventListener('click',()=>window.open('https://docs.google.com/spreadsheets/d/'+SHEET_ID,'_blank'));
  document.getElementById('sortBy').addEventListener('change',loadLeaderboard);

  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.tab,.tab-content').forEach(e=>e.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
    if(b.dataset.tab==='admin'&&isAdmin)loadAdminData();
  }));

  if(isAdmin){document.getElementById('adminLoginPanel').style.display='none';document.getElementById('adminPanel').style.display='block'}
  loadAll();if(isAdmin)loadAdminData();
});

async function loadAll(){const[p,lb]=await Promise.all([gApi('getPlayers',localStorage.getItem(ADMIN_TOKEN_KEY)),gApi('getLeaderboard',localStorage.getItem(ADMIN_TOKEN_KEY),document.getElementById('sortBy').value)]);renderRecent(p);renderLeaderboardList(lb);renderGameForm(p)}
async function loadLeaderboard(){const lb=await gApi('getLeaderboard',localStorage.getItem(ADMIN_TOKEN_KEY),document.getElementById('sortBy').value);renderLeaderboardList(lb)}
async function loadAdminData(){const p=await gApi('getPlayers',localStorage.getItem(ADMIN_TOKEN_KEY));renderAdminPlayers(p);renderAdminForm(p)}

function renderRecent(list){const c=document.getElementById('recentPlayers');if(!list||!list.length)return c.innerHTML='<p class="empty-state">РџРѕРєР° РЅРµС‚ РёРіСЂРѕРєРѕРІ</p>';c.innerHTML=list.slice().reverse().slice(0,10).map((p,i)=>playerHtml(p,i+1,false)).join('')}
function renderLeaderboardList(list){const c=document.getElementById('leaderboardList');if(!list||!list.length)return c.innerHTML='<p class="empty-state">РќРµС‚ РґР°РЅРЅС‹С… РґР»СЏ СЂРµР№С‚РёРЅРіР°</p>';c.innerHTML=list.map((p,i)=>playerHtml(p,i+1,false,true)).join('')}

function playerHtml(p,pos,showPhone,showWr){
  const cls=pos===1?'top-1':pos===2?'top-2':pos===3?'top-3':'';
  const i=(p.nickname||'?').charAt(0).toUpperCase();
  const ph=showPhone?'<div class="player-phone">'+esc(p.phone)+'</div>':'<div class="player-phone" style="color:#555">СЃРєСЂС‹С‚</div>';
  const wr=p.gamesPlayed?Math.round(p.gamesWon/p.gamesPlayed*100):0;
  return '<div class="player-item '+cls+'"><div class="player-info"><span class="player-pos">'+pos+'</span><div class="player-avatar">'+i+'</div><div><div class="player-nick">'+esc(p.nickname)+'</div>'+ph+'</div></div><div class="player-stats"><div class="pts">'+(p.points||0)+' pts</div><div class="detail">'+(p.gamesPlayed||0)+' РёРіСЂ / '+(p.gamesWon||0)+' РїРѕР±РµРґ'+(showWr?' ('+wr+'%)':'')+'</div></div></div>';
}

function renderGameForm(list){const c=document.getElementById('playersCheckboxes'),w=document.getElementById('winnerSelect');if(!list||!list.length){c.innerHTML='<p class="empty-state">РЎРЅР°С‡Р°Р»Р° Р·Р°СЂРµРіРёСЃС‚СЂРёСЂСѓР№С‚Рµ РёРіСЂРѕРєРѕРІ</p>';w.innerHTML='<option value="">-- РЅРµС‚ РёРіСЂРѕРєРѕРІ --</option>';return}
c.innerHTML=list.map(p=>'<label class="checkbox-item"><input type="checkbox" value="'+p.id+'">'+esc(p.nickname)+'</label>').join('');
c.querySelectorAll('input').forEach(cb=>cb.addEventListener('change',function(){this.parentElement.classList.toggle('active',this.checked);updateWinner()}))}

function updateWinner(){const w=document.getElementById('winnerSelect'),ck=document.querySelectorAll('#playersCheckboxes input:checked');w.innerHTML='<option value="">-- РІС‹Р±РµСЂРёС‚Рµ --</option>';ck.forEach(c=>{const p=window._players?.find(pl=>pl.id===c.value);if(p)w.innerHTML+='<option value="'+p.id+'">'+esc(p.nickname)+'</option>'})}

function renderAdminPlayers(list){const c=document.getElementById('adminPlayersList');if(!list||!list.length)return c.innerHTML='<p class="empty-state">РќРµС‚ РёРіСЂРѕРєРѕРІ</p>';c.innerHTML=list.map((p,i)=>{const i2=(p.nickname||'?').charAt(0).toUpperCase();return '<div class="player-item"><div class="player-info"><div class="player-avatar">'+i2+'</div><div><div class="player-nick">'+esc(p.nickname)+'</div><div class="player-phone">'+esc(p.phone||'вЂ”')+'</div></div></div><div class="player-stats"><div class="pts">'+(p.points||0)+' pts</div><div class="detail">Р РµР±Р°Рё: '+(p.rebuys||0)+' ('+(p.rebuyTotal||0)+' СЂСѓР±)</div></div></div>'}).join('')}

function renderAdminForm(list){const s=document.getElementById('rebuyPlayer');s.innerHTML='<option value="">-- РІС‹Р±РµСЂРёС‚Рµ --</option>';list.forEach(p=>s.innerHTML+='<option value="'+p.id+'">'+esc(p.nickname)+' ('+esc(p.phone)+')</option>');window._players=list}
</script>
</body>
</html>`;

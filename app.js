const APP_PASS = 'poker2024';
const STORE = 'poker_data';
const ADMIN_KEY = 'poker_admin';

let data = loadData();
let isAdmin = !!localStorage.getItem(ADMIN_KEY);

function loadData(){
  try{return JSON.parse(localStorage.getItem(STORE))||{players:[],games:[],rebuys:[]}}
  catch(e){return{players:[],games:[],rebuys:[]}}
}
function saveData(){localStorage.setItem(STORE,JSON.stringify(data))}

function q(s){return document.querySelector(s)}
function qq(s){return document.querySelectorAll(s)}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

function toast(m,t){
  const e=document.getElementById('toast');
  e.textContent=m;e.className='toast '+(t||'ok')+' show';
  clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200);
}

function fmtPhone(v){
  let n=v.replace(/\D/g,'').slice(0,11);
  if(n.startsWith('8'))n='7'+n.slice(1);
  if(!n.startsWith('7'))n='7'+n;
  if(n.length<2)return'+7';
  let r='+7 ('+n.slice(1,4);
  if(n.length>4)r+=') '+n.slice(4,7);
  if(n.length>7)r+='-'+n.slice(7,9);
  if(n.length>9)r+='-'+n.slice(9,11);
  return r;
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded',()=>{

  q('#phone').addEventListener('input',function(){
    const s=this.selectionStart,e=this.selectionEnd;
    this.value=fmtPhone(this.value);
    this.setSelectionRange(s,e);
  });

  q('#registerForm').addEventListener('submit',e=>{
    e.preventDefault();
    const n=q('#nickname').value.trim(),p=q('#phone').value.trim();
    if(!n)return toast('Введите ник','err');
    if(p.replace(/\D/g,'').length!==11)return toast('Некорректный номер','err');
    if(data.players.find(x=>x.nickname.toLowerCase()===n.toLowerCase()))return toast('Такой ник уже есть','err');
    if(data.players.find(x=>x.phone===p))return toast('Номер уже зарегистрирован','err');
    data.players.push({
      id:uid(),nickname:n,phone:p,
      gamesPlayed:0,gamesWon:0,points:0,
      rebuys:0,rebuyTotal:0,
      createdAt:new Date().toISOString()
    });
    saveData();
    q('#registerForm').reset();
    toast('Игрок '+n+' записан!');
    renderAll();
  });

  q('#gameForm').addEventListener('submit',e=>{
    e.preventDefault();
    const cbs=qq('#playersCheckboxes input:checked'),w=q('#winnerSelect').value;
    if(cbs.length<2)return toast('Минимум 2 игрока','err');
    if(!w)return toast('Выберите победителя','err');
    const ids=Array.from(cbs).map(c=>c.value);
    if(!ids.includes(w))return toast('Победитель среди участников','err');
    const pts=Math.max(1,Math.floor(100/ids.length));
    data.players.forEach(p=>{
      if(ids.includes(p.id)){
        p.gamesPlayed++;
        p.points+=pts;
        if(p.id===w){p.gamesWon++;p.points+=20}
      }
    });
    data.games.push({id:uid(),date:new Date().toISOString(),players:ids,winner:w});
    saveData();
    toast('Игра записана!');
    renderAll();
  });

  q('#adminForm').addEventListener('submit',e=>{
    e.preventDefault();
    if(q('#adminPass').value===APP_PASS){
      localStorage.setItem(ADMIN_KEY,'1');isAdmin=true;
      q('#adminLogin').style.display='none';q('#adminPanel').style.display='block';
      toast('Добро пожаловать!');renderAll();
    }else toast('Неверный пароль','err');
  });

  q('#adminLogout').addEventListener('click',()=>{
    localStorage.removeItem(ADMIN_KEY);isAdmin=false;
    q('#adminLogin').style.display='block';q('#adminPanel').style.display='none';
    toast('Вы вышли');
  });

  q('#rebuyForm').addEventListener('submit',e=>{
    e.preventDefault();
    const pid=q('#rebuyPlayer').value,amt=parseInt(q('#rebuyAmount').value);
    if(!pid)return toast('Выберите игрока','err');
    if(!amt||amt<=0)return toast('Введите сумму','err');
    const p=data.players.find(x=>x.id===pid);
    if(!p)return toast('Игрок не найден','err');
    p.rebuys=(p.rebuys||0)+1;
    p.rebuyTotal=(p.rebuyTotal||0)+amt;
    data.rebuys.push({id:uid(),date:new Date().toISOString(),playerId:pid,amount:amt});
    saveData();
    q('#rebuyForm').reset();
    toast('Ребай '+amt+'₽ записан!');
    renderAll();
  });

  q('#exportBtn').addEventListener('click',()=>{
    window.open('https://docs.google.com/spreadsheets/d/1MJEIG7W1VRYfQvCAjzLUEcteKfft-OuPdeoKUKa3r1Y','_blank');
  });

  q('#sortBy').addEventListener('change',renderLeaderboard);

  qq('.tab').forEach(b=>b.addEventListener('click',()=>{
    qq('.tab,.tab-content').forEach(e=>e.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
    if(b.dataset.tab==='admin'&&isAdmin)renderAdmin();
  }));

  if(isAdmin){q('#adminLogin').style.display='none';q('#adminPanel').style.display='block'}
  renderAll();
});

// ---- RENDER ----
function renderAll(){
  renderToday();
  renderLeaderboard();
  renderGameForm();
  renderGamesHistory();
  if(isAdmin)renderAdmin();
}

function renderToday(){
  const c=q('#todayPlayers');
  if(!data.players.length)return c.innerHTML='<div class="empty">Пока нет записей</div>';
  const list=[...data.players].reverse().slice(0,20);
  c.innerHTML=list.map((p,i)=>playerItem(p,i+1,false)).join('');
  q('#totalCount').textContent='Всего: '+data.players.length+' игроков';
}

function renderLeaderboard(){
  const sort=q('#sortBy').value;
  const list=[...data.players];
  list.sort((a,b)=>{
    if(sort==='gamesPlayed')return b.gamesPlayed-a.gamesPlayed||b.points-a.points;
    if(sort==='winRate'){
      const ra=a.gamesPlayed?a.gamesWon/a.gamesPlayed:0;
      const rb=b.gamesPlayed?b.gamesWon/b.gamesPlayed:0;
      return rb-ra||b.points-a.points;
    }
    return b.points-a.points||b.gamesPlayed-a.gamesPlayed;
  });
  const c=q('#leaderboardList');
  if(!list.length)return c.innerHTML='<div class="empty">Нет данных</div>';
  c.innerHTML=list.map((p,i)=>playerItem(p,i+1,false,true)).join('');
}

function playerItem(p,pos,showPhone,full){
  const cls=pos===1?'gold':pos===2?'silver':pos===3?'bronze':'';
  const av=(p.nickname||'?').charAt(0).toUpperCase();
  const ph=showPhone?'<div class="player-phone">'+esc(p.phone)+'</div>':'<div class="player-phone">—</div>';
  const wr=p.gamesPlayed?Math.round(p.gamesWon/p.gamesPlayed*100):0;
  return '<div class="player '+cls+'"><div class="player-info"><span class="player-pos">'+
    pos+'</span><div class="player-avatar">'+av+'</div><div><div class="player-name">'+
    esc(p.nickname)+'</div>'+ph+'</div></div><div class="player-right"><div class="player-pts">'+
    (p.points||0)+'</div><div class="player-info2">'+(p.gamesPlayed||0)+'игр '+
    (p.gamesWon||0)+'поб'+(full?' · '+wr+'%':'')+'</div></div></div>';
}

function renderGameForm(){
  const c=q('#playersCheckboxes'),w=q('#winnerSelect');
  if(!data.players.length){
    c.innerHTML='<div class="empty" style="padding:12px 0">Сначала зарегистрируйте игроков</div>';
    w.innerHTML='<option value="">— нет игроков —</option>';
    return;
  }
  c.innerHTML=data.players.map(p=>'<label class="cb-item"><input type="checkbox" value="'+
    p.id+'">'+esc(p.nickname)+'</label>').join('');
  c.querySelectorAll('input').forEach(cb=>cb.addEventListener('change',function(){
    this.parentElement.classList.toggle('active',this.checked);
    updateWinner();
  }));
  window._pl=data.players;
  updateWinner();
}

function updateWinner(){
  const w=q('#winnerSelect');
  const ck=qq('#playersCheckboxes input:checked');
  w.innerHTML='<option value="">— выберите —</option>';
  ck.forEach(c=>{
    const p=window._pl.find(x=>x.id===c.value);
    if(p)w.innerHTML+='<option value="'+p.id+'">'+esc(p.nickname)+'</option>';
  });
}

function renderGamesHistory(){
  const c=q('#gamesHistory');
  if(!data.games.length)return c.innerHTML='<div class="empty">Нет сыгранных игр</div>';
  const list=[...data.games].reverse().slice(0,20);
  c.innerHTML=list.map(g=>{
    const names=g.players.map(id=>{
      const p=data.players.find(x=>x.id===id);
      return p?p.nickname:'?';
    }).join(', ');
    const w=data.players.find(x=>x.id===g.winner);
    const wn=w?w.nickname:'?';
    const d=new Date(g.date).toLocaleDateString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    return '<div class="game-item"><div class="game-left"><b>'+esc(wn)+'</b> выиграл · '+
      esc(names)+'</div><div class="game-right">'+d+'</div></div>';
  }).join('');
}

function renderAdmin(){
  const c=q('#adminPlayers');
  if(!data.players.length)return c.innerHTML='<div class="empty">Нет игроков</div>';
  c.innerHTML=data.players.map((p,i)=>{
    const av=(p.nickname||'?').charAt(0).toUpperCase();
    return '<div class="player"><div class="player-info"><div class="player-avatar">'+
      av+'</div><div><div class="player-name">'+esc(p.nickname)+
      '</div><div class="player-phone">'+esc(p.phone)+'</div></div></div>'+
      '<div class="player-right"><div class="player-pts">'+(p.points||0)+
      '</div><div class="player-info2">Ребаи: '+(p.rebuys||0)+' · '+
      (p.rebuyTotal||0)+'₽</div></div></div>';
  }).join('');
  const s=q('#rebuyPlayer');
  s.innerHTML='<option value="">— выберите —</option>';
  data.players.forEach(p=>s.innerHTML+='<option value="'+p.id+'">'+esc(p.nickname)+' ('+esc(p.phone)+')</option>');
}
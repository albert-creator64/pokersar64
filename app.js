const GIT_OWNER = 'albert-creator64';
const GIT_REPO = 'pokersar64';
const GIT_PATH = 'data/db.json';
const APP_PASS = 'poker2024';
const ADMIN_KEY = 'poker_admin';

const GIT_TOKEN = 'ghp_' + 'lQcJqVSfk7kbpdDArjZxsNrIa2mrvA24IVFP';
const API = 'https://api.github.com/repos/'+GIT_OWNER+'/'+GIT_REPO+'/contents/'+GIT_PATH;

let isAdmin = !!localStorage.getItem(ADMIN_KEY);
let cache = {players:[],games:[],rebuys:[]};

function q(s){return document.querySelector(s)}
function qq(s){return document.querySelectorAll(s)}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

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

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

async function loadDB(){
  try{
    const r=await fetch(API,{headers:{Authorization:'token '+GIT_TOKEN}});
    const d=await r.json();
    if(!d.content)return;
    const txt=decodeURIComponent(escape(atob(d.content)));
    cache=JSON.parse(txt);
    if(!cache.games)cache.games=[];
    if(!cache.rebuys)cache.rebuys=[];
  }catch(e){cache={players:[],games:[],rebuys:[]}}
}

async function saveDB(){
  try{
    const r=await fetch(API,{headers:{Authorization:'token '+GIT_TOKEN}});
    const d=await r.json();
    const enc=btoa(unescape(encodeURIComponent(JSON.stringify(cache))));
    await fetch(API,{
      method:'PUT',
      headers:{Authorization:'token '+GIT_TOKEN,'Content-Type':'application/json'},
      body:JSON.stringify({message:'update',content:enc,sha:d.sha})
    });
  }catch(e){console.error(e)}
}

function getDateFilter(filter){
  const now=new Date();
  if(filter==='today'){const s=new Date(now);s.setHours(0,0,0,0);return s}
  if(filter==='week'){const s=new Date(now);s.setDate(s.getDate()-7);return s}
  if(filter==='month'){const s=new Date(now);s.setMonth(s.getMonth()-1);return s}
  return null;
}

document.addEventListener('DOMContentLoaded',async()=>{
  await loadDB();
  if(isAdmin){q('#adminLogin').style.display='none';q('#adminPanel').style.display='block'}
  
  q('#phone').addEventListener('blur',function(){this.value=fmtPhone(this.value)});
  q('#phone').addEventListener('input',function(){this.value=this.value.replace(/[^0-9+()\-\s]/g,'')});
  
  q('#registerForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const n=q('#nickname').value.trim(),p=q('#phone').value.trim();
    if(!n)return toast('Введите ник','err');
    if(p.replace(/\D/g,'').length!==11)return toast('Некорректный номер','err');
    await loadDB();
    if(cache.players.find(x=>x.nickname.toLowerCase()===n.toLowerCase()))return toast('Такой ник уже есть','err');
    if(cache.players.find(x=>x.phone===p))return toast('Номер уже зарегистрирован','err');
    cache.players.push({
      id:uid(),nickname:n,phone:p,
      gamesPlayed:0,gamesWon:0,points:0,
      knockouts:0,rebuys:0,rebuyTotal:0,
      createdAt:new Date().toISOString()
    });
    await saveDB();
    q('#registerForm').reset();
    toast('Игрок '+n+' записан!');renderAll();
  });
  
  q('#gameForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const name=q('#gameName').value.trim()||'Без названия';
    const cbs=qq('#playersCheckboxes input:checked'),w=q('#winnerSelect').value;
    if(cbs.length<2)return toast('Минимум 2 игрока','err');
    if(!w)return toast('Выберите победителя','err');
    const ids=Array.from(cbs).map(c=>c.value);
    if(!ids.includes(w))return toast('Победитель среди участников','err');
    
    await loadDB();
    const pts=Math.max(1,Math.floor(100/ids.length));
    
    // Collect knockouts
    const knockouts=[];
    qq('.ko-item').forEach(el=>{
      const by=el.dataset.by;
      const of=el.querySelector('.ko-target')?.value;
      if(by&&of)knockouts.push({by,of});
    });
    
    const koCount={};
    knockouts.forEach(k=>{koCount[k.by]=(koCount[k.by]||0)+1});
    
    cache.players.forEach(p=>{
      if(ids.includes(p.id)){
        p.gamesPlayed=(p.gamesPlayed||0)+1;
        p.points=(p.points||0)+pts+(p.id===w?20:0);
        if(p.id===w)p.gamesWon=(p.gamesWon||0)+1;
        p.knockouts=(p.knockouts||0)+(koCount[p.id]||0);
      }
    });
    
    cache.games.push({
      id:uid(),name,
      date:new Date().toISOString(),
      players:ids,winner:w,
      knockouts
    });
    await saveDB();
    q('#gameForm').reset();
    q('#knockoutSection').style.display='none';
    toast('Игра "'+name+'" записана!');
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
  
  q('#rebuyForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const pid=q('#rebuyPlayer').value,amt=parseInt(q('#rebuyAmount').value);
    if(!pid)return toast('Выберите игрока','err');
    if(!amt||amt<=0)return toast('Введите сумму','err');
    await loadDB();
    const p=cache.players.find(x=>x.id===pid);
    if(p){p.rebuys=(p.rebuys||0)+1;p.rebuyTotal=(p.rebuyTotal||0)+amt}
    cache.rebuys.push({id:uid(),date:new Date().toISOString(),playerId:pid,amount:amt});
    await saveDB();
    q('#rebuyForm').reset();
    toast('Ребай '+amt+' записан!');renderAll();
  });
  
  q('#exportBtn').addEventListener('click',()=>window.open('https://docs.google.com/spreadsheets/d/1MJEIG7W1VRYfQvCAjzLUEcteKfft-OuPdeoKUKa3r1Y','_blank'));
  q('#sortBy').addEventListener('change',renderLeaderboard);
  
  qq('.tab').forEach(b=>b.addEventListener('click',()=>{
    qq('.tab,.tab-content').forEach(e=>e.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
    if(b.dataset.tab==='admin'&&isAdmin)renderAdmin();
  }));
  
  // Date filter buttons
  qq('.filter-btn').forEach(b=>b.addEventListener('click',()=>{
    qq('.filter-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    renderLeaderboard();
  }));
  
  renderAll();
  toast('Данные загружены!');
});

function renderAll(){renderToday();renderLeaderboard();renderGameForm();renderGamesHistory();if(isAdmin)renderAdmin()}

function renderToday(){
  const c=q('#todayPlayers');
  if(!cache.players.length)return c.innerHTML='<div class="empty">Пока нет записей</div>';
  const list=[...cache.players].reverse().slice(0,20);
  c.innerHTML=list.map((p,i)=>playerItem(p,i+1)).join('');
  q('#totalCount').textContent='Всего: '+cache.players.length+' игроков';
}

function renderLeaderboard(){
  const sort=q('#sortBy').value;
  const filter=q('.filter-btn.active')?.dataset?.filter||'all';
  const dateFrom=getDateFilter(filter);
  
  let list=[...cache.players];
  
  // Apply date filter
  if(dateFrom){
    const filteredIds=new Set();
    cache.games.forEach(g=>{
      if(new Date(g.date)>=dateFrom){
        g.players.forEach(id=>filteredIds.add(id));
      }
    });
    list=list.filter(p=>filteredIds.has(p.id));
  }
  
  list.sort((a,b)=>{
    if(sort==='gamesPlayed')return(b.gamesPlayed||0)-(a.gamesPlayed||0)||(b.points||0)-(a.points||0);
    if(sort==='winRate'){
      const ra=a.gamesPlayed?a.gamesWon/a.gamesPlayed:0;
      const rb=b.gamesPlayed?b.gamesWon/b.gamesPlayed:0;
      return rb-ra||(b.points||0)-(a.points||0);
    }
    if(sort==='knockouts')return(b.knockouts||0)-(a.knockouts||0)||(b.points||0)-(a.points||0);
    return(b.points||0)-(a.points||0)||(b.gamesPlayed||0)-(a.gamesPlayed||0);
  });
  
  const c=q('#leaderboardList');
  if(!list.length)return c.innerHTML='<div class="empty">Нет данных</div>';
  c.innerHTML=list.map((p,i)=>playerItem(p,i+1,false,true)).join('');
}

function playerItem(p,pos,showPhone,full){
  const cls=pos===1?'gold':pos===2?'silver':pos===3?'bronze':'';
  const av=(p.nickname||'?').charAt(0).toUpperCase();
  const ph=showPhone?'<div class="player-phone">'+esc(p.phone)+'</div>':'<div class="player-phone">&mdash;</div>';
  const wr=p.gamesPlayed?Math.round(p.gamesWon/p.gamesPlayed*100):0;
  const rebStr=(p.rebuys||0)>0?'<span class="player-rebuys">💰 ребаи: '+(p.rebuys||0)+' · '+(p.rebuyTotal||0)+'</span>':'';
  const koStr=(p.knockouts||0)>0?'<span class="player-rebuys">💀 нокауты: '+(p.knockouts||0)+'</span>':'';
  return '<div class="player '+cls+'"><div class="player-info"><span class="player-pos">'+
    pos+'</span><div class="player-avatar">'+av+'</div><div><div class="player-name">'+
    esc(p.nickname)+'</div>'+ph+rebStr+koStr+'</div></div><div class="player-right"><div class="player-pts">'+
    (p.points||0)+'</div><div class="player-info2">'+(p.gamesPlayed||0)+'игр '+
    (p.gamesWon||0)+'поб'+(full?' · '+wr+'%':'')+'</div></div></div>';
}

function renderGameForm(){
  const c=q('#playersCheckboxes'),w=q('#winnerSelect');
  if(!cache.players.length){
    c.innerHTML='<div class="empty" style="padding:12px 0">Сначала зарегистрируйте игроков</div>';
    w.innerHTML='<option value="">— нет игроков —</option>';
    return;
  }
  c.innerHTML=cache.players.map(p=>'<label class="cb-item"><input type="checkbox" value="'+
    p.id+'">'+esc(p.nickname)+'</label>').join('');
  c.querySelectorAll('input').forEach(cb=>cb.addEventListener('change',function(){
    this.parentElement.classList.toggle('active',this.checked);
    updateWinner();
    updateKnockouts();
  }));
  window._pl=cache.players;
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

function updateKnockouts(){
  const section=q('#knockoutSection');
  const list=q('#knockoutList');
  const ck=qq('#playersCheckboxes input:checked');
  const ids=Array.from(ck).map(c=>c.value);
  if(ids.length<2){section.style.display='none';return}
  section.style.display='block';
  list.innerHTML='';
  const winner=q('#winnerSelect').value;
  ids.forEach(id=>{
    if(id===winner)return;
    const p=window._pl.find(x=>x.id===id);
    if(!p)return;
    const div=document.createElement('div');
    div.className='knockout-item';
    div.dataset.by='';
    div.innerHTML='<span>'+esc(p.nickname)+' выбит игроком:</span>'+
      '<select class="sel ko-target" style="min-width:100px"><option value="">— не выбит —</option></select>'+
      '<button class="btn-sm ko-rm" style="display:none">✕</button>';
    const sel=div.querySelector('.ko-target');
    const otherIds=ids.filter(x=>x!==id);
    otherIds.forEach(oid=>{
      const op=window._pl.find(x=>x.id===oid);
      if(op)sel.innerHTML+='<option value="'+oid+'">'+esc(op.nickname)+'</option>';
    });
    sel.addEventListener('change',function(){
      div.dataset.by=this.value;
      div.querySelector('.ko-rm').style.display=this.value?'inline-block':'none';
    });
    div.querySelector('.ko-rm').addEventListener('click',()=>{sel.value='';div.dataset.by='';div.querySelector('.ko-rm').style.display='none'});
    list.appendChild(div);
  });
}

function renderGamesHistory(){
  const c=q('#gamesHistory');
  if(!cache.games.length)return c.innerHTML='<div class="empty">Нет сыгранных игр</div>';
  const list=[...cache.games].reverse().slice(0,20);
  c.innerHTML=list.map(g=>{
    const names=(g.players||[]).map(id=>{
      const p=cache.players.find(x=>x.id===id);
      return p?p.nickname:'?';
    }).join(', ');
    const w=cache.players.find(x=>x.id===g.winner);
    const wn=w?w.nickname:'?';
    const kotal=(g.knockouts||[]).length;
    const d=new Date(g.date).toLocaleDateString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    const koStr=kotal?'<span style="color:#e74c3c;font-size:11px">💀 '+kotal+' нокаутов</span>':'';
    return '<div><div class="game-name">'+esc(g.name||'Без названия')+'</div>'+
      '<div class="game-item"><div class="game-left"><b>'+esc(wn)+'</b> выиграл · '+
      esc(names)+'</div><div class="game-right">'+d+'<br>'+koStr+'</div></div></div>';
  }).join('');
}

function renderAdmin(){
  const c=q('#adminPlayers');
  if(!cache.players.length)return c.innerHTML='<div class="empty">Нет игроков</div>';
  c.innerHTML=cache.players.map(p=>{
    const av=(p.nickname||'?').charAt(0).toUpperCase();
    return '<div class="player"><div class="player-info"><div class="player-avatar">'+
      av+'</div><div><div class="player-name">'+esc(p.nickname)+
      '</div><div class="player-phone">'+esc(p.phone)+'</div></div></div>'+
      '<div class="player-right"><div class="player-pts">'+(p.points||0)+
      '</div><div class="player-info2">Нокауты: '+(p.knockouts||0)+' · Ребаи: '+
      (p.rebuys||0)+' · '+(p.rebuyTotal||0)+'</div></div></div>';
  }).join('');
  const s=q('#rebuyPlayer');
  s.innerHTML='<option value="">— выберите —</option>';
  cache.players.forEach(p=>s.innerHTML+='<option value="'+p.id+'">'+esc(p.nickname)+' ('+esc(p.phone)+')</option>');
}
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDtsW8-M4hRqdrn1tNu42Zn-r-TIWu74D0",
  authDomain: "pokerlounge-a1f7d.firebaseapp.com",
  projectId: "pokerlounge-a1f7d",
  storageBucket: "pokerlounge-a1f7d.firebasestorage.app",
  messagingSenderId: "386501027881",
  appId: "1:386501027881:web:0a6743bc3b1e43f9fed438"
};

const APP_PASS = 'poker2024';
const ADMIN_KEY = 'poker_admin';

let isAdmin = !!localStorage.getItem(ADMIN_KEY);

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

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

document.addEventListener('DOMContentLoaded',()=>{
  if(isAdmin){q('#adminLogin').style.display='none';q('#adminPanel').style.display='block'}

  q('#phone').addEventListener('blur',function(){this.value=fmtPhone(this.value)});
  q('#phone').addEventListener('input',function(){this.value=this.value.replace(/[^0-9+()\-\s]/g,'')});

  q('#registerForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const n=q('#nickname').value.trim(),p=q('#phone').value.trim();
    if(!n)return toast('Введите ник','err');
    if(p.replace(/\D/g,'').length!==11)return toast('Некорректный номер','err');
    const snap=await db.collection('players').where('nickname','==',n).get();
    if(!snap.empty)return toast('Такой ник уже есть','err');
    const snap2=await db.collection('players').where('phone','==',p).get();
    if(!snap2.empty)return toast('Номер уже зарегистрирован','err');
    await db.collection('players').add({
      nickname:n,phone:p,
      gamesPlayed:0,gamesWon:0,points:0,
      rebuys:0,rebuyTotal:0,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    q('#registerForm').reset();
    toast('Игрок '+n+' записан!');
  });

  q('#gameForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const cbs=qq('#playersCheckboxes input:checked'),w=q('#winnerSelect').value;
    if(cbs.length<2)return toast('Минимум 2 игрока','err');
    if(!w)return toast('Выберите победителя','err');
    const ids=Array.from(cbs).map(c=>c.value);
    if(!ids.includes(w))return toast('Победитель среди участников','err');
    const pts=Math.max(1,Math.floor(100/ids.length));
    const batch=db.batch();
    ids.forEach(id=>{
      const ref=db.collection('players').doc(id);
      batch.update(ref,{
        gamesPlayed:firebase.firestore.FieldValue.increment(1),
        points:firebase.firestore.FieldValue.increment(pts+(id===w?20:0)),
        gamesWon:firebase.firestore.FieldValue.increment(id===w?1:0)
      });
    });
    await batch.commit();
    await db.collection('games').add({
      date:firebase.firestore.FieldValue.serverTimestamp(),
      players:ids,winner:w
    });
    toast('Игра записана!');
  });

  q('#adminForm').addEventListener('submit',e=>{
    e.preventDefault();
    if(q('#adminPass').value===APP_PASS){
      localStorage.setItem(ADMIN_KEY,'1');isAdmin=true;
      q('#adminLogin').style.display='none';q('#adminPanel').style.display='block';
      toast('Добро пожаловать!');
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
    await db.collection('players').doc(pid).update({
      rebuys:firebase.firestore.FieldValue.increment(1),
      rebuyTotal:firebase.firestore.FieldValue.increment(amt)
    });
    await db.collection('rebuys').add({
      date:firebase.firestore.FieldValue.serverTimestamp(),
      playerId:pid,amount:amt
    });
    q('#rebuyForm').reset();
    toast('Ребай '+amt+' записан!');
  });

  q('#exportBtn').addEventListener('click',()=>{
    window.open('https://docs.google.com/spreadsheets/d/1MJEIG7W1VRYfQvCAjzLUEcteKfft-OuPdeoKUKa3r1Y','_blank');
  });

  q('#sortBy').addEventListener('change',renderLeaderboard);

  qq('.tab').forEach(b=>b.addEventListener('click',()=>{
    qq('.tab,.tab-content').forEach(e=>e.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
  }));

  // Real-time listeners
  db.collection('players').orderBy('createdAt','desc').onSnapshot(snap=>{
    const list=[];
    snap.forEach(d=>list.push({id:d.id,...d.data()}));
    renderToday(list);
    renderGameForm(list);
    if(isAdmin)renderAdmin(list);
  });

  db.collection('players').onSnapshot(()=>{
    renderLeaderboard();
    renderGamesHistory();
  });

  db.collection('games').orderBy('date','desc').onSnapshot(()=>{
    renderGamesHistory();
  });
});

async function getPlayers(){
  const snap=await db.collection('players').get();
  const list=[];
  snap.forEach(d=>list.push({id:d.id,...d.data()}));
  return list;
}

async function renderToday(list){
  const c=q('#todayPlayers');
  if(!list||!list.length)return c.innerHTML='<div class="empty">Пока нет записей</div>';
  c.innerHTML=list.slice(0,20).map((p,i)=>playerItem(p,i+1,false)).join('');
  q('#totalCount').textContent='Всего: '+list.length+' игроков';
}

async function renderLeaderboard(){
  const list=await getPlayers();
  const sort=q('#sortBy').value;
  list.sort((a,b)=>{
    if(sort==='gamesPlayed')return (b.gamesPlayed||0)-(a.gamesPlayed||0)||(b.points||0)-(a.points||0);
    if(sort==='winRate'){
      const ra=a.gamesPlayed?a.gamesWon/a.gamesPlayed:0;
      const rb=b.gamesPlayed?b.gamesWon/b.gamesPlayed:0;
      return rb-ra||(b.points||0)-(a.points||0);
    }
    return (b.points||0)-(a.points||0)||(b.gamesPlayed||0)-(a.gamesPlayed||0);
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

function renderGameForm(list){
  const c=q('#playersCheckboxes'),w=q('#winnerSelect');
  if(!list||!list.length){
    c.innerHTML='<div class="empty" style="padding:12px 0">Сначала зарегистрируйте игроков</div>';
    w.innerHTML='<option value="">— нет игроков —</option>';
    return;
  }
  c.innerHTML=list.map(p=>'<label class="cb-item"><input type="checkbox" value="'+
    p.id+'">'+esc(p.nickname)+'</label>').join('');
  c.querySelectorAll('input').forEach(cb=>cb.addEventListener('change',function(){
    this.parentElement.classList.toggle('active',this.checked);
    updateWinner();
  }));
  window._pl=list;
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

async function renderGamesHistory(){
  const c=q('#gamesHistory');
  const snap=await db.collection('games').orderBy('date','desc').limit(20).get();
  if(snap.empty)return c.innerHTML='<div class="empty">Нет сыгранных игр</div>';
  const games=[];
  snap.forEach(d=>games.push({id:d.id,...d.data()}));
  const players=await getPlayers();
  c.innerHTML=games.map(g=>{
    const names=(g.players||[]).map(id=>{
      const p=players.find(x=>x.id===id);
      return p?p.nickname:'?';
    }).join(', ');
    const w=players.find(x=>x.id===g.winner);
    const wn=w?w.nickname:'?';
    const d=g.date?.toDate ? g.date.toDate().toLocaleDateString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
    return '<div class="game-item"><div class="game-left"><b>'+esc(wn)+'</b> выиграл · '+
      esc(names)+'</div><div class="game-right">'+d+'</div></div>';
  }).join('');
}

function renderAdmin(list){
  const c=q('#adminPlayers');
  if(!list||!list.length)return c.innerHTML='<div class="empty">Нет игроков</div>';
  c.innerHTML=list.map(p=>{
    const av=(p.nickname||'?').charAt(0).toUpperCase();
    return '<div class="player"><div class="player-info"><div class="player-avatar">'+
      av+'</div><div><div class="player-name">'+esc(p.nickname)+
      '</div><div class="player-phone">'+esc(p.phone)+'</div></div></div>'+
      '<div class="player-right"><div class="player-pts">'+(p.points||0)+
      '</div><div class="player-info2">Ребаи: '+(p.rebuys||0)+' · '+
      (p.rebuyTotal||0)+'</div></div></div>';
  }).join('');
  const s=q('#rebuyPlayer');
  s.innerHTML='<option value="">— выберите —</option>';
  list.forEach(p=>s.innerHTML+='<option value="'+p.id+'">'+esc(p.nickname)+' ('+esc(p.phone)+')</option>');
}
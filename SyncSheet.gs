// РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РґР°РЅРЅС‹С… РёР· GitHub РІ Google РўР°Р±Р»РёС†Сѓ
// Р—Р°РїСѓСЃРєР°С‚СЊ РјРѕР¶РЅРѕ РІСЂСѓС‡РЅСѓСЋ РёР»Рё РїРѕ С‚Р°Р№РјРµСЂСѓ (РєР°Р¶РґС‹Рµ 5 РјРёРЅСѓС‚)

const SHEET_ID = '1MJEIG7W1VRYfQvCAjzLUEcteKfft-OuPdeoKUKa3r1Y';
const GIT_URL = 'https://api.github.com/repos/albert-creator64/pokersar64/contents/data/db.json';

function doGet() {
  syncData();
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function syncData() {
  const json = fetchGitHubData();
  if (!json) return;
  const data = JSON.parse(json);
  
  writePlayers(data.players || []);
  writeGames(data.games || []);
  writeRebuys(data.rebuys || []);
  writeStats(data.players || []);
}

function fetchGitHubData() {
  try {
    const resp = UrlFetchApp.fetch(GIT_URL, { muteHttpExceptions: true });
    const result = JSON.parse(resp.getContentText());
    if (!result.content) return null;
    return Utilities.newBlob(Utilities.base64Decode(result.content)).getDataAsString();
  } catch (e) {
    console.error('GitHub fetch error: ' + e);
    return null;
  }
}

function writePlayers(players) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('РРіСЂРѕРєРё');
  if (!sheet) { sheet = ss.insertSheet('РРіСЂРѕРєРё'); }
  
  const headers = [['ID', 'РќРёРєРЅРµР№Рј', 'РўРµР»РµС„РѕРЅ', 'РРіСЂ СЃС‹РіСЂР°РЅРѕ', 'РџРѕР±РµРґ', 'РћС‡РєРё', 'Р РµР±Р°Рё', 'РЎСѓРјРјР° СЂРµР±Р°РµРІ', 'Р”Р°С‚Р° СЂРµРіРёСЃС‚СЂР°С†РёРё']];
  sheet.clear();
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');
  
  if (players.length === 0) return;
  
  const rows = players.map(p => [
    p.id || '', p.nickname || '', p.phone || '',
    p.gamesPlayed || 0, p.gamesWon || 0, p.points || 0,
    p.rebuys || 0, p.rebuyTotal || 0,
    p.createdAt ? new Date(p.createdAt).toLocaleString('ru-RU') : ''
  ]);
  
  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.autoResizeColumns(1, headers[0].length);
}

function writeGames(games) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('РРіСЂС‹');
  if (!sheet) { sheet = ss.insertSheet('РРіСЂС‹'); }
  
  const headers = [['ID', 'Р”Р°С‚Р°', 'РРіСЂРѕРєРё', 'РџРѕР±РµРґРёС‚РµР»СЊ']];
  sheet.clear();
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');
  
  if (games.length === 0) return;
  
  const players = getPlayersMap();
  
  const rows = games.map(g => {
    const names = (g.players || []).map(id => players[id] || id).join(', ');
    const winner = players[g.winner] || g.winner;
    return [
      g.id || '',
      g.date ? new Date(g.date).toLocaleString('ru-RU') : '',
      names,
      winner
    ];
  });
  
  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.autoResizeColumns(1, headers[0].length);
}

function writeRebuys(rebuys) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Р РµР±Р°Рё');
  if (!sheet) { sheet = ss.insertSheet('Р РµР±Р°Рё'); }
  
  const headers = [['ID', 'Р”Р°С‚Р°', 'РРіСЂРѕРє', 'РЎСѓРјРјР°']];
  sheet.clear();
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');
  
  if (rebuys.length === 0) return;
  
  const players = getPlayersMap();
  
  const rows = rebuys.map(r => [
    r.id || '',
    r.date ? new Date(r.date).toLocaleString('ru-RU') : '',
    players[r.playerId] || r.playerId,
    r.amount || 0
  ]);
  
  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.autoResizeColumns(1, headers[0].length);
}

function writeStats(players) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('РЎС‚Р°С‚РёСЃС‚РёРєР°');
  if (!sheet) { sheet = ss.insertSheet('РЎС‚Р°С‚РёСЃС‚РёРєР°'); }
  
  const headers = [['РњРµСЃС‚Рѕ', 'РќРёРєРЅРµР№Рј', 'РћС‡РєРё', 'РРіСЂС‹', 'РџРѕР±РµРґС‹', '% РїРѕР±РµРґ', 'Р РµР±Р°Рё', 'РЎСѓРјРјР° СЂРµР±Р°РµРІ']];
  sheet.clear();
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');
  
  const sorted = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
  
  if (sorted.length === 0) return;
  
  const rows = sorted.map((p, i) => [
    i + 1,
    p.nickname || '',
    p.points || 0,
    p.gamesPlayed || 0,
    p.gamesWon || 0,
    p.gamesPlayed ? Math.round(p.gamesWon / p.gamesPlayed * 100) + '%' : '0%',
    p.rebuys || 0,
    p.rebuyTotal || 0
  ]);
  
  sheet.getRange(2, 1, rows.length, headers[0].length).setValues(rows);
  sheet.autoResizeColumns(1, headers[0].length);
}

function getPlayersMap() {
  try {
    const json = fetchGitHubData();
    if (!json) return {};
    const data = JSON.parse(json);
    const map = {};
    (data.players || []).forEach(p => { map[p.id] = p.nickname; });
    return map;
  } catch (e) {
    return {};
  }
}

// Р¤СѓРЅРєС†РёСЏ РґР»СЏ СЂСѓС‡РЅРѕРіРѕ Р·Р°РїСѓСЃРєР° РёР· СЂРµРґР°РєС‚РѕСЂР°
function manualSync() {
  syncData();
  SpreadsheetApp.flush();
}


/* V10 Final GRP Family UI + displayed-ID dashboard fix */
let state = { view: 'statisticsTab', data: {}, open: false };
let viewHistory = [];
let familyTab = 'home';
let battlePassTab = 'rewards';
let viewRequestSeq = 0;
let activeViewRequest = 0;
let darkStoreCategory = 'featured';
let darkStoreSelected = null;

function applyMenuScale(value) {
  uiSettings.ui_scale = Math.max(80, Math.min(130, Number(value || 100)));
  document.documentElement.style.fontSize = '100%';
  document.body.style.zoom = '1';

  const menuApp = document.getElementById('app');
  if (menuApp) menuApp.style.zoom = String(uiSettings.ui_scale / 100);
}
let uiSettings = {
  ui_scale:100, hud_scale:100, hud_enabled:true, minimap_mode:'vehicle',
  notification_position:'bottom-right', notification_sound:true,
  graphics_preset:'balanced', chat_visible:true, chat_scale:100, chat_vertical:0,
  damage_indicator:true, vehicle_hud:true, auto_seatbelt:false
};
function setFamilyTab(tab){ familyTab = tab || 'home'; render(); }
window.setFamilyTab = setFamilyTab;
function setBattlePassTab(tab){ battlePassTab = tab || 'rewards'; render(); }
function battlePassClaim(rewardId){ action('bp_claim',{ rewardId:Number(rewardId||0) }); }
function battlePassClaimAll(){ action('bp_claim_all',{}); }
window.setBattlePassTab = setBattlePassTab;
window.battlePassClaim = battlePassClaim;
window.battlePassClaimAll = battlePassClaimAll;
function setDarkStoreCategory(category){ darkStoreCategory = String(category || 'featured'); darkStoreSelected = null; render(); }
function openDarkStoreProduct(productKey){ darkStoreSelected = String(productKey || ''); render(); }
function closeDarkStoreProduct(){ darkStoreSelected = null; render(); }
function buyDarkStoreProduct(productKey){ darkStoreSelected = null; action('store_purchase',{ productKey:String(productKey || '') }); }
window.setDarkStoreCategory = setDarkStoreCategory;
window.openDarkStoreProduct = openDarkStoreProduct;
window.closeDarkStoreProduct = closeDarkStoreProduct;
window.buyDarkStoreProduct = buyDarkStoreProduct;
function copyReferralCode(code){
  code = String(code || '');
  if(!code) return;
  const fallback = () => {
    const el = document.createElement('textarea');
    el.value = code; el.style.position='fixed'; el.style.opacity='0';
    document.body.appendChild(el); el.select();
    try { document.execCommand('copy'); } catch(e) {}
    el.remove();
  };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(code).catch(fallback); } else fallback();
  const tag = document.getElementById('referralCopyState');
  if(tag){ tag.textContent='COPIED'; setTimeout(()=>{ if(tag) tag.textContent='COPY CODE'; },1200); }
}
window.copyReferralCode = copyReferralCode;

const menuTabs = [
  { id:'statisticsTab', label:'Statistics', icon:'📊', sub:'Overview & level' },
  { id:'darkStore', label:'Dark Store', icon:'🛒', sub:'Premium shop' },
  { id:'familyMenu', label:'Family Menu', icon:'👨‍👩‍👧', sub:'Family control' },
  { id:'organization', label:'Faction', icon:'🛡️', sub:'Organization or gang' },
  { id:'jobs', label:'Jobs', icon:'💼', sub:'Civilian work' },
  { id:'realEstate', label:'Real Estate', icon:'🏠', sub:'Homes & business' },
  { id:'business', label:'Business', icon:'🏪', sub:'Manage your shop' },
  { id:'settings', label:'Settings', icon:'⚙️', sub:'Preferences' },
  { id:'battlePass', label:'Battle Pass', icon:'🎖️', sub:'Season rewards' },
  { id:'dailyReward', label:'Daily Reward', icon:'🎁', sub:'Online rewards' },
  { id:'achievement', label:'Achievement', icon:'🏆', sub:'Your milestones' },
  { id:'contactAdmin', label:'Contact Admin', icon:'🆘', sub:'Support & reports' },
  { id:'referral', label:'Referral', icon:'🤝', sub:'Invite friends' },
  { id:'prime', label:'Prime', icon:'💎', sub:'Prime benefits' }
];
const tabMeta = Object.fromEntries(menuTabs.map(t => [t.id, t]));

const businessPhotos = ['0.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png','11.png','12.png','13.png','15.png','16.png','17.png','19.png','20.png','21.png'];

const jobs = [
  // Existing Dark City jobs
  { id:'trucker', label:'Trucker', desc:'Heavy cargo and city delivery route', x:1209.73, y:-3114.37, z:5.54, cmd:'trucker', img:'truckersMenu/items/trucker-car-0.png' },
  { id:'bus', label:'Bus Driver', desc:'Public transport job point', x:462.22, y:-641.15, z:28.45, cmd:'bus', img:'optionsMenu/informationTab/works/busdriver.png' },

  // Sprint 2 civilian jobs
  { id:'fishing', label:'Fishing', desc:'Catch fish at the beach/pier fishing zone', x:-1848.20, y:-1190.40, z:13.02, cmd:'fishing', img:'newhud/fishzone.svg' },
  { id:'mining', label:'Mining', desc:'Mine stone and ore at quarry', x:2943.85, y:2747.23, z:43.33, cmd:'mining', img:'optionsMenu/informationTab/works/miner.png' },
  { id:'lumber', label:'Lumberjack', desc:'Cut trees and collect wood', x:-552.85, y:5348.64, z:74.74, cmd:'lumber', img:'optionsMenu/informationTab/works/loader.png' },
  { id:'garbage', label:'Garbage Collector', desc:'Collect city garbage route', x:-321.55, y:-1545.86, z:31.02, cmd:'garbage', img:'optionsMenu/informationTab/works/loader.png' },
  { id:'postal', label:'Postal Delivery', desc:'Deliver parcels around the city', x:78.77, y:112.56, z:81.17, cmd:'postal', img:'optionsMenu/informationTab/works/truckdriver.png' },
  { id:'farmingv2', label:'Farming V2', desc:'Harvest crops at Grapeseed farm', x:2016.76, y:4987.63, z:42.10, cmd:'farming', img:'optionsMenu/informationTab/works/farmer.png' },
];

function asset(p){ return 'img/' + p; }
function post(name, data = {}) {
  return fetch(`https://${GetParentResourceName()}/${name}`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  }).then(r => r.text()).then(t => {
    try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; }
  }).catch(e => {
    console.log('[dc-core-ui] NUI post failed', name, e);
    return {};
  });
}
function jsArg(v){
  const s = String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `'${s}'`;
}
function money(n){ n = Number(n || 0); return '$' + n.toLocaleString(); }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function settingBool(v, fallback=false){ if(v===undefined||v===null||v==='') return fallback; return ['1','true','yes','on'].includes(String(v).toLowerCase()); }
function visiblePlayerId(v){ return esc(v || 0); }
function toggleSettingsPanel(id){ const el=document.getElementById(id); if(el) el.classList.toggle('hidden'); }
window.toggleSettingsPanel = toggleSettingsPanel;

function previewHudScale(value){
  const scale = Math.max(70, Math.min(130, Number(value || 100)));
  uiSettings.hud_scale = scale;
  const hudRoot = document.getElementById('hud');
  const hudShell = document.getElementById('p1hud');
  if (hudRoot) hudRoot.style.setProperty('--hud-scale', String(scale / 100));
  if (hudShell) hudShell.style.setProperty('--hud-scale', String(scale / 100));
}
window.previewHudScale = previewHudScale;

function xpNeedForLevel(level){ level = Number(level || 1); return Math.floor(1000 * Math.pow(1.25, Math.max(0, level - 1))); }
function pct(value, max){ value = Number(value || 0); max = Math.max(1, Number(max || 1)); return Math.max(0, Math.min(100, Math.floor((value / max) * 100))); }
function jobLabelFromId(id){ const j = jobs.find(x => String(x.id) === String(id) || String(x.cmd) === String(id)); return j ? j.label : String(id || 'Job'); }

function fmtTimeLeft(sec){ sec = Math.max(0, Number(sec || 0)); const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=Math.floor(sec%60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

function closeUi(){
  viewHistory = [];
  post('close');
}
function switchView(v, options = {}){
  const targetView = String(v || 'home');
  const previousView = String(state.view || '');
  const shouldRecord = options.record !== false && previousView && previousView !== targetView &&
    !['auth','spawnSelect','customization','deathScreen'].includes(previousView);
  if (shouldRecord) {
    viewHistory.push(previousView);
    if (viewHistory.length > 24) viewHistory.shift();
  }

  const seq = ++viewRequestSeq;
  activeViewRequest = seq;
  state.view = targetView;
  if (targetView === 'familyMenu') state.data = { loading:true };
  render();
  post('switchView', { view: targetView, requestSeq: seq });
  if (targetView === 'familyMenu') {
    post('getData', { view: targetView, requestSeq: seq }).then(r => {
      if (seq !== activeViewRequest || state.view !== targetView) return;
      if (r && r.data) { state.data = r.data; render(); }
    });
  }
}
function goBack(){
  const previousView = viewHistory.pop();
  if (previousView) switchView(previousView, { record:false });
  else if (state.view !== 'home') switchView('home', { record:false });
  else closeUi();
}
function goHome(){
  viewHistory = [];
  if (state.view !== 'home') switchView('home', { record:false });
}
function globalNav(homeScreen = false){
  return `<div class="dc-global-nav" role="navigation" aria-label="Menu navigation">
    <button type="button" onclick="goBack()" ${homeScreen ? 'disabled aria-disabled="true"' : ''}>← BACK</button>
    <button type="button" class="dc-nav-home" onclick="goHome()">🏠 HOME</button>
    <small>ESC ${homeScreen ? 'CLOSE' : 'BACK'}</small>
    <button type="button" class="dc-nav-close" onclick="closeUi()">✕ CLOSE</button>
  </div>`;
}
function openOrgUI(){ post('openOrg'); }
function setWaypointUI(x, y, label){ post('setWaypoint', { x, y, label }); }
function dailyStart(tier){ post('dailyStart', { tier }); setTimeout(() => switchView('dailyReward'), 600); }
function spawnSelectUI(id){
  id = String(id || 'last');
  console.log('[dc-core-ui] spawn click:', id);

  const hideSpawnScreen = () => {
    state.open = false;
    document.getElementById('app')?.classList.add('hidden');
  };

  // Hide immediately; the Lua callback performs the teleport asynchronously.
  // Waiting for that callback would leave every card stuck on SPAWNING... if
  // the server or another resource delays its response.
  hideSpawnScreen();

  post('spawnSelect', { id }).then(result => {
    if (result && result.ok === true) { hideSpawnScreen(); return result; }
    return post('selectSpawn', { id });
  }).then(result => {
    if (result && result.ok === true) { hideSpawnScreen(); return result; }
    return post('spawn_select', { id });
  }).then(result => {
    if (result && result.ok === true) { hideSpawnScreen(); return; }
    if (!result || result.ok !== true) {
      document.querySelectorAll('[data-dc-spawn]').forEach(el => {
        delete el.dataset.dcBusy;
        if (el.tagName === 'BUTTON') {
          el.disabled = false;
          el.textContent = 'Spawn Here';
        }
      });
    }
  });
}
window.spawnSelectUI = spawnSelectUI;
window.closeUi = closeUi;
window.switchView = switchView;
window.goBack = goBack;
window.goHome = goHome;
window.openOrgUI = openOrgUI;
window.setWaypointUI = setWaypointUI;
window.dailyStart = dailyStart;
window.action = action;


function applySettingSelectionInstantly(key, value, clickedElement) {
  const normalizedKey = String(key || '');
  const normalizedValue = String(value ?? '');

  state.data = state.data || {};
  state.data.options = state.data.options || {};
  state.data.options[normalizedKey] = normalizedValue;

  if (typeof uiSettings === 'object' && uiSettings) {
    uiSettings[normalizedKey] = normalizedValue;
  }

  if (clickedElement) {
    const container = clickedElement.closest('.setting-segments');
    if (container) {
      container.querySelectorAll('[data-setting-key]').forEach(button => {
        button.classList.toggle(
          'active',
          button.getAttribute('data-setting-key') === normalizedKey &&
          String(button.getAttribute('data-setting-value')) === normalizedValue
        );
      });
    }

    if (clickedElement.classList.contains('setting-toggle')) {
      const enabled = normalizedValue === 'true';
      clickedElement.classList.toggle('on', enabled);
      const label = clickedElement.querySelector('b');
      if (label) label.textContent = enabled ? 'ON' : 'OFF';
      clickedElement.setAttribute('data-setting-value', enabled ? 'false' : 'true');
    }
  }

  try {
    localStorage.setItem(`dc-setting:${normalizedKey}`, normalizedValue);
  } catch (_) {}
}

document.addEventListener('click', function(event) {
  const spawnTarget = event.target.closest('[data-dc-spawn]');
  if (spawnTarget) {
    event.preventDefault();
    event.stopPropagation();

    if (spawnTarget.dataset.dcBusy === '1') return;
    const spawnId = spawnTarget.getAttribute('data-dc-spawn') || 'last';

    document.querySelectorAll('[data-dc-spawn]').forEach(el => {
      el.dataset.dcBusy = '1';
      if (el.tagName === 'BUTTON') {
        el.disabled = true;
        el.textContent = 'SPAWNING...';
      }
    });

    window.spawnSelectUI(spawnId);
    return;
  }

  const settingTarget = event.target.closest('[data-setting-key]');
  if (settingTarget) {
    event.preventDefault();

    const key = settingTarget.getAttribute('data-setting-key') || '';
    const inputId = settingTarget.getAttribute('data-setting-input');
    let value = settingTarget.getAttribute('data-setting-value');

    if (inputId) {
      const input = document.getElementById(inputId);
      value = input ? input.value : value;
    }

    if (key) {
      applySettingSelectionInstantly(key, value, settingTarget);
      action('setting_save', { key, value });
    }
  }
});


function action(a, data = {}) {
  if (a === 'setting_reset_defaults') {
    try {
      ['minimap_mode','notification_position','graphics_preset','ui_scale','hud_scale','chat_scale','chat_vertical'].forEach(key => localStorage.removeItem(`dc-setting:${key}`));
    } catch (_) {}
    previewHudScale(100);
    applyMenuScale(100);
    post('action', { action: a, data });
    return;
  }
  if (a === 'setting_save') {
    const key = String(data.key || '');
    const value = data.value;
    if (key) {
      if (['hud_enabled','notification_sound','chat_visible','damage_indicator','vehicle_hud','auto_seatbelt'].includes(key)) {
        uiSettings[key] = settingBool(value, false);
      } else if (['ui_scale','hud_scale','chat_scale','chat_vertical'].includes(key)) {
        uiSettings[key] = Number(value || (key === 'chat_vertical' ? 0 : 100));
      } else {
        uiSettings[key] = String(value);
      }
      if (key === 'ui_scale') applyMenuScale(uiSettings.ui_scale);
      if (state.view === 'settings') render();
    }
    post('action', { action: a, data });
    return;
  }
  post('action', { action: a, data });
  if (a === 'business_buy') {
    setTimeout(() => switchView('business'), 650);
    return;
  }
  if (a === 'store_purchase') {
    setTimeout(() => post('getData', { view:'darkStore' }).then(r => {
      if (r && r.data) { state.view = 'darkStore'; state.data = r.data; render(); }
    }), 900);
    return;
  }
  if (a === 'prime_purchase' || a === 'prime_claim_daily') {
    setTimeout(() => post('getData', { view:'prime' }).then(r => {
      if (r && r.data) { state.view = 'prime'; state.data = r.data; render(); }
    }), a === 'prime_purchase' ? 1100 : 750);
    return;
  }
  if (!['set_waypoint','auth_ok','create_character'].includes(a)) {
    const delay = String(a).startsWith('family_') ? 1200 : 350;
    const view = String(a).startsWith('family_') ? 'familyMenu' : state.view;
    setTimeout(() => post('getData', { view }).then(r => {
      if (r.data) { state.view = view; state.data = r.data; render(); }
    }), delay);
  }
}

window.addEventListener('message', e => {
  const m = e.data || {};
  if (m.action === 'open') {
    viewHistory = [];
    state.open = true;
    const requestedView = String(m.view || '');
    state.view = (requestedView === 'spawnSelect' || requestedView === 'auth' || requestedView === 'customization' || requestedView === 'deathScreen')
      ? requestedView : 'home';
    state.data = m.data || {};
    document.getElementById('app').classList.remove('hidden');
    render();
  }
  if (m.action === 'close') {
    viewHistory = [];
    state.open = false;
    document.getElementById('app').classList.add('hidden');
  }
  if (m.action === 'data') {
    const incomingView = m.view || state.view;
    // Never allow a delayed Battle Pass/Prime/store callback to replace the page the player is viewing.
    if (state.open && incomingView !== state.view) return;
    state.data = m.data || {};
    render();
  }
  // Phase 1 HUD is rendered by phase1_hud.js; keep legacy renderer disabled to avoid DOM replacement/flicker.
  if (m.action === 'hud') { /* handled by phase1_hud.js */ }
  if (m.action === 'hudVisible') document.getElementById('hud').classList.toggle('hidden', !m.value);
  if (m.action === 'setting') {
    if (m.key === 'ui_scale') {
      applyMenuScale(m.value);
    }
    if (m.key === 'hud_scale') previewHudScale(m.value);
    if (m.key === 'privacy_hide_id') uiSettings.privacy_hide_id = m.value === true || settingBool(m.value, false);
    if (m.key === 'player_id_display') uiSettings.player_id_display = m.value === true || settingBool(m.value, true);
    if (m.key === 'streamer_mode') uiSettings.streamer_mode = m.value === true || settingBool(m.value, false);
    if (m.key === 'vehicle_hud') uiSettings.vehicle_hud = m.value === true || settingBool(m.value, true);
    if (state.open && ['privacy_hide_id','player_id_display','streamer_mode'].includes(m.key)) render();
  }
  if (m.action === 'deathOff' && state.view === 'deathScreen') closeUi();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !state.open) return;
  e.preventDefault();
  if (state.view === 'home' || ['auth','spawnSelect','customization','deathScreen'].includes(state.view)) closeUi();
  else goBack();
});

function nav(){
  const homeButton = `<button class="navbtn dc-nav-home-entry" onclick="goHome()"><span class="navicon">🏠</span><span class="navcopy"><b>Home</b><small>Main dashboard</small></span></button>`;
  return homeButton + menuTabs.map((tab, index) => `
    <button class="navbtn ${state.view === tab.id ? 'active' : ''}" onclick="switchView('${tab.id}')">
      <span class="navicon">${String(index + 1).padStart(2,'0')}</span>
      <span class="navcopy"><b>${tab.label}</b><small>${tab.sub}</small></span>
    </button>`).join('');
}
function pageBg(view){
  const map = {
    statisticsTab: 'm-menu/ai/profile.webp',
    darkStore: 'newDonateShop/header_bg.svg',
    familyMenu: 'm-menu/ai/family-members.webp',
    organization: 'm-menu/ai/faction-missions.webp',
    jobs: 'm-menu/ai/jobs.webp',
    realEstate: 'homePurchase/layer.png',
    business: 'm-menu/ai/business-finance.webp',
    settings: 'm-menu/ai/graphics-audio.webp',
    battlePass: 'battlegroundReg/bg.png',
    dailyReward: 'm-menu/ai/daily-rewards.webp',
    achievement: 'm-menu/ai/achievements.webp',
    contactAdmin: 'm-menu/ai/admin-support.webp',
    referral: 'm-menu/ai/referral.webp',
    prime: 'newDonateShop/header_bg.svg',
    auth: 'newauth/bg-home.jpg',
    spawnSelect: 'spawnSelect/bg-home.jpg',
    customization: 'newcustomization/bg-home.jpg',
    deathScreen: 'deathScreen/blood.png'
  };
  return map[view] || 'optionsMenu/bg.png';
}
function showSidebar(){ return !['home','auth','spawnSelect','customization','deathScreen'].includes(state.view); }

function applyLuxuryImages(){
  const content=document.getElementById('content');
  if(!content || String(state.view||'')==='realEstate') return;
  const maps={"familyMenu": ["m-menu/family/overview.jpg", "m-menu/family/members.jpg", "m-menu/family/ranks.jpg", "m-menu/family/territory.jpg", "m-menu/family/storage.jpg", "m-menu/family/vehicles.jpg", "m-menu/family/logs.jpg", "m-menu/family/settings.jpg"], "organization": ["m-menu/faction/overview.jpg", "m-menu/faction/members.jpg", "m-menu/faction/ranks.jpg", "m-menu/faction/missions.jpg", "m-menu/faction/territory.jpg", "m-menu/faction/vehicles.jpg", "m-menu/faction/storage.jpg", "m-menu/faction/logs.jpg", "m-menu/faction/settings.jpg"], "jobs": ["m-menu/jobs/overview.jpg", "m-menu/jobs/available.jpg", "m-menu/jobs/active.jpg", "m-menu/jobs/progress.jpg", "m-menu/jobs/rewards.jpg", "m-menu/jobs/history.jpg"], "business": ["m-menu/business/overview.jpg", "m-menu/business/employees.jpg", "m-menu/business/finance.jpg", "m-menu/business/products.jpg", "m-menu/business/orders.jpg", "m-menu/business/storage.jpg", "m-menu/business/upgrades.jpg", "m-menu/business/logs.jpg", "m-menu/business/settings.jpg"], "settings": ["m-menu/settings/overview.jpg", "m-menu/settings/account.jpg", "m-menu/settings/controls.jpg", "m-menu/settings/graphics.jpg", "m-menu/settings/audio.jpg", "m-menu/settings/hud.jpg", "m-menu/settings/privacy.jpg", "m-menu/settings/notifications.jpg"], "dailyReward": ["m-menu/daily-reward/calendar.jpg", "m-menu/daily-reward/daily.jpg", "m-menu/daily-reward/streak.jpg", "m-menu/daily-reward/rewards.jpg", "m-menu/daily-reward/bonus.jpg", "m-menu/daily-reward/history.jpg"], "achievement": ["m-menu/achievement/overview.jpg", "m-menu/achievement/categories.jpg", "m-menu/achievement/progress.jpg", "m-menu/achievement/completed.jpg", "m-menu/achievement/rewards.jpg", "m-menu/achievement/milestones.jpg"], "referral": ["m-menu/referral/overview.jpg", "m-menu/referral/invite.jpg", "m-menu/referral/rewards.jpg", "m-menu/referral/levels.jpg", "m-menu/referral/history.jpg", "m-menu/referral/leaderboard.jpg"], "statisticsTab": ["m-menu/statistics/cash.jpg", "m-menu/statistics/bank.jpg", "m-menu/statistics/player-id.jpg", "m-menu/statistics/job.jpg", "m-menu/statistics/rank.jpg", "m-menu/statistics/reputation.jpg", "m-menu/statistics/driving-licence.jpg", "m-menu/statistics/boat-licence.jpg", "m-menu/statistics/helicopter-licence.jpg", "m-menu/statistics/progress.jpg", "m-menu/statistics/xp.jpg", "m-menu/statistics/statistics.jpg"]};
  const imgs=maps[String(state.view||'')]||['m-menu/family/overview.jpg','m-menu/jobs/overview.jpg'];
  const cards=Array.from(content.querySelectorAll('.pagebody .r-card,.pagebody .premium-tile,.pagebody .setting-card,.pagebody .fam3-panel,.pagebody .org-card,.pagebody .achievement-card,.pagebody .bp-reward-card,.pagebody .bp-mission-card,.pagebody .bp-history-card,.pagebody .ref-v1-reward-card,.pagebody .prime2-panel,.pagebody .ref-v1-list-panel,.pagebody .ref-v1-stats,.pagebody .job-premium-card,.pagebody .job-progress-card,.pagebody .mini-stat,.pagebody .licence-document,.pagebody .profile-panel,.pagebody .xp-level-panel,.pagebody .card,.pagebody .tile'));
  cards.forEach((card,i)=>{
    const url=asset(imgs[i%imgs.length]);
    if(!url) return;
    card.classList.add('lux-image-card');
    card.style.setProperty('background','linear-gradient(90deg,rgba(4,5,6,.92),rgba(4,5,6,.67) 48%,rgba(4,5,6,.28)),url("'+url+'") center/cover no-repeat','important');
    card.style.setProperty('background-size','cover','important');
    card.style.setProperty('background-position','center','important');
    card.style.setProperty('background-repeat','no-repeat','important');
  });
}

function applyModuleTabImages(){
  const root=document.getElementById('content'); if(!root) return;
  const view=String(state.view||'');
  const module={"familyMenu": "family", "organization": "faction", "jobs": "jobs", "business": "business", "settings": "settings", "dailyReward": "daily-reward", "achievement": "achievement", "referral": "referral"}[view]; if(!module) return;
  const files={"family": ["overview", "members", "ranks", "territory", "storage", "vehicles", "logs", "settings"], "faction": ["overview", "members", "ranks", "missions", "territory", "vehicles", "storage", "logs", "settings"], "jobs": ["overview", "available", "active", "progress", "rewards", "history"], "business": ["overview", "employees", "finance", "products", "orders", "storage", "upgrades", "logs", "settings"], "settings": ["overview", "account", "controls", "graphics", "audio", "hud", "privacy", "notifications"], "daily-reward": ["calendar", "daily", "streak", "rewards", "bonus", "history"], "achievement": ["overview", "categories", "progress", "completed", "rewards", "milestones"], "referral": ["overview", "invite", "rewards", "levels", "history", "leaderboard"]};
  const cards=Array.from(root.querySelectorAll('.pagebody *'));
  let index=0;
  cards.forEach(card=>{
    if(!card.children.length && (card.textContent||'').trim().length<2) return;
    if(!card.classList.contains('r-card') && !card.classList.contains('card') && !card.classList.contains('tile') &&
       !card.classList.contains('premium-tile') && !card.classList.contains('setting-card') &&
       !card.classList.contains('fam3-panel') && !card.classList.contains('org-card') &&
       !card.classList.contains('store-v2-card') && !card.classList.contains('achievement-card') &&
       !card.classList.contains('bp-reward-card') && !card.classList.contains('bp-mission-card') &&
       !card.classList.contains('bp-history-card') && !card.classList.contains('ref-v1-reward-card') &&
       !card.classList.contains('prime2-panel') && !card.classList.contains('job-premium-card') &&
       !card.classList.contains('job-progress-card')) return;
    const url=asset('m-menu/'+module+'/'+files[index%files.length]);
    index++;
    if(!url) return;
    card.classList.add('lux-image-card');
    card.style.setProperty('background','linear-gradient(90deg,rgba(4,5,6,.92),rgba(4,5,6,.68) 50%,rgba(4,5,6,.30)),url("'+url+'") center/cover no-repeat','important');
  });
}


function applyStatisticsCardImages(){
  const root=document.getElementById('content');
  if(!root || String(state.view||'')!=='statisticsTab') return;
  const map=[
    ['cash','m-menu/statistics/cash.jpg'],
    ['bank','m-menu/statistics/bank.jpg'],
    ['player id','m-menu/statistics/player-id.jpg'],
    ['job','m-menu/statistics/job.jpg'],
    ['rank','m-menu/statistics/rank.jpg'],
    ['reputation','m-menu/statistics/reputation.jpg'],
    ['driving licence','m-menu/statistics/driving-licence.jpg'],
    ['boat licence','m-menu/statistics/boat-licence.jpg'],
    ['helicopter licence','m-menu/statistics/helicopter-licence.jpg']
  ];
  const cards=Array.from(root.querySelectorAll('.pagebody .mini-stat,.pagebody .licence-document,.pagebody .job-xp-row,.pagebody .profile-panel,.pagebody .xp-level-panel'));
  cards.forEach(card=>{
    let key=(card.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(card.classList.contains('xp-level-panel')) key='progress';
    const hit=map.find(x=>key.includes(x[0]));
    const url=hit ? asset(hit[1]) : (key==='progress' ? asset('m-menu/statistics/progress.jpg') : null);
    if(!url) return;
    card.classList.add('lux-semantic-image-card');
    card.style.setProperty('background','linear-gradient(90deg,rgba(4,5,6,.93),rgba(4,5,6,.68) 52%,rgba(4,5,6,.28)),url("'+url+'") center/cover no-repeat','important');
    card.style.setProperty('background-size','cover','important');
    card.style.setProperty('background-position','center','important');
  });
}


const premiumSemanticImages = {
  statisticsTab: [
    [['cash','wallet'],'m-menu/statistics/cash.jpg'],
    [['bank','account balance'],'m-menu/statistics/bank.jpg'],
    [['player id','passport','identity'],'m-menu/ai/profile.webp'],
    [['driving','driver licence'],'m-menu/statistics/driving-licence.jpg'],
    [['boat','marine licence'],'m-menu/statistics/boat-licence.jpg'],
    [['helicopter','helicopter licence'],'m-menu/statistics/helicopter-licence.jpg'],
    [['reputation','respect'],'m-menu/statistics/reputation.jpg'],
    [['rank','position'],'m-menu/statistics/rank.jpg'],
    [['xp','level','progress'],'m-menu/statistics/progress.jpg'],
    [['job','occupation'],'m-menu/statistics/job.jpg']
  ],
  familyMenu: [
    [['build your legacy','family home'],'m-menu/ai/family-members.webp'],
    [['member','invite','online'],'m-menu/ai/family-members.webp'],
    [['rank','permission'],'m-menu/ai/ranks.webp'],
    [['vehicle','garage'],'m-menu/family/vehicles.jpg'],
    [['storage','warehouse','stash','bank'],'m-menu/ai/storage.webp'],
    [['log','history','audit'],'m-menu/family/logs.jpg'],
    [['setting','control','manage'],'m-menu/family/settings.jpg'],
    [['property','house','home','business'],'m-menu/ai/territory.webp'],
    [['event','battle','war','rating','territory'],'m-menu/ai/family-members.webp']
  ],
  organization: [
    [['member','officer','employee'],'m-menu/ai/family-members.webp'],
    [['rank','grade','permission'],'m-menu/ai/ranks.webp'],
    [['mission','operation'],'m-menu/ai/faction-missions.webp'],
    [['territory','zone','rating'],'m-menu/ai/territory.webp'],
    [['vehicle','garage'],'m-menu/faction/vehicles.jpg'],
    [['storage','stash','armory'],'m-menu/ai/storage.webp'],
    [['log','history'],'m-menu/faction/logs.jpg'],
    [['setting','control'],'m-menu/faction/settings.jpg']
  ],
  jobs: [
    [['trucker','bus driver','fishing','mining','lumberjack','garbage','postal','farming','driving school'],'m-menu/ai/jobs.webp'],
    [['available','find job','choose'],'m-menu/ai/jobs.webp'],
    [['active','current job','on duty'],'m-menu/ai/jobs.webp'],
    [['progress','xp','level'],'m-menu/ai/job-rewards.webp'],
    [['reward','earning','salary'],'m-menu/ai/job-rewards.webp'],
    [['history','completed'],'m-menu/jobs/history.jpg']
  ],
  business: [
    [['employee','staff','worker'],'m-menu/business/employees.jpg'],
    [['finance','balance','bank','income','money'],'m-menu/ai/business-finance.webp'],
    [['product','catalog','inventory'],'m-menu/ai/business-products.webp'],
    [['order','delivery'],'m-menu/ai/business-products.webp'],
    [['storage','stock','warehouse'],'m-menu/ai/business-products.webp'],
    [['upgrade','level'],'m-menu/business/upgrades.jpg'],
    [['log','history','audit'],'m-menu/business/logs.jpg'],
    [['setting','control'],'m-menu/business/settings.jpg']
  ],
  settings: [
    [['interface','hud','minimap'],'m-menu/ai/settings-hud.webp'],
    [['notification','alert'],'m-menu/ai/settings-notifications.webp'],
    [['chat','voice'],'m-menu/ai/settings-chat.webp'],
    [['control','keybind','keyboard'],'m-menu/ai/controls.webp'],
    [['graphic','display','quality','audio','sound','volume'],'m-menu/ai/graphics-audio.webp'],
    [['account','profile'],'m-menu/settings/account.jpg'],
    [['privacy','streamer'],'m-menu/settings/privacy.jpg']
  ],
  dailyReward: [
    [['calendar','day'],'m-menu/ai/daily-rewards.webp'],
    [['daily','today'],'m-menu/ai/daily-rewards.webp'],
    [['streak','consecutive'],'m-menu/ai/daily-rewards.webp'],
    [['reward','claim'],'m-menu/ai/daily-rewards.webp'],
    [['bonus','extra'],'m-menu/ai/daily-rewards.webp'],
    [['history','previous'],'m-menu/daily-reward/history.jpg']
  ],
  achievement: [
    [['first paycheck','hard worker','civilian job'],'m-menu/ai/achievement-job.webp'],
    [['level 5 citizen','level 10 citizen','citizen level'],'m-menu/ai/achievement-level.webp'],
    [['half million','earner','street soldier','tracked gang'],'m-menu/ai/achievement-wealth.webp'],
    [['category','type'],'m-menu/ai/achievements.webp'],
    [['completed','unlocked'],'m-menu/ai/achievements.webp'],
    [['milestone','goal'],'m-menu/ai/achievements.webp'],
    [['progress','percent'],'m-menu/ai/achievements.webp'],
    [['reward','claim'],'m-menu/ai/achievements.webp']
  ],
  referral: [
    [['invite','code','friend'],'m-menu/ai/referral.webp'],
    [['reward','bonus'],'m-menu/ai/referral.webp'],
    [['level','tier'],'m-menu/ai/referral.webp'],
    [['history','activity'],'m-menu/ai/referral.webp'],
    [['leaderboard','ranking','top'],'m-menu/ai/referral.webp']
  ],
  battlePass: [
    [['daily'],'m-menu/ai/daily-rewards.webp'],
    [['weekly'],'m-menu/ai/achievements.webp'],
    [['history','season'],'m-menu/jobs/history.jpg'],
    [['reward','claim','premium'],'m-menu/ai/achievements.webp']
  ],
  darkStore: [
    [['vehicle','car'],'m-menu/03_cars.jpg'],
    [['prime','premium'],'m-menu/13_prime.jpg'],
    [['coin','wallet','purchase','order'],'m-menu/02_bank.jpg'],
    [['store','market','featured','product'],'m-menu/09_store.jpg']
  ],
  realEstate: [
    [['garage','vehicle'],'m-menu/19_garage.jpg'],
    [['business','commercial'],'m-menu/07_business.jpg'],
    [['house','property','real estate'],'m-menu/08_property.jpg']
  ],
  prime: [
    [['daily','reward'],'m-menu/ai/daily-rewards.webp'],
    [['history','activity'],'m-menu/ai/referral.webp'],
    [['store','benefit'],'m-menu/09_store.jpg'],
    [['prime','membership'],'m-menu/13_prime.jpg']
  ],
  contactAdmin: [
    [['report','support','admin','ticket'],'m-menu/ai/admin-support.webp']
  ]
};
const premiumImageFallbacks = {
  statisticsTab:['m-menu/ai/profile.webp','m-menu/statistics/progress.jpg','m-menu/statistics/xp.jpg'],
  familyMenu:['m-menu/ai/family-members.webp','m-menu/ai/family-members.webp','m-menu/ai/territory.webp'],
  organization:['m-menu/ai/faction-missions.webp','m-menu/ai/faction-missions.webp','m-menu/ai/territory.webp'],
  jobs:['m-menu/ai/jobs.webp','m-menu/ai/jobs.webp','m-menu/ai/job-rewards.webp'],
  business:['m-menu/ai/business-finance.webp','m-menu/ai/business-finance.webp','m-menu/ai/business-products.webp'],
  settings:['m-menu/ai/graphics-audio.webp','m-menu/ai/graphics-audio.webp','m-menu/ai/graphics-audio.webp'],
  dailyReward:['m-menu/ai/daily-rewards.webp','m-menu/ai/daily-rewards.webp','m-menu/ai/daily-rewards.webp'],
  achievement:['m-menu/ai/achievements.webp','m-menu/ai/achievements.webp','m-menu/ai/achievements.webp'],
  referral:['m-menu/ai/referral.webp','m-menu/ai/referral.webp','m-menu/ai/referral.webp'],
  battlePass:['m-menu/10_battlepass.jpg','m-menu/ai/achievements.webp'],
  darkStore:['m-menu/09_store.jpg','m-menu/03_cars.jpg','m-menu/13_prime.jpg'],
  realEstate:['m-menu/08_property.jpg','m-menu/19_garage.jpg'],
  prime:['m-menu/13_prime.jpg','m-menu/09_store.jpg'],
  contactAdmin:['m-menu/ai/admin-support.webp']
};
function semanticPremiumImage(view, text, index){
  const normalized=String(text||'').replace(/\s+/g,' ').trim().toLowerCase();
  const rules=premiumSemanticImages[view]||[];
  for(const rule of rules){
    if(rule[0].some(keyword=>normalized.includes(keyword))) return rule[1];
  }
  const fallbacks=premiumImageFallbacks[view]||['m-menu/01_city.jpg','m-menu/20_nightlife.jpg'];
  return fallbacks[index%fallbacks.length];
}
function premiumTabEmoji(text){
  const value=String(text||'').toLowerCase();
  const map=[
    [['home','overview'],'🏠'],[['information','profile','account'],'ℹ️'],[['member','employee','staff'],'👥'],
    [['property','house','real estate'],'🏡'],[['event'],'🎉'],[['battle','war'],'⚔️'],[['rating','leaderboard','rank'],'🏆'],
    [['control','setting'],'⚙️'],[['reward','claim'],'🎁'],[['daily','today'],'☀️'],[['weekly','calendar'],'📅'],
    [['history','log'],'🗃️'],[['finance','bank','balance'],'💰'],[['vehicle','garage'],'🚘'],[['storage','stock'],'📦'],
    [['mission','job'],'💼'],[['audio','sound'],'🎧'],[['graphic','display'],'🖥️'],[['privacy'],'🔒'],
    [['notification'],'🔔'],[['invite','referral'],'🤝'],[['store','market'],'🛒'],[['prime','premium'],'💎']
  ];
  const hit=map.find(entry=>entry[0].some(keyword=>value.includes(keyword)));
  return hit?hit[1]:'✦';
}
function applySemanticPremiumImages(){
  const root=document.getElementById('content');
  if(!root || state.view==='home' || state.view==='realEstate') return;
  const selectors=[
    '.pagebody .r-card','.pagebody .premium-tile','.pagebody .setting-card',
    '.pagebody .fam3-hero','.pagebody .fam3-panel','.pagebody .org-card',
    '.pagebody .store-v2-panel','.pagebody .store-v2-statusbar',
    '.pagebody .achievement-card','.pagebody .achievement-hero',
    '.pagebody .bp-pass-status','.pagebody .bp-reward-card','.pagebody .bp-mission-card','.pagebody .bp-history-card',
    '.pagebody .ref-v1-reward-card','.pagebody .ref-v1-list-panel','.pagebody .ref-v1-stats',
    '.pagebody .prime2-panel','.pagebody .prime2-status',
    '.pagebody .job-premium-card','.pagebody .job-progress-card',
    '.pagebody .fam3-property-card','.pagebody .bp-hero','.pagebody .hero-card',
    '.pagebody .quick-org-card','.pagebody .ref-v1-hero',
    '.pagebody .store-v2-hero','.pagebody .settings-hero-v16','.pagebody .setting-card-v16',
    '.pagebody .mini-stat','.pagebody .licence-document','.pagebody .profile-panel','.pagebody .xp-level-panel'
  ];
  const cards=Array.from(root.querySelectorAll(selectors.join(',')));
  cards.forEach((card,index)=>{
    const image=semanticPremiumImage(String(state.view||''),card.textContent,index);
    const url=asset(image);
    card.classList.add('dc-semantic-premium-card');
    card.dataset.dcArt=image;
    card.style.setProperty('--dc-semantic-art',`url("${url}")`);
    card.style.setProperty('background-image',`linear-gradient(90deg,rgba(3,8,16,.95),rgba(3,8,16,.68) 54%,rgba(3,8,16,.23)),url("${url}")`,'important');
    card.style.setProperty('background-size','cover','important');
    card.style.setProperty('background-position','center','important');
  });

  const tabs=Array.from(root.querySelectorAll('.fam3-nav button,.bp-tabs button,.prime2-tabs button,.setting-segments button,.store-v2-tabs button,.achievement-tabs button'));
  tabs.forEach((tab,index)=>{
    const label=(tab.textContent||'').replace(/^\s*\d+\s*/,'').trim();
    const image=semanticPremiumImage(String(state.view||''),label,index);
    tab.classList.add('dc-premium-inner-tab');
    tab.dataset.dcIcon=premiumTabEmoji(label);
    tab.style.setProperty('--dc-tab-art',`url("${asset(image)}")`);
  });
}

function wrap(title, body, extra = ''){
  const shell = document.querySelector('.shell');
  const menuApp = document.getElementById('app');
  if (menuApp) menuApp.style.zoom = String(uiSettings.ui_scale / 100);
  if (shell) shell.classList.remove('dc-home-mode','dc-spawn-mode');
  shell.classList.toggle('flow-mode', !showSidebar());
  document.getElementById('nav').innerHTML = showSidebar() ? nav() : '';
  const p = state.data?.player || {};
  const content = document.getElementById('content');
  const meta = tabMeta[state.view] || { icon:'📁', label:title, sub:'Dark City module' };
  const server = state.data?.server || {};
  content.style.setProperty('--page-bg', `url("${asset(pageBg(state.view))}")`);
  content.setAttribute("data-view", String(state.view || "unknown"));
  content.innerHTML = `
    <div class="title premium-title">
      <div class="titleleft">
        <div class="page-icon">DC</div>
        <div>
          <div class="eyebrow">DARK CITY ROLEPLAY</div>
          <h1>${title}</h1>
          <p class="subtitle">${meta.sub || 'Premium menu upgrade'}</p>
        </div>
      </div>
      <div class="title-right-pack">

        <div class="hero-chip">ID ${visiblePlayerId(p.player_id || 0)}</div>
        <div class="hero-chip">CASH ${money(p.cash || 0)}</div>
        <div class="hero-chip">BANK ${money(p.bank || 0)}</div>
      </div>
    </div>
    ${extra}
    <div class="pagebody">${body}</div>
    ${globalNav(false)}
    <div class="menu-footer">
      <span>ONLINE ${esc(server.online || 0)}/${esc(server.max || 64)}</span>
      <span>${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
      <span>DARK CITY ROLEPLAY • MAIN MENU</span>
    </div>`;
  applyLuxuryImages();
  applyStatisticsCardImages();
  applyModuleTabImages();
  applySemanticPremiumImages();
  
}
function imgBox(path, cls=''){ return `<div class="media ${cls}" style="background-image:url('${asset(path)}')"></div>`; }
function empty(text){ return `<div class="empty">${esc(text)}</div>`; }
function stars(n){
  n = Math.max(0, Math.min(5, Number(n || 0)));
  let out = '';
  for (let i=1;i<=5;i++) out += `<span class="${i<=n?'on':''}">★</span>`;
  return out;
}

function renderHud(data){
  const p = data.player || {};
  const meta = p.metadata || {};
  const wanted = Number(p.wanted_stars ?? meta.wanted_stars ?? meta.wanted ?? meta.wantedlevel ?? meta.wantedLevel ?? 0);
  const daily = data.daily_reward || null;
  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
  const date = now.toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric'});
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('hud').innerHTML =
    `<div class="oldhud">
      <div class="hud-title"><b>DARK CITY RP</b></div>

      <div class="hud-line"><span>ID</span><b>${visiblePlayerId(p.player_id || 0)}</b></div>
      <div class="hud-line"><span>ONLINE</span><b>${esc(data.server?.online || 0)}/${esc(data.server?.max || 64)}</b></div>
      <div class="hud-line"><span>CASH</span><b>${money(p.cash)}</b></div>
      <div class="hud-line"><span>BANK</span><b>${money(p.bank)}</b></div>
      <div class="hud-stars"><span>WANTED</span><div>${stars(wanted)}</div></div>
      ${daily ? `<div class="hud-line daily"><span>DAILY</span><b>${fmtTimeLeft(daily.remaining_seconds)}</b></div>` : ``}
    </div>
    <div class="bottom-clock"><b>${time}</b><span>${date}</span></div>`;
}


function renderMMenuHome(){
  const p=state.data?.player || {};
  const server=state.data?.server || {};
  const cards=[
    ['statisticsTab','📊','STATISTICS','View your progress, licenses, stats and more','m-menu/statistics/statistics.jpg'],
    ['darkStore','🛒','DARK STORE','Exclusive items, vehicles and special offers','m-menu/09_store.jpg'],
    ['familyMenu','👨‍👩‍👧','FAMILY MENU','Build your family, manage members and grow together','m-menu/04_family.jpg'],
    ['organization','🛡️','FACTION','Join, manage and dominate with your faction','m-menu/06_organization.jpg'],
    ['jobs','💼','JOBS','Work, earn money and build your future','m-menu/05_jobs.jpg'],
    ['realEstate','🏠','REAL ESTATE','Buy, sell and manage properties','m-menu/08_property.jpg'],
    ['business','🏪','BUSINESS','Create, manage and grow your business empire','m-menu/07_business.jpg'],
    ['battlePass','🎖️','BATTLE PASS','Complete missions, unlock rewards and become legendary','m-menu/10_battlepass.jpg'],
    ['achievement','🏆','ACHIEVEMENTS','Complete goals and earn rewards','m-menu/11_achievement.jpg'],
    ['referral','🤝','REFERRAL','Invite friends and earn rewards','m-menu/12_referral.jpg'],
    ['prime','💎','PRIME','Unlock premium features and exclusive benefits','m-menu/13_prime.jpg'],
    ['contactAdmin','🎧','CONTACT ADMIN','Get help, support and report issues','m-menu/16_admin.jpg'],
    ['settings','⚙️','SETTINGS','Customize your Dark City experience','m-menu/14_settings.jpg']
  ];
  const cardHtml=cards.map((c,i)=>`
    <button type="button" class="dc-home-card ${i<3?'featured':''}" onclick="switchView('${c[0]}')" style="--card-art:url('${asset(c[4])}')">
      <span class="dc-home-art"></span><span class="dc-home-overlay"></span>
      <span class="dc-home-content">
        <span class="dc-home-icon">${c[1]}</span>
        <span class="dc-home-title">${c[2]}</span>
        <span class="dc-home-desc">${c[3]}</span>
        <span class="dc-home-open">${i===8?'VIEW':'OPEN'} <b>→</b></span>
      </span>
    </button>`).join('');
  const quickTabs=[
    ['home','🏠','HOME'],['statisticsTab','📊','STATISTICS'],['achievement','🏆','ACHIEVEMENTS'],
    ['darkStore','🛒','MARKET'],['contactAdmin','📰','REPORTS'],['organization','🛡️','FACTION'],
    ['familyMenu','👥','FAMILY'],['dailyReward','🎉','EVENTS'],['jobs','💼','JOBS']
  ];
  const quickTabsHtml=quickTabs.map(t => `<button type="button" class="dc-home-tab ${t[0]==='home'?'active':''}" onclick="${t[0]==='home'?'goHome()':`switchView('${t[0]}')`}"><span class="tab-emoji">${t[1]}</span><span>${t[2]}</span></button>`).join('');
  const online=Number(server.online||0), max=Number(server.max||64);
  const markup=`
    <div class="dc-home">
      <header class="dc-home-top">
        <div class="dc-home-brand"><div class="dc-home-logo">DC</div><div><b>DARK CITY RP</b><small>PREMIUM M MENU</small></div></div>
        <div class="dc-home-player"><div class="dc-home-avatar">${esc(String((p.name||'D').slice(0,1)).toUpperCase())}</div><div><small>WELCOME BACK</small><b>${esc(p.name||'Player')}</b></div><span>ID ${visiblePlayerId(p.player_id||0)}</span></div>
        <div class="dc-home-meta"><span>📍 LOS SANTOS</span><span>🟢 ${online}/${max} ONLINE</span><button type="button" onclick="closeUi()" aria-label="Close menu">✕</button></div>
      </header>
      <nav class="dc-home-tabs" aria-label="Quick menu">${quickTabsHtml}</nav>
      <div class="dc-home-hero-layout">
        <section class="dc-home-hero"><div class="dc-home-hero-art"></div><div class="dc-home-hero-copy"><small>DARK CITY ROLEPLAY</small><h1>DARK CITY <em>SEASON</em></h1><p>REAL PEOPLE • REAL STORIES • ONE CITY</p></div><div class="dc-home-hero-stat"><span>💵 CASH</span><b>${money(p.cash||0)}</b><span>🏦 BANK</span><b>${money(p.bank||0)}</b></div></section>
        <button type="button" class="dc-home-event-card" onclick="switchView('dailyReward')"><span class="dc-event-art"></span><span class="dc-event-copy"><small>LIVE IN LOS SANTOS</small><h2>🎉 EVENTS</h2><p>Join events, meet players and unlock exclusive rewards.</p><strong>VIEW EVENTS →</strong></span></button>
      </div>
      <section class="dc-home-grid">${cardHtml}</section>
      ${globalNav(true)}
      <footer class="dc-home-footer"><span>● DARK CITY RP</span><span>SELECT A MODULE TO CONTINUE</span><span>ESC • CLOSE</span></footer>
    </div>`;
  // IMPORTANT: render() normally returns through wrap(). The home hub is a standalone
  // screen, so it must mount directly; this prevents the previous blank screen.
  const shell=document.querySelector('.shell');
  const navEl=document.getElementById('nav');
  const content=document.getElementById('content');
  if(shell) {
    shell.classList.remove('dc-spawn-mode','flow-mode');
    shell.classList.add('dc-home-mode');
  }
  const menuApp=document.getElementById('app');
  if(menuApp) menuApp.style.zoom=String(uiSettings.ui_scale/100);
  if(navEl) navEl.innerHTML='';
  if(content){
    content.style.removeProperty('--page-bg');
    content.innerHTML=markup;
    content.scrollTop=0;
  }
}

function render(){
  if (state.view === 'home') { renderMMenuHome(); return; }
  const v = state.view;
  const d = state.data || {};
  const p = d.player || {};

  if (v === 'auth') return renderAuth();
  if (v === 'spawnSelect') return renderSpawnSelect();
  if (v === 'customization') return renderCustomization();
  if (v === 'deathScreen') return renderDeath();
  if (v === 'statisticsTab') return renderStatistics(p);
  if (v === 'darkStore') return renderDarkStore();
  if (v === 'familyMenu') return renderFamily(d);
  if (v === 'organization') return renderOrganization(p);
  if (v === 'jobs') return renderJobs();
  if (v === 'realEstate') return renderRealEstate(d);
  if (v === 'business') return renderBusiness(d);
  if (v === 'settings') return renderSettings();
  if (v === 'battlePass') return renderBattlePass();
  if (v === 'dailyReward') return renderDailyReward();
  if (v === 'achievement') return renderAchievement();
  if (v === 'contactAdmin') return renderContactAdmin(d);
  if (v === 'referral') return renderReferral();
  if (v === 'prime') return renderPrime();
  return wrap('Dark City RP', `<div class="r-card"><h3>${esc(v)}</h3><p class="muted">Page connected.</p></div>`);
}

function oldStat(label, value, icon){
  return `<div class="old-stat"><img src="${asset(icon)}" onerror="this.style.display='none'"><span>${label}</span><b>${value}</b></div>`;
}

function premiumTile(icon, title, desc, actionHtml = '', extraClass = ''){
  return `<div class="premium-tile ${extraClass}">
    <div class="premium-tile-icon">${icon}</div>
    <div class="premium-tile-copy"><h3>${title}</h3><p>${desc}</p></div>
    <div class="premium-tile-actions">${actionHtml}</div>
  </div>`;
}
function pageIntro(icon, title, desc){
  return `<div class="page-intro"><div class="intro-icon">${icon}</div><div><h2>${title}</h2><p>${desc}</p></div></div>`;
}
function emptyPremium(icon, text, desc=''){
  return `<div class="empty premium-empty"><div>${icon}</div><b>${esc(text)}</b><span>${esc(desc)}</span></div>`;
}

function renderStatistics(p){
  const prog = state.data?.progression || {};
  const pr = prog.progress || {};
  const level = Number(pr.level || p.metadata?.level || 1);
  const xp = Number(pr.xp || 0);
  const totalXp = Number(pr.total_xp || 0);
  const reputation = Number(pr.reputation || 0);
  const nextXp = xpNeedForLevel(level);
  const xpPct = pct(xp, nextXp);
  const jobRows = (prog.jobs || []).slice(0, 8);
  const stats = [
    ['Cash', money(p.cash || 0), '💵'],
    ['Bank', money(p.bank || 0), '🏦'],
    ['Player ID', visiblePlayerId(p.player_id || 0), '🆔'],
    ['Job', esc(p.job?.label || p.job?.name || 'Citizen'), '💼'],
    ['Rank', esc(p.job?.grade?.name || 'Citizen'), '🎖️'],
    ['Reputation', esc(reputation), '⭐']
  ];
  const jobHtml = jobRows.length ? jobRows.map(j => {
    const jxp = Number(j.xp || 0), completed = Number(j.completed || 0), earned = Number(j.total_earned || 0), jlvl = Number(j.level || 1);
    const jNeed = Math.max(500, xpNeedForLevel(jlvl));
    return `<div class="job-xp-row">
      <div class="job-xp-main"><b>${esc(jobLabelFromId(j.job_name))}</b><span>Completed ${completed} • Earned ${money(earned)}</span></div>
      <div class="job-xp-num"><b>LV ${jlvl}</b><span>${jxp} XP</span></div>
      <div class="job-xp-bar"><i style="width:${pct(jxp, jNeed)}%"></i></div>
    </div>`;
  }).join('') : emptyPremium('💼','No job XP yet','Complete jobs to start building job progress.');

  const licenceLabels = {
    driver: ['Driving Licence', '🚗'],
    boat: ['Boat Licence', '🚤'],
    helicopter: ['Helicopter Licence', '🚁'],
  };
  const licenceRows = Array.isArray(state.data?.licences)
    ? state.data.licences
    : (Array.isArray(state.data?.documents) ? state.data.documents : []);

  const licenceByType = {};
  licenceRows.forEach(row => {
    if(row && row.license_type) licenceByType[String(row.license_type)] = row;
  });

  const licenceHtml = ['driver','boat','helicopter'].map(type => {
    const row = licenceByType[type];
    const info = licenceLabels[type];
    const valid = !!(row && (row.is_valid === true || Number(row.is_valid) === 1));
    const status = !row ? 'Not Obtained' : (valid ? 'Valid' : 'Expired');
    const expiry = row?.expires_at ? storeDate(row.expires_at) : (valid ? 'Permanent' : '—');
    return `<div class="mini-stat licence-document ${valid ? 'valid' : 'invalid'}">
      <div class="mini-ico">${info[1]}</div>
      <div>
        <span>${info[0]}</span>
        <b>${status}</b>
        <small>Expires: ${expiry}</small>
      </div>
    </div>`;
  }).join('');
  return wrap('Statistics',
    `<div class="hero-overview compact-stats xp-stats-layout">
      <div class="profile-panel clean-profile">
        <div class="avatar-ring">👤</div>
        <div class="profile-meta">
          <h2>${esc(p.name || 'Player')}</h2>
          <div class="profile-id">Player ID #${visiblePlayerId(p.player_id || 0)}</div>
          <p>${esc(p.job?.label || p.job?.name || 'Civilian')} • ${esc(p.job?.grade?.name || 'Citizen')}</p>
        </div>
      </div>
      <div class="xp-level-panel">
        <div class="xp-level-left"><span>LEVEL</span><b>${level}</b></div>
        <div class="xp-level-right">
          <h2>Progress XP</h2>
          <div class="xp-text"><span>${xp} / ${nextXp} XP</span><span>Total XP ${totalXp}</span></div>
          <div class="xp-progress"><i style="width:${xpPct}%"></i></div>
          <p>${xpPct}% progress to next level</p>
        </div>
      </div>
    </div>
    <div class="section-head"><h3>Player Information</h3><p>Core account and roleplay details</p></div>
    <div class="stats-grid-premium clean-info-grid">${stats.map(s => `<div class="mini-stat"><div class="mini-ico">${s[2]}</div><div><span>${s[0]}</span><b>${s[1]}</b></div></div>`).join('')}</div>
    <div class="section-head"><h3>Documents & Licences</h3><p>Your current licence status and expiry dates</p></div>
    <div class="stats-grid-premium clean-info-grid licence-grid">${licenceHtml}</div>
    <div class="section-head"><h3>Job Progress XP</h3><p>Job level, completed jobs, earned money and XP progress</p></div>
    <div class="job-xp-list">${jobHtml}</div>`);
}

function storeDate(value){
  if(!value) return '—';
  const d = new Date(String(value).replace(' ','T'));
  return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
}
function darkStoreProductImage(product){
  const key=String(product?.product_key||'').toLowerCase();
  const label=String(product?.label||'').toLowerCase();
  const value=`${key} ${label}`;
  const productArt=[
    [['sultan'],'m-menu/ai/store-sultan.webp'],
    [['comet'],'m-menu/ai/store-comet.webp'],
    [['zentorno'],'m-menu/ai/store-zentorno.webp'],
    [['crimson','red vip'],'m-menu/ai/store-vip-red.webp'],
    [['shadow vip','shadow clothing'],'m-menu/ai/store-vip-shadow.webp'],
    [['golden pistol','gold pistol'],'m-menu/ai/store-golden-pistol.webp'],
    [['urban rifle','rifle skin'],'m-menu/ai/store-urban-rifle.webp'],
    [['backpack'],'m-menu/ai/store-backpack.webp'],
    [['prime repair','repair bundle'],'m-menu/ai/store-repair-bundle.webp'],
    [['repair kit','repair pack'],'m-menu/ai/store-repair-kit.webp']
  ];
  const match=productArt.find(entry=>entry[0].some(term=>value.includes(term)));
  return match?match[1]:(product?.image||'newDonateShop/header_coin.png');
}

function darkStoreCategoryArt(category){
  const value=String(category?.id||category||'featured').toLowerCase();
  if(value.includes('prime')) return 'm-menu/13_prime.jpg';
  if(value.includes('battle')) return 'm-menu/10_battlepass.jpg';
  if(value.includes('vehicle')||value.includes('car')) return 'm-menu/ai/store-zentorno.webp';
  if(value.includes('cloth')||value.includes('vip')) return 'm-menu/ai/store-vip-red.webp';
  if(value.includes('weapon')||value.includes('skin')) return 'm-menu/ai/store-urban-rifle.webp';
  if(value.includes('item')||value.includes('pack')) return 'm-menu/ai/store-backpack.webp';
  return 'm-menu/09_store.jpg';
}

function darkStoreCategoryCopy(category){
  const value=String(category?.id||category||'featured').toLowerCase();
  if(value.includes('prime')) return 'Premium access and member-only benefits.';
  if(value.includes('battle')) return 'Season access, missions and premium rewards.';
  if(value.includes('vehicle')||value.includes('car')) return 'Exclusive performance vehicles delivered in-city.';
  if(value.includes('cloth')||value.includes('vip')) return 'Permanent VIP clothing and character cosmetics.';
  if(value.includes('weapon')||value.includes('skin')) return 'Cosmetic weapon finishes for supported weapons.';
  if(value.includes('item')||value.includes('pack')) return 'Useful inventory packs and premium bundles.';
  return 'Featured Dark City products selected for you.';
}

function renderDarkStore(){
  const ds = state.data?.dark_store || {};
  const products = Array.isArray(ds.products) ? ds.products : [];
  const suppliedCategories = Array.isArray(ds.categories) ? ds.categories : [];
  const categories = [{id:'featured',label:'Featured',icon:'⭐'}, ...suppliedCategories.filter(c => String(c.id||'').toLowerCase() !== 'featured')];
  if(ds.loading){
    return wrap('Dark Store', `${pageIntro('🛒','Dark Store','Loading secure catalog and wallet data...')}<div class="store-v2-error"><b>SYNCING STORE</b><span>Fetching products, Dark Coins balance and ownership status.</span></div>`);
  }
  if(ds.error){
    return wrap('Dark Store', `${pageIntro('🛒','Dark Store','Premium shop powered by secure Dark Coins purchases.')}
      <div class="store-v2-error"><b>STORE OFFLINE</b><span>${esc(ds.error)}</span></div>`);
  }

  if(!categories.some(c => String(c.id) === String(darkStoreCategory))) darkStoreCategory = 'featured';
  let filtered = products.filter(p => darkStoreCategory === 'featured' ? !!p.featured : String(p.category) === String(darkStoreCategory));
  if(darkStoreCategory === 'featured' && !filtered.length) filtered = products;
  const selected = products.find(p => String(p.product_key) === String(darkStoreSelected));
  const coins = Number(ds.coins || 0);
  const playerCash = Number(state.data?.player?.cash || 0);
  const prime = ds.prime || null;
  const primeActive = !!prime;
  const orders = Array.isArray(ds.orders) ? ds.orders : [];
  const ledger = Array.isArray(ds.ledger) ? ds.ledger : [];

  const categoryHtml = categories.map((category,index) => {
    const active=String(category.id)===String(darkStoreCategory);
    return `<button class="market-v3-category tone-${index%6} ${active?'active':''}" onclick="setDarkStoreCategory(${jsArg(category.id)})" style="--market-category-art:url('${asset(darkStoreCategoryArt(category))}')">
      <span class="market-v3-category-status">${active?'ACTIVE':'OPEN'}</span>
      <span class="market-v3-category-arrow">↗</span>
      <span class="market-v3-category-copy"><small>DARK CITY MARKET</small><b>${esc(category.label||category.id)}</b><em>${esc(darkStoreCategoryCopy(category))}</em></span>
    </button>`;
  }).join('');

  const renderMarketProductCard = (p,index) => {
    const owned = p.owned === true || Number(p.owned||0) === 1;
    const primeRequired = p.prime_required === true || Number(p.prime_required||0) === 1;
    const primeLocked = primeRequired && !primeActive;
    const disabled = owned || primeLocked;
    const rarity=String(p.rarity||(primeRequired?'LEGENDARY':p.featured?'RARE':'STANDARD')).toUpperCase();
    const originalPrice=Number(p.original_price||0);
    const price=Number(p.price||0);
    const discount=Number(p.discount_percent||0) || (originalPrice>price ? Math.round((1-(price/originalPrice))*100) : 0);
    return `<article class="market-v3-product ${disabled?'disabled':''}">
      <div class="market-v3-product-image" style="background-image:url('${asset(darkStoreProductImage(p))}')">
        <span class="market-v3-quantity">${Number(p.quantity||1)}X</span>
        <span class="market-v3-rarity rarity-${rarity.toLowerCase()}">${esc(rarity)}</span>
        ${discount>0?`<span class="market-v3-discount">${discount}% OFF</span>`:''}
      </div>
      <div class="market-v3-product-copy">
        <small>${esc(String(p.category||'DARK STORE').toUpperCase())}</small>
        <h3>${esc(p.label||p.product_key)}</h3>
        <p>${esc(p.description||'Dark City premium product.')}</p>
        <div class="market-v3-product-footer">
          <span class="market-v3-product-price"><img src="${asset('newDonateShop/header_coin.png')}"><b>${price.toLocaleString()}</b></span>
          <button ${disabled?'disabled':''} onclick="openDarkStoreProduct(${jsArg(p.product_key)})">${owned?'OWNED':primeLocked?'PRIME ONLY':'VIEW'}</button>
        </div>
      </div>
    </article>`;
  };

  const productCards=filtered.map((p,i)=>renderMarketProductCard(p,i)).join('');
  const selectedCategory=categories.find(c=>String(c.id)===String(darkStoreCategory))||categories[0];

  const orderRows = orders.slice(0,8).map(o => `<div class="store-v2-history-row"><div><b>${esc(o.product_label||o.product_key)}</b><span>#${esc(o.id)} • ${storeDate(o.created_at)}</span></div><strong class="${esc(o.status||'')}">${esc(String(o.status||'').toUpperCase())}</strong><em>🪙 ${Number(o.price||0).toLocaleString()}</em></div>`).join('') || empty('No purchases yet');
  const ledgerRows = ledger.slice(0,8).map(l => `<div class="store-v2-ledger-row"><div><b>${esc(String(l.reason||'Dark Coins').replaceAll('_',' '))}</b><span>${storeDate(l.created_at)}</span></div><strong class="${Number(l.delta||0)>=0?'plus':'minus'}">${Number(l.delta||0)>=0?'+':''}${Number(l.delta||0).toLocaleString()} DC</strong></div>`).join('') || empty('No coin activity yet');

  let modal = '';
  if(selected){
    const owned = selected.owned === true || Number(selected.owned||0) === 1;
    const primeRequired = selected.prime_required === true || Number(selected.prime_required||0) === 1;
    const primeLocked = primeRequired && !primeActive;
    const canBuy = !owned && !primeLocked && coins >= Number(selected.price||0);
    modal = `<div class="store-v2-modal-backdrop" onclick="closeDarkStoreProduct()"><div class="store-v2-modal" onclick="event.stopPropagation()">
      <button class="store-v2-modal-close" onclick="closeDarkStoreProduct()">×</button>
      <div class="store-v2-modal-image" style="background-image:url('${asset(darkStoreProductImage(selected))}')"></div>
      <div class="store-v2-modal-copy"><small>DARK CITY PREMIUM STORE</small><h2>${esc(selected.label)}</h2><p>${esc(selected.description||'')}</p>
        <div class="store-v2-modal-meta"><span>TYPE <b>${esc(String(selected.reward_type||'reward').replaceAll('_',' '))}</b></span><span>DELIVERY <b>SERVER VERIFIED</b></span>${selected.one_time?'<span>LIMIT <b>ONE PER CHARACTER</b></span>':''}${primeRequired?'<span>ACCESS <b>ACTIVE PRIME</b></span>':''}</div>
        <div class="store-v2-confirm"><div><span>YOUR BALANCE</span><b>🪙 ${coins.toLocaleString()}</b></div><div><span>PRICE</span><b>🪙 ${Number(selected.price||0).toLocaleString()}</b></div></div>
        ${owned?'<button class="store-v2-confirm-btn disabled" disabled>ALREADY OWNED</button>':primeLocked?'<button class="store-v2-confirm-btn disabled" disabled>ACTIVE PRIME REQUIRED</button>':canBuy?`<button class="store-v2-confirm-btn" onclick="buyDarkStoreProduct(${jsArg(selected.product_key)})">CONFIRM PURCHASE</button>`:'<button class="store-v2-confirm-btn disabled" disabled>NOT ENOUGH DARK COINS</button>'}
        <p class="store-v2-safe">🔒 Price and reward are validated by the server. Failed reward delivery is refunded automatically.</p>
      </div>
    </div></div>`;
  }

  const emptyOffers=emptyPremium('🛍️','No products in this category','Add or enable products in dc-darkstore/config.lua.');
  return wrap('Dark Store',
    `<div class="market-v3-shell">
      <section class="market-v3-topbar">
        <div><small>DARK CITY PREMIUM MARKET</small><h2>MARKET</h2><p>Choose a category and purchase server-verified products with Dark Coins.</p></div>
        <div class="market-v3-balances">
          <span><small>DARK COINS</small><b>🪙 ${coins.toLocaleString()}</b></span>
          <span><small>CASH</small><b>$${playerCash.toLocaleString()}</b></span>
        </div>
      </section>
      <section class="market-v3-status">
        <span><small>PRIME</small><b>${prime?'ACTIVE':'INACTIVE'}</b></span>
        <span><small>BATTLE PASS</small><b>${ds.battlepass_premium?'PREMIUM':'FREE'}</b></span>
        <span><small>SECURITY</small><b>SERVER VERIFIED</b></span>
        <span><small>PURCHASES</small><b>${orders.filter(o=>o.status==='completed').length}</b></span>
      </section>
      <nav class="market-v3-categories">${categoryHtml}</nav>
      <section class="market-v3-offer-section catalog">
        <header><div><small>SELECTED: ${esc(selectedCategory.label||selectedCategory.id)}</small><h2>MARKET PRODUCTS</h2><p>Permanent catalog products available in the selected category.</p></div><span class="market-v3-refresh">SECURE <b>CHECKOUT</b></span></header>
        <div class="market-v3-products">${productCards||emptyOffers}</div>
      </section>
      <div class="store-v2-lower"><section class="store-v2-panel"><div class="section-head"><h3>Purchase History</h3><p>Recent completed, failed and refunded store orders</p></div>${orderRows}</section><section class="store-v2-panel"><div class="section-head"><h3>Dark Coin Activity</h3><p>Latest wallet adjustments and purchases</p></div>${ledgerRows}</section></div>
      ${modal}
    </div>`);
}

function boolText(v){ return Number(v || 0) === 1 ? 'YES' : 'NO'; }
function accessText(v, labels){ v = Number(v || 0); return (labels && labels[v]) || String(v); }
function famInput(id, label, value, ph='') { return `<label class="grp-field"><span>${label}</span><input id="${id}" placeholder="${ph}" value="${esc(value || '')}"></label>`; }
function famArea(id, label, value, ph='') { return `<label class="grp-field wide"><span>${label}</span><textarea id="${id}" placeholder="${ph}">${esc(value || '')}</textarea></label>`; }

function renderFamily(d){
  const createPrice = Number(d.createPrice || 500000);
  const rankings = d.rankings || [];
  const rankingRows = rankings.slice(0,15).map((f,i)=>`<div class="fam3-ranking ${d.family&&Number(f.id)===Number(d.family.id)?'mine':''}"><b>#${i+1}</b><span>${esc(f.name||'Family')}</span><em>${esc(f.members_count||0)} MEMBERS</em><strong>${esc(f.rating_points||f.elo||0)}</strong></div>`).join('') || `<div class="fam3-empty">No family rankings yet.</div>`;
  const offers = (d.transferOffers||[]).map(o=>`<div class="fam3-offer"><div><small>FAMILY TRANSFER OFFER</small><h3>${esc(o.family_name||'Family')}</h3><p>Level ${esc(o.family_level||1)} • House #${esc(o.house_id||'-')} • ${esc(o.house_label||'Shared House')}</p></div><b>${money(o.price)}</b><button onclick="action('family_transfer_accept',{offerId:${Number(o.id)||0}})">ACCEPT</button><button class="ghost" onclick="action('family_transfer_decline',{offerId:${Number(o.id)||0}})">DECLINE</button></div>`).join('');

  if(!d.family){
    return wrap('Family Menu',`<div class="fam3-shell no-family">
      <aside class="fam3-nav"><div class="fam3-nav-title">FAMILY</div><button class="active"><span>01</span><b>HOME</b></button><button><span>02</span><b>INFORMATION</b></button><button><span>03</span><b>MEMBERS</b></button><button><span>04</span><b>PROPERTY</b></button><button><span>05</span><b>EVENTS</b></button><button><span>06</span><b>BATTLES</b></button><button><span>07</span><b>RATING</b></button><button><span>08</span><b>CONTROL</b></button></aside>
      <section class="fam3-content"><div class="fam3-hero create"><div><small>DARK CITY FAMILY SYSTEM</small><h2>BUILD YOUR LEGACY</h2><p>Register a family at Government / City Hall using one of your personally owned houses. The selected property becomes your shared family house.</p><div class="fam3-metrics"><div><span>CREATE COST</span><b>${money(createPrice)}</b></div><div><span>LEVEL 1 CAPACITY</span><b>50</b></div><div><span>RANKS</span><b>10</b></div><div><span>SHARED HOUSE</span><b>REQUIRED</b></div></div></div><div class="fam3-crest">DC</div></div>${offers}<div class="fam3-grid two"><div class="fam3-panel"><div class="fam3-panel-head"><h3>HOW TO CREATE</h3><span>GOVERNMENT</span></div><p>Buy a personal house, visit Government / City Hall, select the house and register your family. Creation, ownership transfer and family progression use the real dc-life backend.</p></div><div class="fam3-panel"><div class="fam3-panel-head"><h3>TOP FAMILIES</h3><span>LIVE RATING</span></div><div class="fam3-ranking-list">${rankingRows}</div></div></div></section>
    </div>`);
  }

  const fam=d.family||{}, me=d.member||{}, members=d.members||[], ranks=d.ranks||[], events=d.events||[], battles=d.battles||[], holdings=d.holdings||{};
  const myRank=Number(me.rank||1), playerId=Number((d.player||{}).player_id||0), isLeader=Number(fam.owner_player_id||0)===playerId||myRank>=10;
  const myAccess=ranks.find(r=>Number(r.rank_id)===myRank)||{};
  const canManage=isLeader||Number(myAccess.access_member_management||0)===1||myRank>=8;
  const canMoney=isLeader||Number(myAccess.access_money||0)===1||myRank>=8;
  const canWar=isLeader||Number(myAccess.access_bizwar||0)===1;
  const online=members.filter(m=>Number(m.online||0)===1).length;
  const rating=Number(fam.elo||1000)+Number(fam.points||0)+Number(fam.respect_points||0)+members.length*5+Math.floor(Number(fam.balance||0)/10000)+Number(fam.battles||0)*10;
  const tab=familyTab||'home';
  const nav=[['home','HOME'],['info','INFORMATION'],['members','MEMBERS'],['property','PROPERTY'],['events','EVENTS'],['battles','BATTLES'],['rating','RATING'],['control','CONTROL']].map(([id,label],i)=>`<button class="${tab===id?'active':''}" onclick="setFamilyTab('${id}')"><span>${String(i+1).padStart(2,'0')}</span><b>${label}</b></button>`).join('');
  const logs=(d.logs||[]).slice(0,12).map(l=>`<div class="fam3-log"><b>${esc(String(l.action||'action').toUpperCase())}</b><span>${esc(l.details||'')}</span><em>${esc(l.created_at||'')}</em></div>`).join('')||`<div class="fam3-empty">No family activity yet.</div>`;

  const upcoming=events.filter(e=>String(e.status||'scheduled')!=='cancelled').slice(0,4).map(e=>`<div class="fam3-event-mini"><div><b>${esc(e.title)}</b><span>${esc(e.location||'Location TBA')} • ${esc(e.scheduled_at||'Time TBA')}</span></div><strong>${esc(e.joined_count||0)}${Number(e.max_members||0)>0?'/'+esc(e.max_members):''}</strong></div>`).join('')||`<div class="fam3-empty">No scheduled family events.</div>`;

  const homePage=`<div class="fam3-hero"><div><small>FAMILY HOME</small><h2>${esc(fam.name||'Family')}</h2><p>${esc(fam.leader_message||'Welcome to the family.')}</p><div class="fam3-metrics"><div><span>LEVEL</span><b>${esc(fam.level||1)}</b></div><div><span>MEMBERS</span><b>${members.length}</b></div><div><span>ONLINE</span><b>${online}</b></div><div><span>RATING</span><b>${rating}</b></div></div></div><div class="fam3-crest">${esc(String(fam.name||'DC').slice(0,2).toUpperCase())}</div></div><div class="fam3-grid two"><div class="fam3-panel"><div class="fam3-panel-head"><h3>UPCOMING EVENTS</h3><span>${events.length} TOTAL</span></div>${upcoming}</div><div class="fam3-panel balance"><div class="fam3-panel-head"><h3>FAMILY BALANCE</h3><span>RANK LOCKED</span></div><div class="fam3-big-money">${money(fam.balance||0)}</div><div class="fam3-money-row"><input id="famHomeAmount" type="number" placeholder="Amount"><button onclick="action('family_deposit',{amount:document.getElementById('famHomeAmount').value})">DEPOSIT</button>${canMoney?`<button class="gold" onclick="action('family_withdraw',{amount:document.getElementById('famHomeAmount').value})">WITHDRAW</button>`:''}</div></div><div class="fam3-panel wide"><div class="fam3-panel-head"><h3>RECENT ACTIVITY</h3><span>LIVE LOG</span></div><div class="fam3-log-list">${logs}</div></div></div>`;

  const infoPage=`<div class="fam3-grid two"><div class="fam3-panel"><div class="fam3-panel-head"><h3>FAMILY INFORMATION</h3><span>PROFILE</span></div><div class="fam3-info-list"><div><span>NAME</span><b>${esc(fam.name)}</b></div><div><span>NATIONALITY</span><b>${esc(fam.nationality||'Not set')}</b></div><div><span>LEADER ID</span><b>#${esc(fam.owner_player_id||0)}</b></div><div><span>YOUR RANK</span><b>${esc(me.rank_name||('Rank '+myRank))}</b></div><div><span>CHAT ICON</span><b>${esc(fam.chat_icon||1)}</b></div><div><span>CHAT COLOR</span><b>${esc(fam.chat_color||'#FFFFFF')}</b></div></div></div><div class="fam3-panel"><div class="fam3-panel-head"><h3>BIOGRAPHY</h3><span>ABOUT</span></div><p class="fam3-copy">${esc(fam.biography||fam.bio||'No biography written yet.')}</p></div><div class="fam3-panel"><div class="fam3-panel-head"><h3>RULES</h3><span>CHARTER</span></div><p class="fam3-copy">${esc(fam.rules||'No rules written yet.')}</p></div><div class="fam3-panel"><div class="fam3-panel-head"><h3>TABOO / BLACKLIST NOTES</h3><span>INTERNAL</span></div><p class="fam3-copy">${esc(fam.taboo||'No internal notes.')}</p></div>${isLeader?`<div class="fam3-panel wide"><div class="fam3-panel-head"><h3>EDIT FAMILY INFORMATION</h3><span>LEADER ONLY</span></div><div class="fam3-form-grid"><label><span>NATIONALITY</span><input id="famNation3" value="${esc(fam.nationality||'')}"></label><label><span>CHAT ICON</span><input id="famIcon3" type="number" value="${esc(fam.chat_icon||1)}"></label><label class="wide"><span>LEADER MESSAGE</span><input id="famMsg3" value="${esc(fam.leader_message||'')}"></label><label class="wide"><span>BIOGRAPHY</span><textarea id="famBio3">${esc(fam.biography||fam.bio||'')}</textarea></label><label class="wide"><span>RULES</span><textarea id="famRules3">${esc(fam.rules||'')}</textarea></label><label class="wide"><span>TABOO NOTES</span><textarea id="famTaboo3">${esc(fam.taboo||'')}</textarea></label></div><button onclick="action('family_update_info',{nationality:document.getElementById('famNation3').value,chat_icon:document.getElementById('famIcon3').value,leader_message:document.getElementById('famMsg3').value,biography:document.getElementById('famBio3').value,rules:document.getElementById('famRules3').value,taboo:document.getElementById('famTaboo3').value})">SAVE INFORMATION</button></div>`:''}</div>`;

  const memberRows=members.map(m=>`<div class="fam3-member ${Number(m.online||0)===1?'online':''}"><div class="id">${esc(m.player_id)}</div><div class="person"><b>${esc(m.name||'Player')}</b><span>${esc(m.rank_name||'Member')} • Rank ${esc(m.rank||1)} • Points ${esc(m.points||0)}</span></div><div class="status">${Number(m.online||0)===1?'ONLINE':'OFFLINE'}</div>${canManage&&Number(m.player_id)!==Number(fam.owner_player_id)?`<div class="member-actions"><button onclick="action('family_promote',{target:${Number(m.player_id)||0}})">+</button><button onclick="action('family_demote',{target:${Number(m.player_id)||0}})">−</button><button class="danger" onclick="action('family_kick',{target:${Number(m.player_id)||0}})">FIRE</button></div>`:'<div></div>'}</div>`).join('')||`<div class="fam3-empty">No members.</div>`;
  const membersPage=`<div class="fam3-panel"><div class="fam3-panel-head"><h3>FAMILY MEMBERS</h3><span>${online} ONLINE / ${members.length} TOTAL</span></div>${canManage?`<div class="fam3-toolbar"><input id="famInvitePid3" type="number" placeholder="Permanent Player ID"><button onclick="action('family_invite',{target:document.getElementById('famInvitePid3').value})">INVITE PLAYER</button><input id="famSetPid3" type="number" placeholder="Member ID"><input id="famSetRank3" type="number" min="1" max="9" placeholder="Rank 1-9"><button class="gold" onclick="action('family_set_rank',{target:document.getElementById('famSetPid3').value,rank:document.getElementById('famSetRank3').value})">SET RANK</button></div>`:''}<div class="fam3-member-list">${memberRows}</div></div>`;

  const houses=(holdings.houses||[]).map(h=>`<div class="fam3-property-card"><small>FAMILY HOUSE #${esc(h.id)}</small><h3>${esc(h.label||'House')}</h3><p>${esc(h.location||'')} • Class ${esc(h.class||'-')}</p><div><span>GARAGE ${esc(h.garage_slots||0)}</span><span>GARDEN ${Number(h.family_garden||0)===1?'OWNED':'NO'}</span><span>HELIPAD ${Number(h.family_helipad||0)===1?'OWNED':'NO'}</span></div></div>`).join('')||`<div class="fam3-empty">No shared house linked.</div>`;
  const biz=(holdings.businesses||[]).map(b=>`<div class="fam3-property-card"><small>FAMILY BUSINESS</small><h3>${esc(b.label||'Business')}</h3><p>${esc(b.type||'Business')}</p><div><span>BALANCE ${money(b.balance||0)}</span><span>STOCK ${esc(b.stock||0)}</span></div></div>`).join('')||`<div class="fam3-empty">No family businesses.</div>`;
  const vehicles=(d.vehicles||[]).map(v=>`<div class="fam3-property-card"><small>FAMILY VEHICLE</small><h3>${esc(v.model||'Vehicle')}</h3><p>Plate ${esc(v.plate||'-')} • Access Rank ${esc(v.access_rank||1)}</p></div>`).join('')||`<div class="fam3-empty">No family vehicles registered.</div>`;
  const house=(holdings.houses||[])[0]||{}, level=Number(fam.level||1), bal=Number(fam.balance||0);
  const propertyPage=`<div class="fam3-grid two"><div class="fam3-panel"><div class="fam3-panel-head"><h3>FAMILY HOUSE</h3><span>PROPERTY</span></div>${houses}</div><div class="fam3-panel"><div class="fam3-panel-head"><h3>BUSINESSES</h3><span>HOLDINGS</span></div>${biz}</div><div class="fam3-panel"><div class="fam3-panel-head"><h3>GARAGE</h3><span>${(d.vehicles||[]).length} VEHICLES</span></div>${vehicles}</div><div class="fam3-panel"><div class="fam3-panel-head"><h3>PROPERTY UPGRADES</h3><span>FAMILY BALANCE</span></div><div class="fam3-upgrade"><div><b>FAMILY GARDEN</b><span>Level 4 • $1,500,000 • House eligibility required</span></div>${Number(house.family_garden||0)===1?'<strong>OWNED</strong>':(isLeader?`<button ${!(level>=4&&Number(house.garden_allowed||0)===1&&bal>=1500000)?'disabled':''} onclick="action('family_buy_garden',{})">BUY</button>`:'')}</div><div class="fam3-upgrade"><div><b>FAMILY HELIPAD</b><span>Level 5 • $3,000,000 • House eligibility required</span></div>${Number(house.family_helipad||0)===1?'<strong>OWNED</strong>':(isLeader?`<button ${!(level>=5&&Number(house.helipad_allowed||0)===1&&bal>=3000000)?'disabled':''} onclick="action('family_buy_helipad',{})">BUY</button>`:'')}</div></div></div>`;

  const eventRows=events.map(e=>`<div class="fam3-event-card ${String(e.status)==='cancelled'?'cancelled':''}"><div><small>${esc(String(e.status||'scheduled').toUpperCase())}</small><h3>${esc(e.title||'Family Event')}</h3><p>${esc(e.description||'')}</p><span>${esc(e.location||'Location TBA')} • ${esc(e.scheduled_at||'Time TBA')}</span></div><div class="event-count"><b>${esc(e.joined_count||0)}${Number(e.max_members||0)>0?'/'+esc(e.max_members):''}</b><span>JOINED</span></div>${String(e.status)!=='cancelled'?`<div class="event-actions">${Number(e.joined||0)===1?`<button class="ghost" onclick="action('family_event_leave',{eventId:${Number(e.id)||0}})">LEAVE</button>`:`<button onclick="action('family_event_join',{eventId:${Number(e.id)||0}})">JOIN</button>`}${canManage?`<button class="danger" onclick="action('family_cancel_event',{eventId:${Number(e.id)||0}})">CANCEL</button>`:''}</div>`:'<strong>CANCELLED</strong>'}</div>`).join('')||`<div class="fam3-empty">No family events created yet.</div>`;
  const eventsPage=`<div class="fam3-grid ${canManage?'two':'one'}">${canManage?`<div class="fam3-panel"><div class="fam3-panel-head"><h3>CREATE EVENT</h3><span>MANAGEMENT</span></div><div class="fam3-form-grid"><label><span>TITLE</span><input id="famEvTitle" placeholder="Family Meeting"></label><label><span>LOCATION</span><input id="famEvLoc" placeholder="Family House"></label><label><span>DATE / TIME</span><input id="famEvTime" placeholder="2026-07-10 21:00:00"></label><label><span>MAX MEMBERS</span><input id="famEvMax" type="number" value="0"></label><label class="wide"><span>DESCRIPTION</span><textarea id="famEvDesc" placeholder="Event details"></textarea></label></div><button onclick="action('family_create_event',{title:document.getElementById('famEvTitle').value,location:document.getElementById('famEvLoc').value,scheduled_at:document.getElementById('famEvTime').value,max_members:document.getElementById('famEvMax').value,description:document.getElementById('famEvDesc').value})">CREATE EVENT</button></div>`:''}<div class="fam3-panel ${canManage?'':'wide'}"><div class="fam3-panel-head"><h3>FAMILY EVENTS</h3><span>${events.length} TOTAL</span></div><div class="fam3-event-list">${eventRows}</div></div></div>`;

  const battleRows=battles.map(b=>{const incoming=Number(b.defender_family_id)===Number(fam.id)&&String(b.status)==='wait_confirm';return `<div class="fam3-battle"><div class="battle-vs"><span>${esc(b.attacker_name||('#'+b.attacker_family_id))}</span><b>VS</b><span>${esc(b.defender_name||('#'+b.defender_family_id))}</span></div><div><small>${esc(String(b.status||'unknown').toUpperCase())}</small><h3>${esc(b.location||'Family Arena')}</h3><p>Weapon: ${esc(b.weapon||'Any')} • ${esc(b.scheduled_at||b.created_at||'')}</p><span>${esc(b.comment||'')}</span></div>${incoming&&canWar?`<div class="battle-actions"><button onclick="action('family_battle_respond',{battleId:${Number(b.id)||0},response:'accept'})">ACCEPT</button><button class="danger" onclick="action('family_battle_respond',{battleId:${Number(b.id)||0},response:'decline'})">DECLINE</button></div>`:''}</div>`}).join('')||`<div class="fam3-empty">No family battles yet.</div>`;
  const battlePage=`<div class="fam3-grid ${canWar?'two':'one'}">${canWar?`<div class="fam3-panel"><div class="fam3-panel-head"><h3>CHALLENGE FAMILY</h3><span>WAR PERMISSION</span></div><div class="fam3-form-grid"><label><span>DEFENDER FAMILY ID</span><input id="famWarDef" type="number"></label><label><span>LOCATION</span><input id="famWarLoc" value="Family Arena"></label><label><span>WEAPON</span><input id="famWarWeapon" value="Any"></label><label><span>DATE / TIME</span><input id="famWarTime" placeholder="2026-07-10 22:00:00"></label><label class="wide"><span>COMMENT</span><textarea id="famWarComment"></textarea></label></div><button class="danger" onclick="action('family_create_battle',{defender_family_id:document.getElementById('famWarDef').value,location:document.getElementById('famWarLoc').value,weapon:document.getElementById('famWarWeapon').value,scheduled_at:document.getElementById('famWarTime').value,comment:document.getElementById('famWarComment').value})">SEND BATTLE CHALLENGE</button></div>`:''}<div class="fam3-panel ${canWar?'':'wide'}"><div class="fam3-panel-head"><h3>BATTLE HISTORY</h3><span>${battles.length} RECORDS</span></div><div class="fam3-battle-list">${battleRows}</div></div></div>`;

  const ratingPage=`<div class="fam3-grid two"><div class="fam3-panel"><div class="fam3-panel-head"><h3>YOUR FAMILY RATING</h3><span>LIVE FORMULA</span></div><div class="fam3-rating-score">${rating}</div><div class="fam3-info-list"><div><span>ELO</span><b>${esc(fam.elo||1000)}</b></div><div><span>POINTS</span><b>${esc(fam.points||0)}</b></div><div><span>RESPECT</span><b>${esc(fam.respect_points||0)}</b></div><div><span>BATTLES</span><b>${esc(fam.battles||0)}</b></div></div></div><div class="fam3-panel"><div class="fam3-panel-head"><h3>RANKING OF FAMILIES</h3><span>TOP 15</span></div><div class="fam3-ranking-list">${rankingRows}</div></div></div>`;

  const rankRows=ranks.map(r=>`<div class="fam3-rank-row ${Number(r.rank_id)===myRank?'mine':''}"><b>${esc(r.rank_id)}</b><div><strong>${esc(r.rank_name||('Rank '+r.rank_id))}</strong><span>House ${esc(r.access_house||0)} • Furniture ${esc(r.access_furniture||0)} • Vehicle ${esc(r.vehicle_access||0)}</span></div><em>Members ${boolText(r.access_member_management)} • Money ${boolText(r.access_money)} • War ${boolText(r.access_bizwar)}</em></div>`).join('');
  const levelPrices={2:1500000,3:3500000,4:7000000,5:12000000}, next=level<5?level+1:null, nextPrice=next?levelPrices[next]:0;
  const controlPage=`<div class="fam3-grid two"><div class="fam3-panel balance"><div class="fam3-panel-head"><h3>FAMILY BANK</h3><span>${canMoney?'ACCESS':'DEPOSIT ONLY'}</span></div><div class="fam3-big-money">${money(fam.balance||0)}</div><div class="fam3-money-row"><input id="famCtrlAmount" type="number" placeholder="Amount"><button onclick="action('family_deposit',{amount:document.getElementById('famCtrlAmount').value})">DEPOSIT</button>${canMoney?`<button class="gold" onclick="action('family_withdraw',{amount:document.getElementById('famCtrlAmount').value})">WITHDRAW</button>`:''}</div></div><div class="fam3-panel"><div class="fam3-panel-head"><h3>LEVEL PROGRESSION</h3><span>LEVEL ${level}/5</span></div>${next?`<p>Next level cost: <b>${money(nextPrice)}</b>. Upgrade is paid from Family Balance.</p>${isLeader?`<button ${bal<nextPrice?'disabled':''} onclick="action('family_upgrade_level',{})">UPGRADE TO LEVEL ${next}</button>`:'<div class="fam3-empty">Leader only</div>'}`:'<div class="fam3-empty">Maximum family level reached.</div>'}</div><div class="fam3-panel wide"><div class="fam3-panel-head"><h3>RANK ACCESS LEVELS</h3><span>10 RANKS</span></div><div class="fam3-rank-list">${rankRows}</div></div>${isLeader?`<div class="fam3-panel"><div class="fam3-panel-head"><h3>EDIT RANK</h3><span>LEADER</span></div><div class="fam3-form-grid"><label><span>RANK 1-10</span><input id="famRankId3" type="number" min="1" max="10" value="8"></label><label><span>RANK NAME</span><input id="famRankName3" value="Under Boss"></label><label><span>HOUSE 0-3</span><input id="famRankHouse3" type="number" value="2"></label><label><span>FURNITURE 0-3</span><input id="famRankFurniture3" type="number" value="2"></label><label><span>VEHICLE 0-3</span><input id="famRankVehicle3" type="number" value="2"></label><label><span>CLOTHES 0/1</span><input id="famRankClothes3" type="number" value="1"></label><label><span>WAR 0/1</span><input id="famRankWar3" type="number" value="1"></label><label><span>MEMBERS 0/1</span><input id="famRankMembers3" type="number" value="1"></label><label><span>MONEY 0/1</span><input id="famRankMoney3" type="number" value="1"></label></div><button onclick="action('family_update_rank',{rank:document.getElementById('famRankId3').value,rank_name:document.getElementById('famRankName3').value,access_house:document.getElementById('famRankHouse3').value,access_furniture:document.getElementById('famRankFurniture3').value,vehicle_access:document.getElementById('famRankVehicle3').value,access_clothes:document.getElementById('famRankClothes3').value,access_bizwar:document.getElementById('famRankWar3').value,access_member_management:document.getElementById('famRankMembers3').value,access_money:document.getElementById('famRankMoney3').value})">SAVE RANK</button></div><div class="fam3-panel"><div class="fam3-panel-head"><h3>TRANSFER FAMILY</h3><span>10% GOVERNMENT TAX</span></div><input id="famTransferPid3" type="number" placeholder="Buyer Player ID"><input id="famTransferPrice3" type="number" placeholder="Transfer price"><button class="gold" onclick="action('family_transfer_offer',{target:document.getElementById('famTransferPid3').value,price:document.getElementById('famTransferPrice3').value})">SEND TRANSFER OFFER</button><button class="danger block" onclick="if(confirm('Delete this family permanently?'))action('family_delete',{})">DELETE FAMILY</button></div>`:`<div class="fam3-panel"><div class="fam3-panel-head"><h3>FAMILY MEMBERSHIP</h3></div><button class="danger block" onclick="if(confirm('Leave this family?'))action('family_leave',{})">LEAVE FAMILY</button></div>`}<div class="fam3-panel wide"><div class="fam3-panel-head"><h3>ACTIVITY LOG</h3><span>LAST 12</span></div><div class="fam3-log-list">${logs}</div></div></div>`;

  const pages={home:homePage,info:infoPage,members:membersPage,property:propertyPage,events:eventsPage,battles:battlePage,rating:ratingPage,control:controlPage};
  return wrap('Family Menu',`<div class="fam3-shell"><aside class="fam3-nav"><div class="fam3-nav-title">${esc(fam.name||'FAMILY')}</div>${nav}<div class="fam3-nav-foot"><span>LEVEL ${esc(fam.level||1)}</span><b>${online}/${members.length} ONLINE</b></div></aside><section class="fam3-content">${pages[tab]||homePage}</section></div>`);
}

function renderOrganization(p){
  const f = p.faction || { kind:'none', label:'No Faction', rank_name:'Unaffiliated' };
  const kind = String(f.kind || 'none');
  const isGang = kind === 'gang';
  const isOrg = kind === 'organization';
  const isConflict = kind === 'conflict' || f.conflict === true;
  const icon = isGang ? '💀' : (isOrg ? '🛡️' : (isConflict ? '⚠️' : '📋'));
  const typeLabel = isGang ? 'Gang' : (isOrg ? 'Organization' : (isConflict ? 'Data Conflict' : 'No Membership'));
  const label = f.label || f.name || (isConflict ? 'Faction Conflict' : 'No Faction');
  const rank = f.rank_name || (f.rank !== undefined ? `Rank ${f.rank}` : 'Unaffiliated');
  const description = isConflict
    ? 'Organization and gang membership were found together. This is blocked; an administrator must clean the duplicate record.'
    : (kind === 'none'
      ? 'Join one organization or one gang. A player cannot belong to both at the same time.'
      : `Open your ${typeLabel.toLowerCase()} management. Only ${isGang ? 'gang' : 'organization'} functions will be shown.`);
  const button = (isGang || isOrg)
    ? `<button class="btn ${isOrg?'green':''}" onclick="openOrgUI()">Open ${esc(typeLabel)} Menu</button>`
    : `<button class="btn" disabled>${isConflict?'Resolve Membership Conflict':'No Faction Menu'}</button>`;

  return wrap('Faction',
    `${pageIntro('🛡️','Faction Control','One unified menu entry for your organization or gang.')}
    <div class="org-dashboard">
      <div class="org-card ${isGang?'gang-card':'police-card'}">
        <div class="org-badge">${icon}</div>
        <div class="job-type">${esc(typeLabel)}</div>
        <h2>${esc(label)}</h2>
        <p>Rank: <b>${esc(rank)}</b></p>
        <p class="muted">${esc(description)}</p>
        ${button}
      </div>
      <div class="org-card quick-org-card">
        <div class="org-badge">🔒</div>
        <h2>Membership Rule</h2>
        <p class="muted">Organization members cannot join gangs. Gang members cannot join organizations.</p>
        <p>Current type: <b>${esc(typeLabel)}</b></p>
      </div>
    </div>`);
}

function renderJobs(){
  const progJobs = state.data?.progression?.jobs || [];
  const byJob = {};
  progJobs.forEach(j => { byJob[String(j.job_name || '').toLowerCase()] = j; });
  const body = jobs.map(j => {
    const labelArg = jsArg(j.label || 'Job');
    const cmdArg = jsArg(j.cmd || j.id || '');
    const stat = byJob[String(j.id).toLowerCase()] || byJob[String(j.cmd).toLowerCase()] || byJob[String(j.label).toLowerCase()];
    const xp = Number(stat?.xp || 0), completed = Number(stat?.completed || 0), earned = Number(stat?.total_earned || 0), lvl = Number(stat?.level || 1);
    const xpPct = pct(xp, xpNeedForLevel(lvl));
    return `<div class="job-premium-card job-progress-card">
      <div class="job-image">${imgBox(j.img)}</div>
      <div class="job-info">
        <div class="job-type">Civilian Job • LV ${lvl}</div>
        <h3>${esc(j.label)}</h3>
        <p>${esc(j.desc)}</p>
        <div class="job-inline-stats"><span>${completed} completed</span><span>${xp} XP</span><span>${money(earned)}</span></div>
        <div class="job-xp-bar mini"><i style="width:${xpPct}%"></i></div>
      </div>
      <div class="job-actions">
        <button class="btn green" onclick="setWaypointUI(${Number(j.x)},${Number(j.y)},${labelArg})">Waypoint</button>
        <button class="btn" onclick="action('job_start',{cmd:${cmdArg},label:${labelArg},x:${Number(j.x)},y:${Number(j.y)}})">Start</button>
      </div>
    </div>`;
  }).join('');
  return wrap('Jobs', `${pageIntro('💼','Jobs Board','Start jobs, set waypoints and track each job XP progress.')}<div class="jobs-board">${body}</div>`);
}

function renderRealEstate(d){
  const businesses = d.businesses || [];
  const houses = d.houses || [];
  const biz = businesses.map((b,i)=>`<div class="r-card photo-card">${imgBox(`businessPurchase/photos/${businessPhotos[i % businessPhotos.length]}`)}<div class="card-pad"><h3>${esc(b.label)}</h3><p class="muted">ID ${esc(b.id)} • ${esc(b.type)} • ${esc(b.location || '')}</p><p class="muted">Robbery: ${Number(b.gang_robbery_allowed||0)===1?'YES':'NO'} • Price: ${String(b.price_level||'medium').toUpperCase()}</p><div class="big gold">${money(b.price)}</div><button class="btn green" onclick="action('business_buy',{businessId:${Number(b.id)}})">Buy Business</button><button class="btn" onclick="setWaypointUI(${Number(b.x)},${Number(b.y)},${jsArg(b.label)})">Set Waypoint</button></div></div>`).join('');
  const home = houses.map((h,i)=>`<div class="r-card photo-card">${imgBox(`homePurchase/photos/${businessPhotos[i % businessPhotos.length]}`)}<div class="card-pad"><h3>#${esc(h.id)} • ${esc(h.label)}</h3><p class="muted">${esc(h.class || '')} • ${esc(h.location || '')}</p><div class="big gold">${money(h.price)}</div><button class="btn" onclick="setWaypointUI(${Number(h.x)},${Number(h.y)},${jsArg(h.label)})">Set Waypoint</button><p class="muted">Purchase and entry are available only at the physical property.</p></div></div>`).join('');
  return wrap('Real Estate', `<h2>Business Purchase / Auction</h2><div class="grid photos">${biz || empty('No businesses for sale')}</div><h2>Home Purchase</h2><div class="grid photos">${home || empty('No houses found')}</div>`);
}

function renderBusiness(d){
  const b = d.my_business || d.business || null;
  const logs = d.business_logs || [];
  if (!b) {
    return wrap('Business', `<div class="r-card hero-card">${imgBox('businessPurchase/layer.png','hero-img')}<h3>No Business Owned</h3><p class="muted">Buy a business from Real Estate. Only one business per owner is allowed.</p><button class="btn gold" onclick="switchView('realEstate')">Open Real Estate</button></div>`);
  }
  const stockPct = Math.max(0, Math.min(100, Math.floor((Number(b.stock||0) / Math.max(1, Number(b.max_stock||100))) * 100)));
  const rows = logs.map(l => `<div class="row"><div><b>${esc(l.action)}</b><span>${esc(l.details || '')}</span></div><b>${money(l.amount || 0)}</b></div>`).join('');
  const orders = d.business_supply_orders || [];
  const orderRows = orders.map(o => `<div class="row"><div><b>#${esc(o.id)} ${esc(o.status || 'pending').toUpperCase()}</b><span>${esc(o.stock_amount)} ${esc(o.stock_label || 'stock')} • ${esc(o.order_size || '')} • Driver: ${esc(o.assigned_name || 'Waiting')}</span></div><b>${money(o.order_cost || 0)}</b></div>`).join('');
  return wrap('Business', `<div class="grid2">
    <div class="r-card">${imgBox('businessPurchase/layer.png','wide')}<h3>${esc(b.label)}</h3><p class="muted">Business ID ${esc(b.id)} • ${esc(b.type)} • Owner ID ${esc(b.owner_player_id)}</p><div class="big gold">${money(b.balance)}</div><p>Balance</p></div>
    <div class="r-card"><h3>Stock</h3><div class="progress"><span style="width:${stockPct}%"></span></div><p>${esc(b.stock)} / ${esc(b.max_stock)}</p><p>Price Level: <b>${String(b.price_level||'medium').toUpperCase()}</b> • Item Price ${money(b.product_price)}</p><p>Gang Robbery: <b>${Number(b.gang_robbery_allowed||0)===1?'YES':'NO'}</b></p></div>
  </div>
  <div class="r-card"><h3>Price Level</h3><button class="btn" onclick="action('business_price_level',{businessId:${Number(b.id)},level:'low'})">LOW</button><button class="btn gold" onclick="action('business_price_level',{businessId:${Number(b.id)},level:'medium'})">MEDIUM</button><button class="btn red" onclick="action('business_price_level',{businessId:${Number(b.id)},level:'high'})">HIGH</button></div>
  <div class="r-card"><h3>Order Stock Delivery</h3><p class="muted">Stock refill now comes by trucker delivery. Cost is paid from business balance.</p><button class="btn" onclick="action('business_order_stock',{businessId:${Number(b.id)},size:'small'})">Small Order</button><button class="btn gold" onclick="action('business_order_stock',{businessId:${Number(b.id)},size:'medium'})">Medium Order</button><button class="btn red" onclick="action('business_order_stock',{businessId:${Number(b.id)},size:'large'})">Large Order</button><button class="btn" onclick="post('close'); setTimeout(()=>{},50);">Close</button></div>
  <h2>Supply Orders</h2><div class="list">${orderRows || empty('No supply orders')}</div>
  <h2>Business Logs</h2><div class="list">${rows || empty('No business logs')}</div>`);
}

function renderSettings(){
  const opts = state.data.options || {};

  // Server/character settings are authoritative. V18 also migrates values
  // that older builds only kept inside the NUI browser localStorage.
  const persistedCount = Number(state.data.options_saved_count || 0);
  const citizenid = String((state.data.player && state.data.player.citizenid) || 'unknown');
  const migrationKey = `dc-settings-v18-migrated:${citizenid}`;
  const persistentKeys = [
    'hud_enabled','ui_scale','hud_scale','minimap_mode','notification_position',
    'notification_sound','graphics_preset','chat_visible','chat_scale','chat_vertical',
    'damage_indicator','vehicle_hud','auto_seatbelt'
  ];

  if (persistedCount <= 0) {
    try {
      const migrated = sessionStorage.getItem(migrationKey) === '1';
      const legacyValues = {};
      persistentKeys.forEach(key => {
        const saved = localStorage.getItem(`dc-setting:${key}`);
        if (saved !== null) {
          opts[key] = saved;
          legacyValues[key] = saved;
        }
      });

      if (!migrated && Object.keys(legacyValues).length > 0) {
        sessionStorage.setItem(migrationKey, '1');
        state.data.options_saved_count = Object.keys(legacyValues).length;
        Object.entries(legacyValues).forEach(([key, value]) => {
          post('action', { action:'setting_save', data:{ key, value } });
        });
      }
    } catch (_) {}
  }

  const b = (k, d=false) => settingBool(opts[k], d);
  const v = (k, d='') => opts[k] === undefined ? d : String(opts[k]);

  uiSettings.ui_scale = Number(v('ui_scale', uiSettings.ui_scale || 100));
  applyMenuScale(uiSettings.ui_scale);
  uiSettings.hud_scale = Number(v('hud_scale', uiSettings.hud_scale || 100));
  uiSettings.hud_enabled = b('hud_enabled', true);
  uiSettings.minimap_mode = v('minimap_mode','vehicle');
  uiSettings.notification_position = v('notification_position','bottom-right');
  uiSettings.notification_sound = b('notification_sound', true);
  uiSettings.graphics_preset = v('graphics_preset','balanced');
  uiSettings.chat_visible = b('chat_visible', true);
  uiSettings.chat_scale = Number(v('chat_scale', 100));
  uiSettings.chat_vertical = Number(v('chat_vertical', 0));
  uiSettings.damage_indicator = b('damage_indicator', true);
  uiSettings.vehicle_hud = b('vehicle_hud', true);
  uiSettings.auto_seatbelt = b('auto_seatbelt', false);

  const seg = (key, current, options) => `<div class="setting-segments">${options.map(([value,label]) =>
    `<button class="${String(current)===String(value)?'active':''}" data-setting-key="${esc(key)}" data-setting-value="${esc(value)}">${esc(label)}</button>`).join('')}</div>`;
  const sw = (key, current, on='ON', off='OFF') => `<button class="setting-toggle ${current?'on':''}" data-setting-key="${esc(key)}" data-setting-value="${current ? 'false' : 'true'}"><span></span><b>${current?on:off}</b></button>`;

  const cards = [
    {
      icon:'🖥️', title:'Interface Scale', desc:'Resize the M Menu and personal interface instantly.',
      control:`<div class="range-row"><input id="uiscale" type="range" min="80" max="130" value="${uiSettings.ui_scale}" oninput="document.getElementById('uiscaleVal').textContent=this.value+'%'"><b id="uiscaleVal">${uiSettings.ui_scale}%</b></div><button class="btn setting-apply" data-setting-key="ui_scale" data-setting-input="uiscale">APPLY SCALE</button>`
    },
    {
      icon:'🎯', title:'HUD Display', desc:'Enable or disable the complete Dark City HUD.',
      control:sw('hud_enabled',uiSettings.hud_enabled,'HUD ON','HUD OFF')
    },
    {
      icon:'📏', title:'HUD Scale', desc:'Adjust HUD size separately from the M Menu.',
      control:`<div class="range-row"><input id="hudscale" type="range" min="70" max="130" step="5" value="${uiSettings.hud_scale}" oninput="document.getElementById('hudscaleVal').textContent=this.value+'%';previewHudScale(this.value)"><b id="hudscaleVal">${uiSettings.hud_scale}%</b></div><button class="btn setting-apply" data-setting-key="hud_scale" data-setting-input="hudscale">SAVE HUD SCALE</button><small class="setting-note">Live preview • 70% small • 100% default • 130% large</small>`
    },
    {
      icon:'🗺️', title:'Minimap Mode', desc:'Choose when the GTA radar should be visible.',
      control:seg('minimap_mode',uiSettings.minimap_mode,[['always','Always'],['vehicle','Vehicle'],['off','Off']])
    },
    {
      icon:'🔔', title:'Notification Position', desc:'Move all Dark City notifications to your preferred screen area.',
      control:seg('notification_position',uiSettings.notification_position,[['top-left','Top Left'],['top-right','Top Right'],['bottom-left','Bottom Left'],['bottom-right','Bottom Right']])
    },
    {
      icon:'🔊', title:'Notification Sound', desc:'Enable or mute notification sounds without muting game audio.',
      control:sw('notification_sound',uiSettings.notification_sound,'SOUND ON','MUTED')
    },
    {
      icon:'🎙️', title:'Voice Settings', desc:'Quickly cycle PMA Voice proximity while staying inside Settings.',
      control:`<button class="btn setting-apply" onclick="action('setting_voice_cycle',{})">CYCLE PROXIMITY</button><small class="setting-note">Whisper → Normal → Shouting</small>`
    },
    {
      icon:'⌨️', title:'Keybind Viewer', desc:'View the important Dark City controls and current menu keys.',
      control:`<button class="btn setting-apply" onclick="toggleSettingsPanel('settingsKeys')">VIEW KEYBINDS</button><div id="settingsKeys" class="settings-keylist hidden"><span><b>M</b>Main Menu</span><span><b>M</b>Main Menu → Faction</span><span><b>E</b>Radial / Interaction</span><span><b>T</b>Chat</span><span><b>B</b>Seatbelt</span><span><b>ESC</b>Close UI</span></div>`
    },
    {
      icon:'🌃', title:'Graphics Preset', desc:'Switch between performance, balanced and cinematic visual modes.',
      control:seg('graphics_preset',uiSettings.graphics_preset,[['performance','Performance'],['balanced','Balanced'],['cinematic','Cinematic']])
    },
    {
      icon:'💬', title:'Chat Visibility', desc:'Show or completely hide the Dark City chat overlay.',
      control:sw('chat_visible',uiSettings.chat_visible,'CHAT ON','CHAT OFF')
    },
    {
      icon:'🔎', title:'Chat Size', desc:'Make the chat smaller or larger without changing the rest of the HUD.',
      control:`<div class="range-row"><input id="chatscale" type="range" min="70" max="120" step="5" value="${uiSettings.chat_scale}" oninput="document.getElementById('chatscaleVal').textContent=this.value+'%'"><b id="chatscaleVal">${uiSettings.chat_scale}%</b></div><button class="btn setting-apply" data-setting-key="chat_scale" data-setting-input="chatscale">APPLY CHAT SIZE</button><small class="setting-note">70% small • 100% default • 120% large</small>`
    },
    {
      icon:'↕️', title:'Chat Position', desc:'Move the chat upward or downward on your screen.',
      control:`<div class="range-row"><input id="chatvertical" type="range" min="-20" max="35" step="1" value="${uiSettings.chat_vertical}" oninput="document.getElementById('chatverticalVal').textContent=Number(this.value)&lt;0?Math.abs(Number(this.value))+' UP':(Number(this.value)&gt;0?Number(this.value)+' DOWN':'DEFAULT')"><b id="chatverticalVal">${uiSettings.chat_vertical < 0 ? Math.abs(uiSettings.chat_vertical)+' UP' : (uiSettings.chat_vertical > 0 ? uiSettings.chat_vertical+' DOWN' : 'DEFAULT')}</b></div><button class="btn setting-apply" data-setting-key="chat_vertical" data-setting-input="chatvertical">APPLY POSITION</button><small class="setting-note">Left = up • Center = default • Right = down</small>`
    },
    {
      icon:'🩸', title:'Damage Indicator', desc:'Show the red directional damage flash when your character is hurt.',
      control:sw('damage_indicator',uiSettings.damage_indicator,'DAMAGE FX ON','DAMAGE FX OFF')
    },
    {
      icon:'🏎️', title:'Vehicle HUD', desc:'Show or hide speedometer, fuel, engine and seatbelt telemetry.',
      control:sw('vehicle_hud',uiSettings.vehicle_hud,'VEHICLE HUD ON','VEHICLE HUD OFF')
    },
    {
      icon:'🪢', title:'Auto Seatbelt', desc:'Automatically buckle up shortly after entering a supported vehicle.',
      control:sw('auto_seatbelt',uiSettings.auto_seatbelt,'AUTO BELT ON','AUTO BELT OFF')
    }
  ];

  const overview = `<div class="settings-hero-v16">
    <div class="settings-hero-copy"><span>PERSONAL CONTROL CENTER</span><h2>Make Dark City feel like yours.</h2><p>Every option saves to your character profile and applies immediately—no reconnect required.</p></div>
    <div class="settings-hero-stats"><div><b>${cards.length}</b><span>LIVE SETTINGS</span></div><div><b>DB</b><span>PERSISTENT SAVE</span></div><div><b>0s</b><span>RECONNECT TIME</span></div></div>
  </div>`;

  return wrap('Settings',
    `${overview}
     <div class="settings-toolbar-v16"><div><b>SETTINGS V16</b><span>HUD • UI • AUDIO • PRIVACY • GAMEPLAY</span></div><button class="settings-reset-btn" onclick="action('setting_reset_defaults',{})">↻ RESET DEFAULTS</button></div>
     <div class="settings-grid settings-grid-v16">${cards.map(c => `<div class="setting-card setting-card-v16"><div class="setting-card-head"><div class="setting-icon">${c.icon}</div><div><h3>${c.title}</h3><p>${c.desc}</p></div></div><div class="setting-control">${c.control}</div></div>`).join('')}</div>`);
}

function renderBattlePass(){
  const bp = state.data?.battle_pass || {};
  if (bp.loading) return wrap('Battle Pass', emptyPremium('🎖️','Loading Battle Pass','Season data is being prepared.'));
  if (bp.error) return wrap('Battle Pass', emptyPremium('⚠️','Battle Pass unavailable',bp.error));

  const season = bp.season || {};
  const player = bp.player || {};
  const rewards = Array.isArray(bp.rewards) ? bp.rewards : [];
  const missions = Array.isArray(bp.missions) ? bp.missions : [];
  const history = Array.isArray(bp.history) ? bp.history : [];
  const level = Number(player.level || 1);
  const currentXp = Number(player.current_xp || 0);
  const xpPerLevel = Math.max(1, Number(player.xp_per_level || season.xp_per_level || 1000));
  const xpPct = level >= Number(season.max_level || 50) ? 100 : pct(currentXp, xpPerLevel);
  const premium = player.premium === true || Number(player.premium || 0) === 1;
  const claimable = Number(player.available_claims || 0);

  const timeText = sec => {
    sec = Math.max(0, Number(sec || 0));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
  };

  const metricIcon = metric => {
    metric = String(metric || '');
    if (metric === 'job_complete') return '💼';
    if (metric === 'job_earned') return '💵';
    if (metric === 'play_minutes') return '⏱️';
    if (metric.includes('fishing')) return '🎣';
    if (metric.includes('mining')) return '⛏️';
    if (metric.includes('postal')) return '📦';
    return '🎯';
  };

  const rewardCard = (reward, track) => {
    if (!reward) return `<div class="bp-reward-card empty-slot ${track}"><div class="bp-reward-empty">—</div><span>No reward</span></div>`;
    const claimed = reward.claimed === true || Number(reward.claimed || 0) === 1;
    const unlocked = reward.unlocked === true || Number(reward.unlocked || 0) === 1;
    const available = reward.available === true || Number(reward.available || 0) === 1;
    const premiumLocked = track === 'premium' && !premium;
    let stateLabel = 'LOCKED', btn = '';
    if (claimed) stateLabel = 'CLAIMED';
    else if (premiumLocked) stateLabel = 'PREMIUM';
    else if (available) {
      stateLabel = 'READY';
      btn = `<button class="bp-claim-btn" onclick="battlePassClaim(${Number(reward.id||0)})">CLAIM</button>`;
    } else if (unlocked) stateLabel = 'AVAILABLE';
    return `<div class="bp-reward-card ${track} ${claimed?'claimed':''} ${available?'ready':''} ${premiumLocked?'premium-locked':''}">
      <div class="bp-reward-state">${stateLabel}</div>
      <div class="bp-reward-img" style="background-image:url('${asset(esc(reward.image||'newDonateShop/header_money.svg'))}')"></div>
      <b>${esc(reward.label || 'Reward')}</b>
      <small>${track === 'premium' ? 'PREMIUM TRACK' : 'FREE TRACK'}</small>
      ${btn}
    </div>`;
  };

  const rewardsByLevel = {};
  rewards.forEach(r => {
    const lv = Number(r.level || 0);
    rewardsByLevel[lv] ||= {};
    rewardsByLevel[lv][String(r.track || 'free')] = r;
  });

  const rewardTrack = Array.from({length:Number(season.max_level || 50)},(_,i)=>i+1).map(lv => {
    const pair = rewardsByLevel[lv] || {};
    const reward = pair.premium || pair.free;
    const track = pair.premium ? 'premium' : 'free';
    return `<div class="bp-level-col bp-single-reward ${track} ${lv===level?'current':''} ${lv<level?'passed':''}">
      <div class="bp-level-head"><span>LEVEL</span><b>${lv}</b>${lv===level?'<em>YOU</em>':''}</div>
      ${rewardCard(reward,track)}
    </div>`;
  }).join('');

  const renderMissionList = period => {
    const rows = missions.filter(m => String(m.period_type) === period);
    if (!rows.length) return emptyPremium('📋',`No ${period} missions`,'Mission definitions can be edited in dc-battlepass/config.lua.');
    return `<div class="bp-mission-grid">${rows.map(m => {
      const current = Number(m.progress || 0), target = Math.max(1,Number(m.target || 1));
      const done = String(m.status) === 'completed' || current >= target;
      return `<div class="bp-mission-card ${done?'done':''}">
        <div class="bp-mission-icon">${metricIcon(m.metric)}</div>
        <div class="bp-mission-copy"><span>${period.toUpperCase()} MISSION</span><h3>${esc(m.label)}</h3>
          <div class="bp-mission-progress"><i style="width:${pct(current,target)}%"></i></div>
          <p>${current.toLocaleString()} / ${target.toLocaleString()}</p></div>
        <div class="bp-mission-xp"><b>+${Number(m.xp_reward||0).toLocaleString()}</b><span>BP XP</span>${done?'<em>COMPLETED</em>':''}</div>
      </div>`;
    }).join('')}</div>`;
  };

  let tabBody = '';
  if (battlePassTab === 'daily') tabBody = renderMissionList('daily');
  else if (battlePassTab === 'weekly') tabBody = renderMissionList('weekly');
  else if (battlePassTab === 'history') {
    tabBody = history.length ? `<div class="bp-history-grid">${history.map(h => {
      const histLevel = Math.min(Number(season.max_level||50),Math.floor(Number(h.xp||0)/xpPerLevel)+1);
      return `<div class="bp-history-card"><span>PAST SEASON</span><h3>${esc(h.name||h.season_key)}</h3><div><b>LEVEL ${histLevel}</b><b>${Number(h.claimed_count||0)} CLAIMED</b></div><p>${Number(h.premium||0)===1?'Premium Pass':'Free Pass'}</p></div>`;
    }).join('')}</div>` : emptyPremium('🗃️','No season history yet','Completed seasons will appear here.');
  } else {
    tabBody = `<div class="bp-track-labels"><span>SEASON 1 REWARDS • GREEN = FREE</span><span>GOLD = PREMIUM</span></div>
      <div class="bp-track-scroll"><div class="bp-track">${rewardTrack}</div></div>`;
  }

  return wrap('Battle Pass', `
    <div class="bp-shell">
      <section class="bp-hero" style="background-image:linear-gradient(90deg,rgba(5,7,14,.96),rgba(5,7,14,.62),rgba(5,7,14,.94)),url('${asset('battlegroundReg/bg.png')}')">
        <div class="bp-season-copy"><span class="bp-kicker">DARK CITY • ${esc(season.name || 'SEASON 1')}</span><h2>${esc(season.subtitle || 'DARK CITY LEGENDS')}</h2><p>50 levels • 20,000 XP each • 2,000 XP per verified play hour • Top 10 finishers win $250,000.</p>
          <div class="bp-progress-row"><div class="bp-level-badge"><span>LEVEL</span><b>${level}</b></div><div class="bp-xp-box"><div><span>${currentXp.toLocaleString()} / ${xpPerLevel.toLocaleString()} BP XP</span><b>${xpPct}%</b></div><div class="bp-big-progress"><i style="width:${xpPct}%"></i></div></div></div>
        </div>
        <div class="bp-hero-side">
          <div class="bp-countdown"><span>SEASON ENDS IN</span><b>${timeText(season.seconds_left)}</b></div>
          <div class="bp-pass-status ${premium?'active':''}"><span>${premium?'PREMIUM ACTIVE':'FREE PASS'}</span><b>${premium?'ALL TRACKS UNLOCKED':'PREMIUM REWARDS LOCKED'}</b></div>
          <button class="bp-claim-all ${claimable>0?'hot':''}" onclick="battlePassClaimAll()">CLAIM ALL <span>${claimable}</span></button>
        </div>
      </section>

      <div class="bp-tabs">
        <button class="${battlePassTab==='rewards'?'active':''}" onclick="setBattlePassTab('rewards')">🎁 REWARDS</button>
        <button class="${battlePassTab==='daily'?'active':''}" onclick="setBattlePassTab('daily')">☀️ DAILY MISSIONS</button>
        <button class="${battlePassTab==='weekly'?'active':''}" onclick="setBattlePassTab('weekly')">📅 WEEKLY MISSIONS</button>
        <button class="${battlePassTab==='history'?'active':''}" onclick="setBattlePassTab('history')">🗃️ HISTORY</button>
      </div>
      <section class="bp-tab-body">${tabBody}</section>
    </div>`);
}

function renderDailyReward(){
  const active = state.data.daily_reward || null;
  const tiers = [
    { id:'3h', label:'3 Hours Play', reward:50000, seconds:10800, img:'newDonateShop/header_coin.png' },
    { id:'5h', label:'5 Hours Play', reward:70000, seconds:18000, img:'newDonateShop/header_money.svg' },
    { id:'7h', label:'7 Hours Play', reward:90000, seconds:25200, img:'newDonateShop/header_money.svg' },
    { id:'9h', label:'9 Hours Play', reward:120000, seconds:32400, img:'newDonateShop/items/byvip.png' }
  ];
  const activeBox = active
    ? `<div class="r-card daily-active"><h3>Live Daily Reward Timer</h3><div class="big gold">${fmtTimeLeft(active.remaining_seconds)}</div><p class="muted">Reward: ${money(active.reward_amount)} will auto deposit to bank after timer complete.</p></div>`
    : `<div class="r-card daily-active"><h3>No Active Timer</h3><p class="muted">Select one reward. Timer counts only while you are online.</p></div>`;
  const cards = tiers.map(t => `<div class="r-card photo-card">
    ${imgBox(t.img)}
    <div class="card-pad"><h3>${t.label}</h3><div class="big green">${money(t.reward)}</div><p class="muted">Play time required: ${fmtTimeLeft(t.seconds)}</p><button class="btn gold" onclick="dailyStart('${t.id}')">Select</button></div>
  </div>`).join('');
  return wrap('Daily Reward', `${activeBox}<div class="grid photos">${cards}</div>`);
}

function renderAchievement(){
  const progression = state.data?.progression || {};
  const catalog = Array.isArray(progression.achievement_catalog) ? progression.achievement_catalog : [];
  const unlockedHistory = Array.isArray(progression.achievements) ? progression.achievements : [];

  // Compatibility fallback: older progression builds may only return unlocked rows.
  const achievements = catalog.length ? catalog : unlockedHistory.map(row => ({
    id: row.achievement_id,
    icon: '🏆',
    label: row.label || row.achievement_id || 'Achievement',
    description: 'Achievement unlocked.',
    reward: Number(row.reward || 0),
    progress: 1,
    target: 1,
    unit: 'count',
    unlocked: true,
    unlocked_at: row.unlocked_at || null
  }));

  const formatProgress = a => {
    const current = Math.max(0, Number(a.progress || 0));
    const target = Math.max(1, Number(a.target || 1));
    if (a.unit === 'money') return `${money(current)} / ${money(target)}`;
    if (a.unit === 'level') return `Level ${current} / ${target}`;
    if (a.unit === 'jobs') return `${current} / ${target} jobs`;
    if (a.unit === 'event') return `${current} / ${target} event`;
    return `${current} / ${target}`;
  };

  const unlockedCount = achievements.filter(a => a.unlocked === true || Number(a.unlocked) === 1).length;
  const cards = achievements.map(a => {
    const unlocked = a.unlocked === true || Number(a.unlocked) === 1;
    const current = Math.max(0, Number(a.progress || 0));
    const target = Math.max(1, Number(a.target || 1));
    const progressPct = unlocked ? 100 : pct(current, target);
    const unlockedAt = unlocked && a.unlocked_at ? `<small class="muted">${esc(String(a.unlocked_at))}</small>` : '';

    return `<div class="achievement-card ${unlocked?'done':''}">
      <div>${esc(a.icon || '🏆')}</div>
      <h3>${esc(a.label || a.id || 'Achievement')}</h3>
      <p>${esc(a.description || '')}</p>
      <div class="progress"><span style="width:${progressPct}%"></span></div>
      <p class="muted">${esc(formatProgress(a))}</p>
      <span>${unlocked?'Unlocked':'In Progress'}</span>
      ${unlockedAt}
    </div>`;
  }).join('');

  return wrap('Achievement',
    `${pageIntro('🏆','Achievements',`${unlockedCount} of ${achievements.length} milestones unlocked. Progress is loaded from the server.`)}
     <div class="achievement-grid">${cards || empty('No achievement definitions available')}</div>`);
}

function renderContactAdmin(d){
  const reports = Array.isArray(d.reports) ? d.reports.slice().sort((a,b) => Number(b.id||0)-Number(a.id||0)) : [];
  const active = reports.find(r => r.status !== 'closed') || null;
  const closed = reports.filter(r => r.status === 'closed');

  const thread = active ? `
    <div class="support-thread">
      <div class="row"><div><b>Active Report #${esc(active.id)}</b><span>${esc(active.status)} • Staff: ${esc(active.adminName || 'Waiting for staff')}</span></div></div>
      <div class="report-chat-thread">
        ${(active.messages || []).map(m => `<div class="support-msg ${m.senderType === 'admin' ? 'staff' : 'player'}"><b>${esc(m.senderName || 'Unknown')} ${m.senderDcid ? '[Player ID '+esc(m.senderDcid)+']' : ''}</b><p>${esc(m.message || '')}</p><small>${esc(m.createdAt || '')}</small></div>`).join('') || '<div class="muted">No messages yet.</div>'}
      </div>
      <textarea id="reportReply" placeholder="Reply to staff..."></textarea>
      <button class="btn green" onclick="action('report_reply',{reportId:${Number(active.id)},message:document.getElementById('reportReply').value})">Send Reply</button>
    </div>` : `
    <div class="support-create">
      <div class="support-icon">🛎️</div>
      <h3>Create Report</h3>
      <input id="rt" maxlength="120" placeholder="Report title">
      <textarea id="rm" maxlength="650" placeholder="Explain your issue clearly"></textarea>
      <button class="btn green" onclick="action('report_create',{title:document.getElementById('rt').value,message:document.getElementById('rm').value})">Submit to Staff</button>
    </div>`;

  const history = closed.map(r => {
    const last = (r.messages || [])[Math.max(0,(r.messages || []).length-1)] || {};
    const rating = Number(r.rating || 0);
    const rate = rating > 0 ? `<span>Rating: ${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span>` : `<span>Rate support: ${[1,2,3,4,5].map(n => `<button class="mini-rate" onclick="action('report_rate',{reportId:${Number(r.id)},rating:${n}})">${n}★</button>`).join(' ')}</span>`;
    return `<div class="row report-row"><div><b>#${esc(r.id)} Closed</b><span>Staff: ${esc(r.adminName || 'Staff')} • ${esc(r.closedAt || r.openedAt || '')}</span><span>${esc(last.message || '')}</span>${rate}</div></div>`;
  }).join('');

  return wrap('Contact Admin',
    `${pageIntro('🆘','Contact Admin','One report thread at a time. Continue the same conversation until staff closes it.')}
    <div class="support-layout">
      ${thread}
      <div class="support-list">
        <h3>Report History</h3>
        <div class="list">${history || emptyPremium('✅','No closed reports','Your completed support requests will appear here.')}</div>
      </div>
    </div>`);
}

function renderReferral(){
  const ref = state.data?.referral || {};
  if(ref.loading){
    return wrap('Referral', `${pageIntro('🤝','Referral Program','Loading your secure invite code and milestone progress...')}<div class="ref-v1-error"><b>SYNCING REFERRAL DATA</b><span>Checking code ownership, rewards and friend progress.</span></div>`);
  }
  if(ref.error){
    return wrap('Referral', `${pageIntro('🤝','Referral Program','Invite new players and earn milestone rewards.')}<div class="ref-v1-error"><b>REFERRAL OFFLINE</b><span>${esc(ref.error)}</span></div>`);
  }

  const code = String(ref.code || `DARKCITY-${state.data.player?.player_id || 0}`);
  const stats = ref.stats || {};
  const eligible = ref.eligibility || {};
  const linked = ref.linked_referral || null;
  const rows = Array.isArray(ref.referrals) ? ref.referrals : [];
  const rewards = ref.rewards || {};
  const images = ref.images || {};
  const claimable = Number(stats.claimable || 0);

  const linkedCard = linked ? (() => {
    const status = String(linked.status || 'pending');
    const progress = Math.max(0,Math.min(100,Number(linked.progress_percent || 0)));
    const ready = !!linked.claimable;
    return `<section class="ref-v1-linked ${ready?'ready':''}">
      <div class="ref-v1-linked-head"><div><small>YOU WERE INVITED BY</small><h3>${esc(linked.referrer_name || ('Player #'+linked.referrer_player_id))}</h3></div><strong class="ref-v1-state ${status}">${esc(status.toUpperCase())}</strong></div>
      <div class="ref-v1-progress"><i style="width:${progress}%"></i></div>
      <div class="ref-v1-progress-copy"><span>${Number(linked.progress_minutes||0)} / ${Number(linked.required_playtime_minutes||0)} minutes</span><b>${progress}%</b></div>
      <p>${ready ? 'Your invited-player reward is ready. Use Claim Rewards.' : linked.referred_claimed_at ? 'Your invited-player reward has been claimed.' : 'Keep playing to complete the referral milestone.'}</p>
    </section>`;
  })() : '';

  const bindCard = !linked ? `<section class="ref-v1-bind ${eligible.eligible?'eligible':'blocked'}">
    <div><small>HAVE A FRIEND'S CODE?</small><h3>${eligible.eligible?'LINK YOUR REFERRER':'REFERRAL ENTRY LOCKED'}</h3><p>${esc(eligible.reason || 'Enter one referral code while your account is eligible.')}</p></div>
    ${eligible.eligible ? `<div class="ref-v1-bind-form"><input id="referralCodeInput" maxlength="40" placeholder="DARKCITY-000001"><button onclick="action('referral_bind',{code:document.getElementById('referralCodeInput').value})">LINK CODE</button></div>` : ''}
  </section>` : '';

  const friendRows = rows.map(row => {
    const status = String(row.status || 'pending');
    const progress = Math.max(0,Math.min(100,Number(row.progress_percent || 0)));
    const claimed = !!row.referrer_claimed_at;
    const ready = !!row.claimable;
    return `<div class="ref-v1-friend ${ready?'ready':''}">
      <div class="ref-v1-avatar">👤</div>
      <div class="ref-v1-friend-main"><div><b>${esc(row.referred_name || ('Player #'+row.referred_player_id))}</b><span>ID #${esc(row.referred_player_id)}</span></div><div class="ref-v1-progress small"><i style="width:${progress}%"></i></div><small>${Number(row.progress_minutes||0)} / ${Number(row.required_playtime_minutes||0)} minutes played after invite</small></div>
      <div class="ref-v1-friend-status"><strong class="ref-v1-state ${status}">${claimed?'CLAIMED':ready?'REWARD READY':esc(status.toUpperCase())}</strong><span>${storeDate(row.accepted_at)}</span></div>
    </div>`;
  }).join('');

  return wrap('Referral', `
    <div class="ref-v1-shell">
      <section class="ref-v1-hero" style="background-image:linear-gradient(90deg,rgba(7,4,12,.95),rgba(13,7,17,.78),rgba(8,7,14,.48)),url('${asset(images.hero || 'newauth/bg-home.jpg')}')">
        <div class="ref-v1-hero-copy"><small>DARK CITY COMMUNITY PROGRAM</small><h2>PLAY TOGETHER.<br><em>EARN TOGETHER.</em></h2><p>Share your personal code with a new player. After they complete the verified playtime milestone, both players unlock rewards.</p>
          <div class="ref-v1-code"><span>YOUR REFERRAL CODE</span><b>${esc(code)}</b><button id="referralCopyState" onclick="copyReferralCode(${jsArg(code)})">COPY CODE</button></div>
        </div>
        <div class="ref-v1-hero-art"><img class="ref-v1-person" src="${asset(images.person || 'newauth/person.png')}" onerror="this.style.display='none'"><img class="ref-v1-graph" src="${asset(images.graph || 'newauths/graph.png')}" onerror="this.style.display='none'"></div>
      </section>

      <section class="ref-v1-stats">
        <div><span>TOTAL INVITES</span><b>${Number(stats.total||0)}</b><small>players linked</small></div>
        <div><span>IN PROGRESS</span><b>${Number(stats.pending||0)}</b><small>milestone tracking</small></div>
        <div><span>QUALIFIED</span><b>${Number(stats.qualified||0)+Number(stats.completed||0)}</b><small>milestones completed</small></div>
        <div class="claim"><span>READY TO CLAIM</span><b>${claimable}</b><button class="${claimable>0?'':'disabled'}" onclick="action('referral_claim_all',{})">CLAIM REWARDS</button></div>
      </section>

      <section class="ref-v1-rewards">
        <div class="ref-v1-reward-card orange"><img src="${asset(images.gift || 'newDonateShop/items/byvip.png')}" onerror="this.style.display='none'"><div><small>REFERRER REWARD • PER QUALIFIED FRIEND</small><h3>${esc(rewards.referrer_text || 'Configurable reward')}</h3><p>Claim once for every invited player who completes the milestone.</p></div></div>
        <div class="ref-v1-reward-card gold"><img src="${asset(images.coin || 'newDonateShop/header_coin.png')}" onerror="this.style.display='none'"><div><small>NEW PLAYER REWARD</small><h3>${esc(rewards.referred_text || 'Configurable reward')}</h3><p>The invited player receives this after completing the same milestone.</p></div></div>
      </section>

      ${bindCard}${linkedCard}

      <section class="ref-v1-list-panel"><div class="ref-v1-section-head"><div><small>YOUR NETWORK</small><h3>Invited Friends</h3></div><span>${Number(ref.required_playtime_minutes||0)} verified minutes required after code link</span></div>
        <div class="ref-v1-friends">${friendRows || `<div class="ref-v1-empty"><img src="${asset(images.graph || 'newauths/graph.png')}" onerror="this.style.display='none'"><b>No referrals yet</b><span>Share ${esc(code)} with a new player to start building your referral network.</span></div>`}</div>
      </section>

      <section class="ref-v1-rules"><div><b>01</b><span>ONE CODE ONLY</span><p>A new player can permanently link only one referrer.</p></div><div><b>02</b><span>NEW PLAYER WINDOW</span><p>Code entry is limited to ${Number(ref.rules?.bind_window_hours||0)} hours and ${Number(ref.rules?.max_bind_playtime_minutes||0)} minutes of playtime.</p></div><div><b>03</b><span>VERIFIED PLAYTIME</span><p>Rewards unlock only after ${Number(ref.required_playtime_minutes||0)} real tracked minutes after linking.</p></div><div><b>04</b><span>ANTI-ABUSE</span><p>Self-referral and duplicate identity abuse checks are enforced server-side.</p></div></section>
    </div>`);
}

function primeTime(sec){
  sec = Math.max(0, Number(sec || 0));
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  return `${days}D ${String(hours).padStart(2,'0')}H ${String(mins).padStart(2,'0')}M`;
}
window.primeTab = window.primeTab || 'prime';
window.setPrimeTab = function(tab){ window.primeTab = tab || 'prime'; render(); };
function renderPrime(){
  const pr = state.data?.prime || {};
  if(pr.loading) return wrap('Prime', `<div class="prime2-loading"><b>SYNCING PRIME MEMBERSHIP</b><span>Checking plans, expiry and connected benefits...</span></div>`);
  if(pr.error) return wrap('Prime', `<div class="prime2-loading error"><b>PRIME OFFLINE</b><span>${esc(pr.error)}</span></div>`);

  const active = pr.active === true || Number(pr.active||0) === 1;
  const membership = pr.membership || {};
  const tier = String(pr.tier || membership.prime_type || 'prime');
  const isPlus = active && tier === 'prime_plus';
  const daily = pr.daily || {};
  const rewards = Array.isArray(daily.rewards) ? daily.rewards : [];
  const plans = Array.isArray(pr.plans) ? pr.plans : [];
  const history = Array.isArray(pr.history) ? pr.history : [];
  const tierBenefits = pr.tier_benefits || {};
  const primeBenefits = Array.isArray(tierBenefits.prime) ? tierBenefits.prime : [];
  const plusBenefits = Array.isArray(tierBenefits.prime_plus) ? tierBenefits.prime_plus : [];
  const remaining = Number(membership.remaining_seconds || 0);
  const tab = window.primeTab || 'prime';

  const buyPlan = (kind) => {
    const filtered = plans.filter(p => String(p.product_key||'').includes(kind === 'prime_plus' ? 'prime_plus' : 'prime_') && (kind === 'prime_plus' || !String(p.product_key||'').includes('prime_plus')));
    const plan = filtered.find(p => Number(p.duration_days||0) === 30) || filtered[0];
    if(!plan) return `<button class="prime2-buy disabled" disabled>UNAVAILABLE</button>`;
    return `<button class="prime2-buy ${kind==='prime_plus'?'plus':'gold'}" onclick="action('prime_purchase',{productKey:${jsArg(plan.product_key)}})"><strong>${active?'EXTEND':'BUY'}</strong><span>🪙 ${Number(plan.price||0).toLocaleString()} DC</span></button>`;
  };

  const benefitList = (arr, plus=false) => arr.map(b => `<li><i>${esc(b.icon||'◆')}</i><span>${esc(b.title||'Benefit')}</span><em>${plus?'PLUS':'PRIME'}</em></li>`).join('');
  const rewardCards = rewards.map(r => `<article class="prime2-day ${esc(String(r.state||'locked'))}"><span>DAY ${Number(r.day||0)}</span><b>${esc(r.label||'Reward')}</b><small>${esc(r.reward_text||'')}</small></article>`).join('');
  const historyRows = history.slice(0,16).map(h => `<div class="prime2-history-row"><div><b>${esc(String(h.action||'activity').replaceAll('_',' ').toUpperCase())}</b><span>${esc(h.details||h.source||'Prime activity')}</span></div><strong>${storeDate(h.created_at)}</strong></div>`).join('') || `<div class="prime2-empty">No Prime history yet.</div>`;

  const tabs = [
    ['prime','♛','PRIME'],['prime_plus','★','PRIME PLUS'],['benefits','🎁','BENEFITS'],['daily','▣','DAILY REWARDS'],['history','↻','HISTORY'],['store','🛒','STORE']
  ].map(t => `<button class="${tab===t[0]?'active':''}" onclick="setPrimeTab('${t[0]}')"><i>${t[1]}</i>${t[2]}</button>`).join('');

  let content='';
  if(tab==='prime' || tab==='prime_plus'){
    content = `<div class="prime2-compare">
      <article class="prime2-tier prime">
        <div class="prime2-tier-title"><i>♛</i><div><small>STANDARD MEMBERSHIP</small><h2>PRIME</h2></div></div>
        <ul>${benefitList(primeBenefits,false)}</ul>
        <div class="prime2-plan-foot"><span>30 DAYS</span>${buyPlan('prime')}</div>
      </article>
      <article class="prime2-tier plus">
        <div class="prime2-tier-title"><i>☆</i><div><small>ULTIMATE MEMBERSHIP</small><h2>PRIME <em>PLUS</em></h2></div></div>
        <ul>${benefitList(plusBenefits,true)}</ul>
        <div class="prime2-plan-foot"><span>30 DAYS</span>${buyPlan('prime_plus')}</div>
      </article>
      <aside class="prime2-side">
        <div class="prime2-status"><span>ACTIVE PLAN</span><b class="${isPlus?'plus':''}">${active?(isPlus?'PRIME PLUS':'PRIME'):'NONE'}</b><hr><span>EXPIRES IN</span><strong>${active?primeTime(remaining):'NO ACTIVE PLAN'}</strong></div>
        <div class="prime2-character"><img class="prime2-person-img" src="${asset('newauth/person.png')}" onerror="this.style.display='none'"><div class="prime2-dc">DC</div><span>DARK CITY<br>ROLEPLAY</span></div>
      </aside>
    </div>`;
  } else if(tab==='benefits'){
    content = `<div class="prime2-benefit-grid"><section><div class="prime2-section-title gold">♛ PRIME BENEFITS</div><ul class="prime2-big-list">${benefitList(primeBenefits,false)}</ul></section><section><div class="prime2-section-title cyan">★ PRIME PLUS BENEFITS</div><ul class="prime2-big-list">${benefitList(plusBenefits,true)}</ul></section></div>`;
  } else if(tab==='daily'){
    const canClaim = active && daily.claimed_today !== true && Number(daily.claimed_today||0)!==1;
    content = `<section class="prime2-panel"><div class="prime2-panel-head"><div><small>7-DAY ROTATING TRACK</small><h2>DAILY REWARDS</h2></div><button class="prime2-claim ${canClaim?'':'disabled'}" ${canClaim?'':'disabled'} onclick="action('prime_claim_daily',{})">${daily.claimed_today?'CLAIMED TODAY':active?'CLAIM DAILY':'PRIME REQUIRED'}</button></div><div class="prime2-days">${rewardCards}</div><p class="prime2-note">Prime Plus receives enhanced cash and Dark Coin daily rewards automatically.</p></section>`;
  } else if(tab==='history'){
    content = `<section class="prime2-panel"><div class="prime2-panel-head"><div><small>MEMBERSHIP AUDIT TRAIL</small><h2>HISTORY</h2></div></div><div class="prime2-history">${historyRows}</div></section>`;
  } else {
    content = `<section class="prime2-panel prime2-store-link"><div><small>DARK CITY PREMIUM STORE</small><h2>BUY PRIME, PRIME PLUS & MORE</h2><p>Open Dark Store for membership plans, Battle Pass Premium, vehicles, cosmetics and Prime-only products.</p><button onclick="switchView('darkStore')">OPEN DARK STORE</button></div><div class="prime2-store-mark">DC</div></section>`;
  }

  return wrap('Prime', `<div class="prime2-shell">
    <div class="prime2-brand"><b>DC</b><span>DARK CITY ROLEPLAY</span></div>
    <nav class="prime2-tabs">${tabs}</nav>
    <img class="prime2-car-art" src="${asset('newDonateShop/items/carsFrame251.png')}" onerror="this.style.display='none'">
    ${content}
    <footer class="prime2-footer"><div>🛡️ <b>SECURE PURCHASES</b><span>SERVER VERIFIED</span></div><div>◆ <b>PREMIUM QUALITY</b><span>ENHANCED RP EXPERIENCE</span></div><div>◷ <b>INSTANT ACCESS</b><span>ACTIVATE IMMEDIATELY</span></div><div>🎧 <b>CONNECTED SUPPORT</b><span>DARK CITY SYSTEMS</span></div></footer>
  </div>`);
}

function renderAuth(){
  const chars = state.data.characters || [];
  const hasChar = chars.length > 0;
  const body = `
    <div class="flow-page">
      <div class="flow-left">
        <img src="${asset('newauths/logo.png')}" class="flow-logo" onerror="this.style.display='none'">
        <img src="${asset('newauths/monkey.png')}" class="flow-monkey" onerror="this.style.display='none'">
      </div>
      <div class="flow-card">
        <h2>Welcome to Dark City RP</h2>
        <p>Authorization required after loading screen.</p>
        ${hasChar ? `<button class="btn green bigbtn" onclick="action('auth_ok')">Authorize</button>` : `<button class="btn gold bigbtn" onclick="action('auth_ok')">Authorize</button>`}
        <button class="btn" onclick="action('create_character')">Create / Customize Character</button>
        <p class="muted small">Spawn Select will open after Authorize.</p>
      </div>
    </div>`;
  return wrap('Authorize', body);
}
function renderSpawnSelect(){
  const spawns = state.data.spawns || [
    {id:'last', label:'Last Location', icon:'📍'},
    {id:'legion', label:'Legion Square', icon:'🏙️'},
    {id:'airport', label:'Airport', icon:'✈️'},
    {id:'sandy', label:'Sandy Shores', icon:'🏜️'},
    {id:'paleto', label:'Paleto Bay', icon:'🌲'},
    {id:'hospital', label:'Hospital', icon:'🏥'}
  ];

  const artById = {
    last:'spawn-hd-0.png',
    legion:'spawn-hd-1.png',
    airport:'airport-spawn-hd.png',
    sandy:'spawn-hd-3.png',
    paleto:'spawn-hd-0.png',
    hospital:'spawn-hd-2.png',
    organization:'spawn-hd-3.png',
    house:'spawn-hd-1.png',
    family:'spawn-hd-2.png',
    faction:'spawn-hd-3.png'
  };

  const typeById = {
    last:'LAST LOCATION',
    legion:'CITY CENTER',
    airport:'AIRPORT',
    sandy:'SANDY SHORES',
    paleto:'PALETO BAY',
    hospital:'MEDICAL CENTER',
    organization:'ORGANIZATION',
    house:'PRIVATE RESIDENCE',
    family:'FAMILY',
    faction:'FACTION'
  };

  const body = `
    <div class="dc-spawn-screen">
      <div class="dc-spawn-backdrop"></div>
      <div class="dc-spawn-noise"></div>

      <header class="dc-spawn-header">
        <div class="dc-spawn-kicker"><span></span>DARK CITY ROLEPLAY</div>
        <h1>WHERE TO <strong>SPAWN?</strong></h1>
        <p>SELECT YOUR DESTINATION</p>
      </header>

      <button type="button" class="dc-spawn-close" aria-label="Close" onclick="closeUi()">×</button>

      <div class="dc-spawn-grid">
        ${spawns.map((s, i) => {
          const id = esc(s.id || 'last');
          const rawId = String(s.id || 'last').toLowerCase();
          const art = artById[rawId] || `spawn-${i % 4}.png`;
          const type = typeById[rawId] || 'SPAWN LOCATION';
          const label = esc(s.label || 'Spawn Location');
          const icon = esc(s.icon || '📍');
          const active = s.active === false || s.enabled === false || s.available === false ? false : true;
          return `
            <article class="dc-spawn-card ${active ? 'is-active' : 'is-inactive'}" data-dc-spawn="${id}" tabindex="0" aria-label="Spawn at ${label}">
              <div class="dc-spawn-art" style="background-image:url('${asset(`spawnSelect/${art}`)}')"></div>
              <div class="dc-spawn-shade"></div>
              <div class="dc-spawn-glow"></div>

              <div class="dc-spawn-index">${String(i + 1).padStart(2,'0')}</div>
              <div class="dc-spawn-status ${active ? '' : 'disabled'}"><i></i>${active ? 'AVAILABLE' : 'INACTIVE'}</div>

              <div class="dc-spawn-info">
                <div class="dc-spawn-type">${type}</div>
                <h2>${icon} ${label}</h2>
                <div class="dc-spawn-line"></div>
                <button type="button" class="dc-spawn-button ${active ? '' : 'disabled'}" data-dc-spawn="${id}" ${active ? '' : 'disabled'}>
                  <span>${active ? 'SPAWN HERE' : 'UNAVAILABLE'}</span><b>↗</b>
                </button>
              </div>
            </article>`;
        }).join('')}
      </div>

      <div class="dc-spawn-footer">
        <span><b>DC</b> SPAWN SELECT</span>
        <span>CHOOSE A LOCATION TO CONTINUE</span>
        <span><i></i> SYSTEMS ONLINE</span>
      </div>
    </div>`;

  const shell=document.querySelector('.shell');
  const navEl=document.getElementById('nav');
  const content=document.getElementById('content');
  const menuApp=document.getElementById('app');
  if(menuApp) menuApp.style.zoom='1';
  if(shell){
    shell.classList.remove('dc-home-mode','flow-mode');
    shell.classList.add('dc-spawn-mode');
  }
  if(navEl) navEl.innerHTML='';
  if(content){
    content.style.removeProperty('--page-bg');
    content.setAttribute('data-view','spawnSelect');
    content.innerHTML=body;
    content.scrollTop=0;
  }
}
function renderCustomization(){
  return wrap('Character Creation',
    `<div class="flow-page">
      <div class="flow-left">${imgBox('newcustomization/bg-home.jpg','flow-img')}</div>
      <div class="flow-card">
        <h2>Create / Customize Character</h2>
        <p>Use this only for new character creation or customization.</p>
        <button class="btn green bigbtn" onclick="action('open_clothing',{})">Open Creator</button>
        <button class="btn" onclick="action('auth_ok')">Continue to Spawn Select</button>
      </div>
    </div>`);
}
function renderDeath(){
  return wrap('Death Screen', `<div class="r-card hero-card"><h2>You are unconscious</h2><button class="btn" onclick="action('ems_call')">Call EMS</button><button class="btn red" onclick="action('respawn')">Respawn Hospital</button></div>`);
}

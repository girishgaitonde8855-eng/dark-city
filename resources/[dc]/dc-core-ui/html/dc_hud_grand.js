(function(){
  function money(n){
    n = Number(n || 0);
    return '$' + n.toLocaleString();
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }
  function stars(n){
    n = Math.max(0, Math.min(5, Number(n || 0)));
    var out = '';
    for (var i=1;i<=5;i++) out += '<span class="' + (i<=n ? 'on' : '') + '">★</span>';
    return out;
  }
  function fmt(sec){
    sec = Math.max(0, Number(sec || 0));
    var h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = Math.floor(sec%60);
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }
  function renderGrandHud(data){
    data = data || {};
    var p = data.player || {};
    var meta = p.metadata || {};
    var wanted = Number(p.wanted_stars != null ? p.wanted_stars : (meta.wanted_stars != null ? meta.wanted_stars : (meta.wanted || meta.wantedlevel || meta.wantedLevel || 0)));
    var daily = data.daily_reward || null;
    var now = new Date();
    var time = now.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
    var date = now.toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric'});
    var id = p.player_id || data.player_id || 0;
    var online = (data.server && data.server.online) || 0;
    var max = (data.server && data.server.max) || 48;
    var hud = document.getElementById('hud');
    if (!hud) return;
    hud.classList.remove('hidden');
    hud.innerHTML = ''+
      '<div class="dc-grandhud">'+
        '<div class="dcgh-brand">DARK CITY RP <span>★</span></div>'+
        '<div class="dcgh-meta"><span>ID: '+esc(id)+'</span><span>👥 '+esc(online)+'/'+esc(max)+'</span></div>'+
        '<div class="dcgh-moneybox">'+
          '<div class="dcgh-money cash"><span>'+money(p.cash)+'</span><span class="ico">$</span></div>'+
          '<div class="dcgh-money bank"><span>'+money(p.bank)+'</span><span class="ico">🏦</span></div>'+
        '</div>'+
        '<div class="dcgh-wanted"><span>WANTED</span><div class="dcgh-stars">'+stars(wanted)+'</div></div>'+
        '<div class="dcgh-sideicons"><div title="Voice">🎙</div><div title="Phone">📱</div><div title="Radio">📻</div></div>'+
      '</div>'+
      (daily ? '<div class="dcgh-dailycard"><div class="small">Remaining</div><div class="timer">'+fmt(daily.remaining_seconds)+'</div><div class="reward">Reward '+money(daily.reward_amount || 0)+'</div></div>' : '')+
      '<div class="dcgh-bottomtime"><b>'+esc(time)+'</b><span>'+esc(date)+'</span></div>';
  }
  try { renderHud = renderGrandHud; } catch(e) {}
  window.renderHud = renderGrandHud;
})();

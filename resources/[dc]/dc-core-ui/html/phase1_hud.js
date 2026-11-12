(() => {
  const root = document.getElementById('hud');
  if (!root) return;

  const P1 = {
    visible: true,
    privacyHideId: false,
    playerIdDisplay: true,
    streamerMode: false,
    hudScale: 100,
    vehicleHudVisible: true,
    damageIndicator: true,
    playerId: 0,
    online: 0,
    max: 64,
    wanted: 0,
    cash: 0,
    bank: 0,
    moneyDelta: null,
    moneyDeltaUntil: 0,
    vehicle: { inVehicle: false },
    weapon: { armed: false, clip: 0, reserve: 0, total: 0 },
    voice: { talking: false, mode: 1, label: 'Normal', radioActive: false, radioChannel: 0 },
    location: { street: '', area: '' },
    zones: { green: false, red: false, fishing: false },
    timers: {},
    dailyReward: null,
    sharedNumberTimer: null,
    tick: null,
    clockTick: null,
  };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = (n) => '$ ' + Number(n || 0).toLocaleString('en-US');
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (sec) => {
    sec = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const asset = (p) => `img/${p}`;

  // Keep the scale variable available before the HUD shell is first rendered.
  root.style.setProperty('--hud-scale', '1');

  function starSvg(on) {
    return `<svg viewBox="0 0 18 17" aria-hidden="true"><path d="M8.95283 .891885c.14968-.460655.80138-.460655.95106 0l1.65731 5.100815a.5.5 0 0 0 .4756.34549h5.3633c.4843 0 .6857.61981.2939.90451l-4.339 3.15249a.5.5 0 0 0-.1817.559l1.6574 5.1008c.1497.4607-.3776.8437-.7694.559l-4.33905-3.1525a.5.5 0 0 0-.58778 0L4.79546 16.614c-.39186.2847-.9191-.0983-.76942-.559l1.65735-5.1008a.5.5 0 0 0-.18164-.559L1.16274 7.2427c-.391853-.2847-.190465-.90451.2939-.90451h5.36331a.5.5 0 0 0 .47553-.34549L8.95283.891885Z" ${on ? 'fill="#FE2A2A"' : 'fill="none" stroke="white" stroke-opacity=".20"'}/></svg>`;
  }

  function applyHudScale(value) {
    P1.hudScale = Math.max(70, Math.min(130, Number(value || 100)));
    const scale = String(P1.hudScale / 100);
    root.style.setProperty('--hud-scale', scale);
    const shell = document.getElementById('p1hud');
    if (shell) shell.style.setProperty('--hud-scale', scale);
    return P1.hudScale;
  }

  function createShell() {
    root.innerHTML = `
      <div id="p1hud" class="p1hud" style="--hud-scale:${P1.hudScale / 100}">
        <section class="p1-right">
          <div class="p1-brand">
            <img src="${asset('newhud/logo.png')}" alt="">
            <div class="p1-brand-copy"><strong>DARK CITY</strong><span>ROLE PLAY</span></div>
          </div>
          <div class="p1-info-row">
            <div class="p1-info"><div><img src="${asset('newhud/id.svg')}" alt=""><b id="p1-id">0</b></div><span>ID</span></div>
            <div class="p1-info"><div><img src="${asset('newhud/online.svg')}" alt=""><b id="p1-online">0</b></div><span>ONLINE</span></div>
            <div class="p1-info"><div><img src="${asset('newhud/time.svg')}" alt=""><b id="p1-time">00:00</b></div><span id="p1-date">00.00.0000</span></div>
          </div>
          <div id="p1-wanted" class="p1-wanted"></div>
          <div class="p1-money-wrap">
            <div class="p1-money"><span id="p1-cash">$ 0</span><img src="${asset('newhud/cash.svg')}" alt=""></div>
            <div class="p1-bank"><span>BANK</span><b id="p1-bank">$ 0</b></div>
            <div id="p1-delta" class="p1-delta"></div>
          </div>
          <div id="p1-ammo" class="p1-ammo hidden"><span><b id="p1-clip">0</b> &nbsp;/&nbsp; <i id="p1-reserve">0</i></span><img src="${asset('newhud/ammo.svg')}" alt=""></div>
          <div id="p1-daily" class="p1-daily hidden"><span>DAILY REWARD</span><b id="p1-daily-time">00:00:00</b><small>5 HOUR ONLINE REWARD</small></div>
        </section>

        <section class="p1-left-anchor">
          <div class="p1-left">
            <div class="p1-location">
              <img src="${asset('newhud/map.svg')}" alt="">
              <div><b id="p1-street">LOS SANTOS</b><span id="p1-area">SAN ANDREAS</span></div>
            </div>
            <div class="p1-voice-row">
              <div id="p1-voice" class="p1-voice"><span class="mic-shape"></span><b id="p1-voice-label">NORMAL</b></div>
              <div id="p1-radio" class="p1-radio hidden"><span>RADIO</span><b id="p1-radio-channel">0</b></div>
            </div>
            <div id="p1-zones" class="p1-zones"></div>
            <div id="p1-worktimer" class="p1-worktimer hidden"><span class="p1-clock-icon">◷</span><b>00:00</b><small>WORK</small></div>
          </div>
        </section>

        <section id="p1-prison" class="p1-prison hidden">
          <div class="p1-ring"><svg viewBox="0 0 42 42"><circle class="bg" cx="21" cy="21" r="19"/><circle class="fg" cx="21" cy="21" r="19"/></svg><img src="${asset('hud/artimer/time.svg')}" alt=""></div>
          <div><span id="p1-prison-label">ARREST TIME</span><b id="p1-prison-value">00:00</b><small id="p1-prison-reason"></small></div>
        </section>

        <section id="p1-quest" class="p1-quest hidden"><span id="p1-quest-title">QUEST</span><div><b id="p1-quest-sub">OBJECTIVE</b><i></i></div><small id="p1-quest-time"></small></section>
        <section id="p1-capture" class="p1-capture hidden"><span>◷</span><div><small id="p1-capture-label">CAPTURE</small><b id="p1-capture-time">00:00</b></div></section>

        <section id="p1-shared-number" class="p1-shared-number hidden">
          <span>CONTACT SHARED</span>
          <b id="p1-shared-name">NEARBY PLAYER</b>
          <strong id="p1-shared-value">000000</strong>
          <small>This number was shared with you</small>
        </section>

        <div id="p1-damage-indicator" class="p1-damage-indicator"></div>
        <div id="p1-damage-dealt" class="p1-damage-dealt" aria-live="polite"></div>

        <section id="p1-speedometer" class="p1-speedometer p1-speedometer-premium hidden">
          <div class="p1s-head"><div class="p1s-live" aria-hidden="true"><i></i></div><div class="p1s-name" id="p1-vehicle-name">YOUR VEHICLE</div></div>
          <div class="p1s-main">
            <div class="p1s-gauge">
              <svg class="p1s-ring" viewBox="0 0 220 220" aria-hidden="true"><circle class="p1s-ring-track" cx="110" cy="110" r="96"/><circle id="p1-speed-ring" class="p1s-ring-value" cx="110" cy="110" r="96"/></svg>
              <div class="p1s-speed"><b id="p1-speed">0</b><span>KM/H</span></div>
              <div class="p1s-speed-limit"><span>MAX</span><b id="p1-speed-limit">240</b></div>
            </div>
            <div class="p1s-stats">
              <div class="p1s-stat p1s-fuel-stat"><div class="p1s-stat-top"><span>FUEL</span><b><strong id="p1-fuel">0</strong> <small>/ <i id="p1-fuel-max">65</i> L</small></b></div><div class="p1s-bar"><i id="p1-fuel-fill"></i></div></div>
              <div class="p1s-stat"><div class="p1s-stat-top"><span>ENGINE</span><b id="p1-engine-label">OFF</b></div><div class="p1s-bar"><i id="p1-engine-health"></i></div></div>
              <div class="p1s-rpm"><div><span>ENGINE RPM</span><b id="p1-rpm-value">0.0</b></div><div class="p1s-rpm-track"><i id="p1-rpm-fill"></i></div></div>
              <div class="p1s-gear"><span>GEAR</span><b id="p1-gear">N</b></div>
              <div class="p1s-indicators">
                <div id="p1-engine-ind" title="Engine"><span class="p1s-ind-icon">⏻</span><small id="p1-engine-ind-label">ENGINE OFF</small></div>
                <div id="p1-belt" title="Seatbelt"><span class="p1s-ind-icon">⌁</span><small>BELT</small></div>
                <div id="p1-lock" title="Lock"><span class="p1s-ind-icon">▣</span><small>LOCK</small></div>
                <div id="p1-light" title="Lights"><span class="p1s-ind-icon">◉</span><small>LIGHT</small></div>
              </div>
            </div>
          </div>
          <div class="p1s-footer"><span><i class="p1s-dot"></i> DARK CITY RP</span><span id="p1-engine-status">ENGINE OFF</span></div>
        </section>
      </div>`;
  }

  function el(id) { return document.getElementById(id); }
  function ensureShell() {
    if (!document.getElementById('p1hud')) createShell();
  }

  function renderClock() {
    ensureShell();
    const d = new Date();
    if (el('p1-time')) el('p1-time').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (el('p1-date')) el('p1-date').textContent = `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
  }

  function renderWanted() {
    ensureShell();
    const n = Math.max(0, Math.min(5, Number(P1.wanted || 0)));
    el('p1-wanted').innerHTML = n > 0 ? Array.from({length:5}, (_,i)=>starSvg(i<n)).join('') : '';
  }

  function renderState() {
    ensureShell();
    el('p1-id').textContent = (P1.privacyHideId || P1.streamerMode || !P1.playerIdDisplay) ? 'HIDDEN' : (P1.playerId || 0);
    el('p1-online').textContent = `${P1.online || 0}/${P1.max || 64}`;
    el('p1-cash').textContent = P1.streamerMode ? '$ ••••••' : money(P1.cash);
    el('p1-bank').textContent = P1.streamerMode ? '$ ••••••' : money(P1.bank);
    renderWanted();
  }

  function renderDailyReward() {
    ensureShell();
    const box = el('p1-daily');
    const value = el('p1-daily-time');
    if (!box || !value) return;
    const daily = P1.dailyReward;
    const remaining = daily ? Math.max(0, Number(daily.remaining_seconds || 0)) : 0;
    // Keep the HUD slot alive while the server is initializing the default
    // daily reward state. Once the server reports the real timer it replaces this.
    box.classList.toggle('hidden', false);
    value.textContent = daily && remaining > 0 ? fmt(remaining) : '05:00:00';
  }

  function renderTelemetry() {
    ensureShell();
    const v = P1.vehicle || {};
    const w = P1.weapon || {};
    const voice = P1.voice || {};
    const loc = P1.location || {};

    el('p1-street').textContent = loc.street || 'LOS SANTOS';
    el('p1-area').textContent = loc.area || 'SAN ANDREAS';
    el('p1-voice').classList.toggle('speaking', voice.talking === true);
    el('p1-voice-label').textContent = String(voice.label || `MODE ${voice.mode || 1}`).toUpperCase();
    el('p1-radio').classList.toggle('hidden', !(voice.radioChannel > 0));
    el('p1-radio').classList.toggle('active', voice.radioActive === true);
    el('p1-radio-channel').textContent = voice.radioChannel || 0;

    el('p1-ammo').classList.toggle('hidden', !w.armed || Number(w.total || 0) <= 0);
    el('p1-clip').textContent = w.clip || 0;
    el('p1-reserve').textContent = w.reserve || 0;

    el('p1-speedometer').classList.toggle('hidden', !v.inVehicle || !P1.vehicleHudVisible);
    if (v.inVehicle) {
      const speed = Math.max(0, Number(v.speed || 0));
      const maxSpeed = Math.max(1, Number(v.maxSpeed || 1));
      const speedPct = Math.max(0, Math.min(100, (speed / maxSpeed) * 100));
      const fuel = Math.max(0, Number(v.fuel || 0));
      const maxFuel = Math.max(1, Number(v.maxFuel || 65));
      const fuelPct = Math.max(0, Math.min(100, (fuel / maxFuel) * 100));
      const ring = el('p1-speed-ring');
      const circumference = 2 * Math.PI * 96;
      el('p1-speed').textContent = speed;
      el('p1-speed-limit').textContent = Math.round(maxSpeed);
      el('p1-speed-limit').setAttribute('aria-label', `TOP SPEED ${Math.round(maxSpeed)} kilometres per hour`);
      if (ring) ring.style.strokeDashoffset = String(circumference * (1 - speedPct / 100));
      el('p1-vehicle-name').textContent = String(v.name || v.vehicleName || 'YOUR VEHICLE').toUpperCase();
      el('p1-fuel').textContent = Math.round(fuel);
      el('p1-fuel-max').textContent = Math.round(maxFuel);
      el('p1-fuel-fill').style.width = `${fuelPct}%`;
      el('p1-fuel-fill').className = fuelPct <= 15 ? 'danger' : (fuelPct <= 30 ? 'warn' : '');
      el('p1-belt').classList.toggle('active', v.seatbelt === true);
      const engineOn = v.engine === true || v.engine === 1 || v.engine === 'true' || v.engine === '1';
      el('p1-engine-ind').classList.toggle('active', engineOn);
      el('p1-engine-ind').classList.toggle('inactive', !engineOn);
      el('p1-engine-ind-label').textContent = engineOn ? 'ENGINE ON' : 'ENGINE OFF';
      el('p1-engine-label').textContent = engineOn ? 'ON' : 'OFF';
      el('p1-engine-status').textContent = engineOn ? 'ON' : 'OFF';
      el('p1-gear').textContent = String(v.gear ?? 'N');
      const locked = v.locked === true || v.locked === 1 || v.locked === 'true';
      const lightsOn = v.lights === true || v.lights === 1 || v.lights === 'true';
      el('p1-lock').classList.toggle('active', locked);
      el('p1-lock').classList.toggle('inactive', !locked);
      el('p1-lock').querySelector('small').textContent = locked ? 'LOCKED' : 'UNLOCK';
      el('p1-light').classList.toggle('active', lightsOn);
      el('p1-light').classList.toggle('inactive', !lightsOn);
      el('p1-light').querySelector('small').textContent = lightsOn ? 'LIGHT ON' : 'LIGHT OFF';
      const rpm = Math.max(0, Math.min(1, Number(v.rpm || 0)));
      el('p1-rpm-value').textContent = (rpm * 8).toFixed(1);
      el('p1-rpm-fill').style.width = `${rpm * 100}%`;
      el('p1-rpm-fill').className = rpm > .82 ? 'redline' : '';
      el('p1-engine-health').style.width = `${Math.max(0, Math.min(100, Number(v.engineHealth || 0)))}%`;
    }

    renderZones();
  }

  function renderZones() {
    ensureShell();
    const parts = [];
    if (P1.zones.green) parts.push(`<div class="green"><img src="${asset('newhud/greenzone.svg')}" alt="">GREEN ZONE</div>`);
    if (P1.zones.red) parts.push(`<div class="red"><img src="${asset('newhud/redzone.svg')}" alt="">RED ZONE</div>`);
    if (P1.zones.fishing) parts.push(`<div class="fish"><img src="${asset('newhud/fishzone.svg')}" alt="">FISHING PLACE</div>`);
    el('p1-zones').innerHTML = parts.join('');
  }

  function setTimer(name, data) {
    const seconds = Math.max(0, Math.floor(Number(data.seconds || 0)));
    if (seconds <= 0) return clearTimer(name);
    P1.timers[name] = {
      name,
      remaining: seconds,
      total: seconds,
      label: data.label || name.toUpperCase(),
      reason: data.reason || '',
      subtitle: data.subtitle || '',
      at: Date.now(),
    };
    renderTimers();
  }

  function clearTimer(name) {
    delete P1.timers[name];
    renderTimers();
  }

  function timerRemaining(t) {
    if (!t) return 0;
    return Math.max(0, t.remaining - Math.floor((Date.now() - t.at) / 1000));
  }

  function renderTimers() {
    ensureShell();
    const prison = P1.timers.prison;
    const pRem = timerRemaining(prison);
    el('p1-prison').classList.toggle('hidden', !prison || pRem <= 0);
    if (prison && pRem > 0) {
      el('p1-prison-label').textContent = prison.label || 'ARREST TIME';
      el('p1-prison-value').textContent = fmt(pRem);
      el('p1-prison-reason').textContent = prison.reason || '';
      const pct = prison.total > 0 ? (pRem / prison.total) : 0;
      el('p1-prison').style.setProperty('--ring-offset', String(120 - (120 * pct)));
    }

    const work = P1.timers.work;
    const wRem = timerRemaining(work);
    el('p1-worktimer').classList.toggle('hidden', !work || wRem <= 0);
    if (work && wRem > 0) {
      el('p1-worktimer').querySelector('b').textContent = fmt(wRem);
      el('p1-worktimer').querySelector('small').textContent = work.label || 'WORK';
    }

    const quest = P1.timers.quest;
    const qRem = timerRemaining(quest);
    el('p1-quest').classList.toggle('hidden', !quest || qRem <= 0);
    if (quest && qRem > 0) {
      el('p1-quest-title').textContent = quest.label || 'QUEST';
      el('p1-quest-sub').textContent = quest.subtitle || 'OBJECTIVE ACTIVE';
      el('p1-quest-time').textContent = fmt(qRem);
    }

    const capture = P1.timers.capture;
    const cRem = timerRemaining(capture);
    el('p1-capture').classList.toggle('hidden', !capture || cRem <= 0);
    if (capture && cRem > 0) {
      el('p1-capture-label').textContent = capture.label || 'CAPTURE';
      el('p1-capture-time').textContent = fmt(cRem);
    }

    Object.entries(P1.timers).forEach(([k,t]) => { if (timerRemaining(t) <= 0) delete P1.timers[k]; });
  }

  function showDelta(delta, account) {
    ensureShell();
    delta = Number(delta || 0);
    if (!delta) return;
    const d = el('p1-delta');
    d.textContent = `${delta > 0 ? '+' : '-'} ${money(Math.abs(delta)).replace('$ ','$')}`;
    d.className = `p1-delta show ${delta > 0 ? 'plus' : 'minus'}`;
    d.dataset.account = account || 'cash';
    clearTimeout(P1.moneyDeltaUntil);
    P1.moneyDeltaUntil = setTimeout(() => { d.className = 'p1-delta'; }, 2600);
  }

  createShell();
  renderClock();
  renderState();
  renderTelemetry();
  P1.clockTick = setInterval(() => {
    renderClock();
    if (P1.dailyReward && Number(P1.dailyReward.remaining_seconds || 0) > 0) {
      P1.dailyReward.remaining_seconds = Math.max(0, Number(P1.dailyReward.remaining_seconds || 0) - 1);
      renderDailyReward();
    }
  }, 1000);
  P1.tick = setInterval(renderTimers, 250);

  window.addEventListener('message', (event) => {
    const m = event.data || {};
    if (m.action === 'hud') {
      const p = m.data?.player || {};
      const s = m.data?.server || {};
      P1.playerId = p.player_id ?? P1.playerId;
      P1.online = s.online ?? P1.online;
      P1.max = s.max ?? P1.max;
      P1.cash = p.cash ?? P1.cash;
      P1.bank = p.bank ?? P1.bank;
      P1.wanted = p.wanted_stars ?? P1.wanted;
      P1.dailyReward = m.data?.daily_reward || null;
      renderState();
      renderDailyReward();
    }
    if (m.action === 'hudVisible' || m.action === 'phase1:visible') {
      P1.visible = m.value !== false;
      root.classList.toggle('hidden', !P1.visible);
    }
    if (m.action === 'setting') {
      if (m.key === 'privacy_hide_id') P1.privacyHideId = m.value === true || String(m.value).toLowerCase() === 'true' || String(m.value) === '1';
      if (m.key === 'player_id_display') P1.playerIdDisplay = m.value === true || String(m.value).toLowerCase() === 'true' || String(m.value) === '1';
      if (m.key === 'streamer_mode') P1.streamerMode = m.value === true || String(m.value).toLowerCase() === 'true' || String(m.value) === '1';
      if (m.key === 'hud_scale') {
        applyHudScale(m.value);
      }
      if (m.key === 'vehicle_hud') P1.vehicleHudVisible = m.value === true || String(m.value).toLowerCase() === 'true' || String(m.value) === '1';
      if (m.key === 'damage_indicator') P1.damageIndicator = m.value === true || String(m.value).toLowerCase() === 'true' || String(m.value) === '1';
      renderState();
      renderTelemetry();
    }
    if (m.action === 'phase1:sharedNumber') {
      ensureShell();
      const box = el('p1-shared-number');
      el('p1-shared-name').textContent = String(m.name || 'Nearby player').toUpperCase();
      el('p1-shared-value').textContent = String(m.number || '');
      box.classList.remove('hidden');
      clearTimeout(P1.sharedNumberTimer);
      const duration = Math.max(3, Math.min(30, Number(m.duration || 10)));
      P1.sharedNumberTimer = setTimeout(() => box.classList.add('hidden'), duration * 1000);
    }
    if (m.action === 'phase1:damage' && P1.damageIndicator) {
      const d = el('p1-damage-indicator');
      if (d) {
        const dir = String(m.direction || 'front');
        d.className = `p1-damage-indicator show ${dir}`;
        clearTimeout(d._damageTimer);
        d._damageTimer = setTimeout(()=>{ d.className = 'p1-damage-indicator'; }, 450);
      }
    }
    if (m.action === 'phase1:damageDealt') {
      const holder = el('p1-damage-dealt');
      if (holder) {
        const item = document.createElement("div");
        const amount = Math.max(1, Math.round(Number(m.amount || 0)));
        const armor = Math.max(0, Math.round(Number(m.armor || 0)));
        item.className = 'p1-damage-float' + (m.fatal ? ' fatal' : '');
        item.textContent = '-' + amount;
        if (armor > 0) {
          const detail = document.createElement("small");
          detail.textContent = 'ARMOR -' + armor;
          item.appendChild(detail);
        }
        holder.appendChild(item);
        setTimeout(() => item.remove(), 1000);
      }
    }

    if (m.action === 'phase1:state') {
      P1.playerId = m.playerId ?? P1.playerId;
      P1.online = m.online ?? P1.online;
      P1.max = m.max ?? P1.max;
      P1.wanted = m.wanted ?? P1.wanted;
      P1.cash = m.cash ?? P1.cash;
      P1.bank = m.bank ?? P1.bank;
      renderState();
    }
    if (m.action === 'phase1:moneySync') {
      P1.cash = m.cash ?? P1.cash;
      P1.bank = m.bank ?? P1.bank;
      renderState();
    }
    if (m.action === 'phase1:money') {
      P1.cash = m.cash ?? P1.cash;
      P1.bank = m.bank ?? P1.bank;
      renderState();
      showDelta(m.delta, m.account);
    }
    if (m.action === 'phase1:seatbelt') {
      P1.vehicle.seatbelt = m.value === true;
      renderTelemetry();
    }
    if (m.action === 'phase1:telemetry') {
      P1.vehicle = m.vehicle || P1.vehicle;
      P1.weapon = m.weapon || P1.weapon;
      P1.voice = m.voice || P1.voice;
      P1.location = m.location || P1.location;
      if (m.zones) P1.zones = Object.assign(P1.zones, m.zones);
      renderTelemetry();
    }
    if (m.action === 'phase1:zone') {
      P1.zones[m.zone] = m.enabled === true;
      renderZones();
    }
    if (m.action === 'phase1:timer') setTimer(String(m.timer || ''), m);
    if (m.action === 'phase1:timerClear') clearTimer(String(m.timer || ''));
  });
})();

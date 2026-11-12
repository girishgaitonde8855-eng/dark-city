local QBCore = exports['qb-core']:GetCoreObject()

local function safeQuery(q, p)
    local ok, res = pcall(function() return MySQL.query.await(q, p or {}) end)
    if ok then return res or {} end
    print('[dc-core-ui] SQL error: '..tostring(res))
    return {}
end

local function safeWrite(q, p)
    local ok, res = pcall(function() return MySQL.query.await(q, p or {}) end)
    if ok then return true, res end
    print('[dc-core-ui] SQL write error: '..tostring(res))
    return false, res
end

local function safeSingle(q, p)
    local ok, res = pcall(function() return MySQL.single.await(q, p or {}) end)
    if ok then return res end
    print('[dc-core-ui] SQL error: '..tostring(res))
    return nil
end

local function notify(src, msg, typ)
    TriggerClientEvent('QBCore:Notify', src, msg, typ or 'primary')
end

local function getLicense(src)
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if id:sub(1,8) == 'license:' then return id end
    end
end

local function getPid(src)
    -- V5: use the same visible Dark City ID shown in HUD/M Menu first.
    local P = QBCore.Functions.GetPlayer(src)
    if P then
        local pd = P.PlayerData or {}
        if pd.citizenid then
            local row = safeSingle('SELECT player_id FROM dc_players WHERE citizenid=? LIMIT 1', { pd.citizenid })
            if row and tonumber(row.player_id or 0) > 0 then return tonumber(row.player_id) end
        end
    end
    local lic = getLicense(src)
    if lic then
        local row = safeSingle('SELECT player_id FROM dc_players WHERE license=? LIMIT 1', { lic })
        if row and tonumber(row.player_id or 0) > 0 then return tonumber(row.player_id) end
    end
    if P then
        local pd = P.PlayerData or {}
        local md = pd.metadata or {}
        local mid = tonumber(md.player_id or md.playerid or md.permanent_id or md.dcid or 0) or 0
        if mid > 0 then return mid end
    end
    local ok, pid = pcall(function() return exports['dc-identity']:GetPlayerId(src) end)
    if ok and tonumber(pid) and tonumber(pid) > 0 then return tonumber(pid) end
    ok, pid = pcall(function() return exports['dc-identity']:GetPermanentPlayerId(src) end)
    if ok and tonumber(pid) and tonumber(pid) > 0 then return tonumber(pid) end
    return 0
end

local function addUnique(t, v)
    v = tonumber(v or 0) or 0
    if v <= 0 then return end
    for _, x in ipairs(t) do if tonumber(x) == v then return end end
    t[#t+1] = v
end

local function getPidCandidates(src)
    local ids = {}
    addUnique(ids, getPid(src))
    local P = QBCore.Functions.GetPlayer(src)
    if P and P.PlayerData then
        local pd = P.PlayerData
        local md = pd.metadata or {}
        addUnique(ids, md.player_id)
        addUnique(ids, md.playerid)
        addUnique(ids, md.permanent_id)
        addUnique(ids, md.dcid)
        if pd.citizenid then
            local row = safeSingle('SELECT player_id FROM dc_players WHERE citizenid=? LIMIT 1', { pd.citizenid })
            if row then addUnique(ids, row.player_id) end
        end
    end
    local lic = getLicense(src)
    if lic then
        local row = safeSingle('SELECT player_id FROM dc_players WHERE license=? LIMIT 1', { lic })
        if row then addUnique(ids, row.player_id) end
    end
    return ids
end


local function getSourceByPid(pid)
    pid = tonumber(pid or 0) or 0
    if pid <= 0 then return nil end
    for _, s in ipairs(QBCore.Functions.GetPlayers()) do
        if getPid(s) == pid then return s end
    end
end

local function familyRankName(rank)
    rank = tonumber(rank or 1) or 1
    local names = {[1]='Recruit',[2]='Member',[3]='Senior Member',[4]='Trusted',[5]='Enforcer',[6]='Manager',[7]='Captain',[8]='Underboss',[9]='Deputy',[10]='Leader'}
    return names[rank] or 'Member'
end

local function ensureFamilyRanks(fid)
    fid = tonumber(fid or 0) or 0
    if fid <= 0 then return end
    local defaults = {
        [1]={0,0,0,0,0,0,0},[2]={0,0,0,0,0,0,0},[3]={0,0,0,0,0,0,0},[4]={0,0,0,0,0,0,0},
        [5]={1,1,0,0,0,0,1},[6]={1,1,0,0,0,0,1},[7]={2,1,1,1,0,0,2},[8]={2,2,1,1,1,1,2},[9]={3,3,1,1,1,1,3},[10]={3,3,1,1,1,1,3}
    }
    for i=1,10 do
        local d = defaults[i]
        safeQuery([[INSERT IGNORE INTO dc_family_ranks (family_id,rank_id,rank_name,access_house,access_furniture,access_clothes,access_bizwar,access_member_management,access_money,vehicle_access) VALUES (?,?,?,?,?,?,?,?,?,?)]],
            {fid,i,familyRankName(i),d[1],d[2],d[3],d[4],d[5],d[6],d[7]})
    end
end

local function getCharName(P, src)
    if not P then return GetPlayerName(src) or 'Player' end
    local c = P.PlayerData.charinfo or {}
    local n = ((c.firstname or '')..' '..(c.lastname or '')):gsub('^%s+',''):gsub('%s+$','')
    return n ~= '' and n or (GetPlayerName(src) or 'Player')
end

local function getWantedStars(pid)
    pid = tonumber(pid or 0) or 0
    if pid <= 0 then return 0 end
    local r = safeSingle('SELECT stars FROM dc_lspd_wanted WHERE target_player_id=? AND status=? ORDER BY id DESC LIMIT 1', { pid, 'active' })
    return math.max(0, math.min(5, tonumber(r and r.stars or 0) or 0))
end

local DailyRuntime = {} -- server-monotonic online-time tracker; never use client countdown as authority

local DailyTiers = {
    ['3h'] = { id='3h', label='3 Hours Play', required_seconds=10800, reward=50000 },
    ['5h'] = { id='5h', label='5 Hours Play', required_seconds=18000, reward=70000 },
    ['7h'] = { id='7h', label='7 Hours Play', required_seconds=25200, reward=90000 },
    ['9h'] = { id='9h', label='9 Hours Play', required_seconds=32400, reward=120000 },
}

local function getActiveDailyReward(pid)
    pid = tonumber(pid or 0) or 0
    if pid <= 0 then return nil end
    local r = safeSingle([[SELECT * FROM dc_daily_reward_state WHERE player_id=? AND status='active' LIMIT 1]], { pid })
    if not r then return nil end

    local required = tonumber(r.required_seconds or 0) or 0
    local played = tonumber(r.seconds_played or 0) or 0
    local runtime = DailyRuntime[pid]
    if runtime then played = math.max(played, math.floor(runtime.played or 0)) end
    r.live_seconds_played = math.min(required, played)
    r.remaining_seconds = math.max(0, required - r.live_seconds_played)
    return r
end

local function getFactionMembership(citizenid)
    if not citizenid or citizenid == '' then return { kind='none' } end
    local org = safeSingle([[SELECT m.org AS name, COALESCE(o.label, m.org) AS label, m.rank,
            COALESCE(r.rank_name, CONCAT('Rank ', m.rank)) AS rank_name
        FROM dc_org_members m
        LEFT JOIN dc_orgs o ON o.org = m.org
        LEFT JOIN dc_org_ranks r ON r.org = m.org AND r.rank = m.rank
        WHERE m.citizenid = ? AND COALESCE(o.type, 'org') <> 'gang' LIMIT 1]], { citizenid })
    local gang = safeSingle([[SELECT m.gang AS name, COALESCE(o.label, m.gang) AS label, m.rank,
            COALESCE(r.rank_name, CONCAT('Rank ', m.rank)) AS rank_name
        FROM dc_gang_members m
        LEFT JOIN dc_orgs o ON o.org = m.gang
        LEFT JOIN dc_gang_ranks r ON r.gang = m.gang AND r.rank = m.rank
        WHERE m.citizenid = ? LIMIT 1]], { citizenid })

    if org and gang then
        return { kind='conflict', conflict=true, org=org, gang=gang, label='Faction conflict', rank_name='Data conflict' }
    elseif gang then
        gang.kind='gang'; gang.conflict=false; return gang
    elseif org then
        org.kind='organization'; org.conflict=false; return org
    end
    return { kind='none', conflict=false, label='No Faction', rank_name='Unaffiliated' }
end

QBCore.Functions.CreateCallback('dc-core-ui:server:GetFactionRoute', function(src, cb)
    local P = QBCore.Functions.GetPlayer(src)
    if not P then cb({ kind='none', message='Player data is not ready' }) return end
    local faction = getFactionMembership(P.PlayerData.citizenid)
    if faction.kind == 'conflict' then
        faction.message = 'Faction data conflict detected. Organization and gang membership cannot exist together.'
    elseif faction.kind == 'none' then
        faction.message = 'You are not in an organization or gang.'
    end
    cb(faction)
end)

local function getPlayerRow(src)
    local P = QBCore.Functions.GetPlayer(src)
    local pid = getPid(src)
    if not P then
        return { player_id=pid, name=GetPlayerName(src) or 'Player', cash=0, bank=0, wanted_stars=getWantedStars(pid) }
    end
    local pd = P.PlayerData
    return {
        source = src,
        player_id = pid,
        citizenid = pd.citizenid,
        qb_player_id = pd.source,
        name = getCharName(P, src),
        cash = (pd.money and pd.money.cash) or 0,
        bank = (pd.money and pd.money.bank) or 0,
        job = pd.job or {},
        gang = pd.gang or {},
        charinfo = pd.charinfo or {},
        metadata = pd.metadata or {},
        faction = getFactionMembership(pd.citizenid),
        wanted_stars = getWantedStars(pid)
    }
end


local SettingsDefaults = {
    hud_enabled = 'true',
    ui_scale = '100',
    hud_scale = '100',
    minimap_mode = 'vehicle',
    notification_position = 'bottom-right',
    notification_sound = 'true',
    graphics_preset = 'balanced',
    chat_visible = 'true',
    chat_scale = '100',
    chat_vertical = '0',
    damage_indicator = 'true',
    vehicle_hud = 'true',
    auto_seatbelt = 'false',
}

local function normalizeSettingValue(key, value)
    key = tostring(key or '')
    if SettingsDefaults[key] == nil then return nil end

    if key == 'ui_scale' then
        return tostring(math.max(80, math.min(130, math.floor(tonumber(value or 100) or 100))))
    elseif key == 'hud_scale' then
        return tostring(math.max(70, math.min(130, math.floor(tonumber(value or 100) or 100))))
    elseif key == 'chat_scale' then
        return tostring(math.max(70, math.min(120, math.floor(tonumber(value or 100) or 100))))
    elseif key == 'chat_vertical' then
        return tostring(math.max(-20, math.min(35, math.floor(tonumber(value or 0) or 0))))
    elseif key == 'minimap_mode' then
        local v = tostring(value or ''):lower()
        return ({ always=true, vehicle=true, off=true })[v] and v or nil
    elseif key == 'notification_position' then
        local v = tostring(value or ''):lower():gsub('_','-')
        local allowed = {
            ['top-left']=true, ['top-center']=true, ['top-right']=true,
            ['bottom-left']=true, ['bottom-center']=true, ['bottom-right']=true
        }
        return allowed[v] and v or nil
    elseif key == 'graphics_preset' then
        local v = tostring(value or ''):lower()
        return ({ performance=true, balanced=true, cinematic=true })[v] and v or nil
    else
        local v = tostring(value or ''):lower()
        if v == '1' or v == 'true' or v == 'yes' or v == 'on' then return 'true' end
        if v == '0' or v == 'false' or v == 'no' or v == 'off' then return 'false' end
        return nil
    end
end

local function getSettingsIdentity(src)
    local P = QBCore.Functions.GetPlayer(src)
    local citizenid = ''
    if P and P.PlayerData then
        citizenid = tostring(P.PlayerData.citizenid or '')
    end
    return getPid(src), citizenid
end

local function cloneSettingsDefaults()
    local options = {}
    for key, value in pairs(SettingsDefaults) do options[key] = tostring(value) end
    return options
end

local function loadPersistentSettings(src)
    local options = cloneSettingsDefaults()
    local pid, citizenid = getSettingsIdentity(src)
    local rows = {}
    local sourceName = 'defaults'

    -- V2 is keyed by QBCore citizenid, which remains stable across reconnects
    -- and does not depend on dc-identity being ready during resource startup.
    if citizenid ~= '' then
        rows = safeQuery('SELECT opt_key,opt_value FROM dc_ui_options_v2 WHERE citizenid=?', { citizenid })
        if #rows > 0 then sourceName = 'citizenid' end
    end

    -- Backward-compatible migration from the old numeric player_id table.
    if #rows == 0 and tonumber(pid or 0) > 0 then
        rows = safeQuery('SELECT opt_key,opt_value FROM dc_ui_options WHERE player_id=?', { pid })
        if #rows > 0 then
            sourceName = 'legacy-player-id'
            if citizenid ~= '' then
                for _, row in ipairs(rows) do
                    local key = tostring(row.opt_key or '')
                    local value = normalizeSettingValue(key, row.opt_value)
                    if value then
                        safeWrite([[INSERT INTO dc_ui_options_v2 (citizenid,opt_key,opt_value,updated_at)
                            VALUES (?,?,?,NOW())
                            ON DUPLICATE KEY UPDATE opt_value=VALUES(opt_value), updated_at=NOW()]],
                            { citizenid, key, value })
                    end
                end
            end
        end
    end

    for _, row in ipairs(rows or {}) do
        local key = tostring(row.opt_key or '')
        local value = normalizeSettingValue(key, row.opt_value)
        if value and SettingsDefaults[key] ~= nil then options[key] = value end
    end

    return options, #rows, sourceName, pid, citizenid
end

local function savePersistentSetting(src, key, value)
    local pid, citizenid = getSettingsIdentity(src)
    local wrote = false

    if citizenid ~= '' then
        local ok = safeWrite([[INSERT INTO dc_ui_options_v2 (citizenid,opt_key,opt_value,updated_at)
            VALUES (?,?,?,NOW())
            ON DUPLICATE KEY UPDATE opt_value=VALUES(opt_value), updated_at=NOW()]],
            { citizenid, key, value })
        wrote = wrote or ok
    end

    -- Keep the old table synchronized for backward compatibility with any
    -- other server code that may still read numeric player IDs.
    if tonumber(pid or 0) > 0 then
        local ok = safeWrite([[INSERT INTO dc_ui_options (player_id,opt_key,opt_value,updated_at)
            VALUES (?,?,?,NOW())
            ON DUPLICATE KEY UPDATE opt_value=VALUES(opt_value), updated_at=NOW()]],
            { pid, key, value })
        wrote = wrote or ok
    end

    return wrote, pid, citizenid
end

local function resetPersistentSettings(src)
    local pid, citizenid = getSettingsIdentity(src)
    local wrote = false
    if citizenid ~= '' then
        local ok = safeWrite('DELETE FROM dc_ui_options_v2 WHERE citizenid=?', { citizenid })
        wrote = wrote or ok
    end
    if tonumber(pid or 0) > 0 then
        local ok = safeWrite('DELETE FROM dc_ui_options WHERE player_id=?', { pid })
        wrote = wrote or ok
    end
    return wrote
end

local function ensureTables()
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_daily_reward_state (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL UNIQUE,
        tier VARCHAR(10) NOT NULL,
        reward_amount INT NOT NULL DEFAULT 0,
        required_seconds INT NOT NULL DEFAULT 0,
        seconds_played INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        started_at DATETIME NULL DEFAULT NULL,
        updated_at DATETIME NULL DEFAULT NULL,
        claimed_at DATETIME NULL DEFAULT NULL,
        KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])

    safeQuery([[CREATE TABLE IF NOT EXISTS dc_daily_reward_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        tier VARCHAR(10) NOT NULL,
        reward_amount INT NOT NULL DEFAULT 0,
        completed_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_player (player_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])

    safeQuery([[CREATE TABLE IF NOT EXISTS dc_ui_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        opt_key VARCHAR(60) NOT NULL,
        opt_value TEXT,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_opt (player_id,opt_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])

    safeQuery([[CREATE TABLE IF NOT EXISTS dc_ui_options_v2 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        citizenid VARCHAR(60) NOT NULL,
        opt_key VARCHAR(60) NOT NULL,
        opt_value TEXT,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_citizen_opt (citizenid,opt_key),
        KEY idx_citizenid (citizenid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])

    safeQuery([[CREATE TABLE IF NOT EXISTS dc_businesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(120) NOT NULL,
        type VARCHAR(50) NOT NULL,
        price INT NOT NULL DEFAULT 0,
        location VARCHAR(120) NULL,
        x DOUBLE NULL, y DOUBLE NULL, z DOUBLE NULL, h DOUBLE NULL,
        owner_player_id INT NULL,
        owner_name VARCHAR(120) NULL,
        balance INT NOT NULL DEFAULT 0,
        stock INT NOT NULL DEFAULT 0,
        max_stock INT NOT NULL DEFAULT 100,
        product_price INT NOT NULL DEFAULT 100,
        price_level VARCHAR(20) NOT NULL DEFAULT 'medium',
        gang_robbery_allowed TINYINT(1) NOT NULL DEFAULT 0,
        sale_status VARCHAR(30) NOT NULL DEFAULT 'for_sale',
        income INT NOT NULL DEFAULT 0,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_owner (owner_player_id), KEY idx_sale (sale_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery('ALTER TABLE dc_businesses ADD COLUMN IF NOT EXISTS owner_name VARCHAR(120) NULL')
    safeQuery([[ALTER TABLE dc_businesses ADD COLUMN IF NOT EXISTS price_level VARCHAR(20) NOT NULL DEFAULT 'medium']])
    safeQuery('ALTER TABLE dc_businesses ADD COLUMN IF NOT EXISTS gang_robbery_allowed TINYINT(1) NOT NULL DEFAULT 0')
    safeQuery([[ALTER TABLE dc_businesses ADD COLUMN IF NOT EXISTS sale_status VARCHAR(30) NOT NULL DEFAULT 'for_sale']])
    safeQuery('ALTER TABLE dc_businesses ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    safeQuery('ALTER TABLE dc_businesses ADD COLUMN IF NOT EXISTS family_id INT NULL')
    safeQuery('ALTER TABLE dc_businesses ADD COLUMN IF NOT EXISTS owner_family_id INT NULL')

    safeQuery([[CREATE TABLE IF NOT EXISTS dc_business_v2_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        actor_player_id INT NOT NULL DEFAULT 0,
        action VARCHAR(50) NOT NULL,
        amount INT NOT NULL DEFAULT 0,
        details VARCHAR(255) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_business (business_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])


    -- Family tables are also ensured here because M Menu reads them directly.
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_families (id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(64) NOT NULL UNIQUE,owner_player_id INT NOT NULL,balance INT NOT NULL DEFAULT 0,house_id INT NULL,level INT NOT NULL DEFAULT 1,logo VARCHAR(255) NULL,bio TEXT NULL,created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_family_members (id INT AUTO_INCREMENT PRIMARY KEY,family_id INT NOT NULL,player_id INT NOT NULL UNIQUE,name VARCHAR(100),rank INT NOT NULL DEFAULT 1,rank_name VARCHAR(50) NOT NULL DEFAULT 'Member',points INT NOT NULL DEFAULT 0,points_add INT NOT NULL DEFAULT 0,points_sub INT NOT NULL DEFAULT 0,playtime_day INT NOT NULL DEFAULT 0,playtime_week INT NOT NULL DEFAULT 0,joined_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_family (family_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_family_ranks (id INT AUTO_INCREMENT PRIMARY KEY,family_id INT NOT NULL,rank_id INT NOT NULL,rank_name VARCHAR(50) NOT NULL,access_house INT NOT NULL DEFAULT 0,access_furniture INT NOT NULL DEFAULT 0,access_clothes TINYINT(1) NOT NULL DEFAULT 0,access_bizwar TINYINT(1) NOT NULL DEFAULT 0,access_member_management TINYINT(1) NOT NULL DEFAULT 0,access_money TINYINT(1) NOT NULL DEFAULT 0,vehicle_access INT NOT NULL DEFAULT 0,updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uniq_family_rank (family_id,rank_id),KEY idx_family (family_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_family_logs (id INT AUTO_INCREMENT PRIMARY KEY,family_id INT NULL,actor_player_id INT NULL,action VARCHAR(50) NOT NULL,details VARCHAR(255),created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_family (family_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_family_vehicles (id INT AUTO_INCREMENT PRIMARY KEY,family_id INT NOT NULL,model VARCHAR(50) NOT NULL,plate VARCHAR(20),access_rank INT NOT NULL DEFAULT 1,KEY idx_family (family_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_family_battles (id INT AUTO_INCREMENT PRIMARY KEY,attacker_family_id INT NOT NULL,defender_family_id INT NULL,business_id INT NULL,location VARCHAR(80) NULL,weapon VARCHAR(60) NULL,status VARCHAR(30) NOT NULL DEFAULT 'wait_confirm',winner_family_id INT NULL,comment VARCHAR(255) NULL,scheduled_at DATETIME NULL,created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_attacker (attacker_family_id),KEY idx_defender (defender_family_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_family_companies (id INT AUTO_INCREMENT PRIMARY KEY,label VARCHAR(100) NOT NULL,owner_family_id INT NULL,location VARCHAR(100) NULL,points_reward INT NOT NULL DEFAULT 0,created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_owner_family (owner_family_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_family_events (id INT AUTO_INCREMENT PRIMARY KEY,family_id INT NOT NULL,title VARCHAR(100) NOT NULL,description VARCHAR(600) NULL,location VARCHAR(120) NULL,scheduled_at DATETIME NULL,max_members INT NOT NULL DEFAULT 0,status VARCHAR(30) NOT NULL DEFAULT 'scheduled',created_by_player_id INT NOT NULL DEFAULT 0,created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_family_status (family_id,status),KEY idx_schedule (scheduled_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery([[CREATE TABLE IF NOT EXISTS dc_family_event_members (id INT AUTO_INCREMENT PRIMARY KEY,event_id INT NOT NULL,player_id INT NOT NULL,joined_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uniq_event_player (event_id,player_id),KEY idx_event (event_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]])
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS respect_points INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS elo INT NOT NULL DEFAULT 1000')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS battles INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS rating INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS nationality VARCHAR(80) NULL')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS biography TEXT NULL')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS rules TEXT NULL')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS taboo TEXT NULL')
    safeQuery([[ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS chat_icon INT NOT NULL DEFAULT 1]])
    safeQuery([[ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS chat_color VARCHAR(20) NOT NULL DEFAULT '#FFCE47']])
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS money_limit INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS money_limit_updated DATETIME NULL DEFAULT NULL')
    safeQuery([[ALTER TABLE dc_families ADD COLUMN IF NOT EXISTS leader_message TEXT NULL]])
    safeQuery('ALTER TABLE dc_family_members ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_family_members ADD COLUMN IF NOT EXISTS points_add INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_family_members ADD COLUMN IF NOT EXISTS points_sub INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_family_members ADD COLUMN IF NOT EXISTS playtime_day INT NOT NULL DEFAULT 0')
    safeQuery('ALTER TABLE dc_family_members ADD COLUMN IF NOT EXISTS playtime_week INT NOT NULL DEFAULT 0')
end

local function isAdmin(src)
    local pid = getPid(src)
    local r = safeSingle('SELECT admin_level FROM dc_players WHERE player_id=? LIMIT 1', { pid })
    return (tonumber(r and r.admin_level or 0) or 0) >= 8
end


local function getProgressionDashboardSafe(src, pid)
    pid = tonumber(pid or 0) or 0
    if pid <= 0 then
        return { progress = { level = 1, xp = 0, total_xp = 0, reputation = 0 }, jobs = {}, achievements = {}, achievement_catalog = {}, daily_tasks = {} }
    end

    local ok, prog = pcall(function()
        return exports['dc-progression']:GetDashboard(src)
    end)
    if ok and type(prog) == 'table' and prog.progress then
        prog.jobs = prog.jobs or {}
        prog.achievements = prog.achievements or {}
        prog.achievement_catalog = prog.achievement_catalog or prog.achievements or {}
        prog.daily_tasks = prog.daily_tasks or {}
        return prog
    end

    return {
        progress = safeSingle('SELECT * FROM dc_player_progress WHERE player_id=? LIMIT 1', { pid }) or { player_id = pid, level = 1, xp = 0, total_xp = 0, reputation = 0 },
        jobs = safeQuery('SELECT * FROM dc_player_job_stats WHERE player_id=? ORDER BY completed DESC, xp DESC LIMIT 50', { pid }),
        achievements = safeQuery('SELECT * FROM dc_player_achievements WHERE player_id=? ORDER BY id DESC LIMIT 80', { pid }),
        achievement_catalog = {},
        daily_tasks = safeQuery('SELECT * FROM dc_daily_tasks WHERE player_id=? AND task_date=CURDATE() ORDER BY id ASC LIMIT 50', { pid })
    }
end


-- V5.8 GetData cache. Keeps M Menu responsive and prevents repeated SQL/export work.
local __dcuiDataCache = {}
local function cacheTtl(view)
    if view == 'familyMenu' then return 0 end
    if view == 'business' or view == 'myBusiness' or view == 'realEstate' or view == 'contactAdmin' or view == 'reportMenu' then return 3500 end
    if view == 'darkStore' or view == 'referral' or view == 'prime' then return 2000 end
    if view == 'statisticsTab' or view == 'jobs' or view == 'achievement' then return 8000 end
    if view == 'hud' then return 2500 end
    return 6000
end

local function cacheKey(src, view)
    return tostring(src)..':'..tostring(view or 'statisticsTab')
end

-- Server-only cross-resource cache invalidation. Progression uses this before refreshing
-- the browser so newly unlocked achievements and XP are visible immediately.
exports('InvalidatePlayerCache', function(src, view)
    src = tonumber(src or 0) or 0
    if src <= 0 then return false end
    __dcuiDataCache[cacheKey(src, tostring(view or 'statisticsTab'))] = nil
    return true
end)

local function minimalBase(src, view)
    local P = QBCore.Functions.GetPlayer(src)
    local pd = P and P.PlayerData or {}
    local money = pd.money or {}
    local charinfo = pd.charinfo or {}
    local name = (((charinfo.firstname or '')..' '..(charinfo.lastname or '')):gsub('^%s+',''):gsub('%s+$',''))
    if name == '' then name = GetPlayerName(src) or 'Player' end
    return {
        view = view,
        player = {
            source = src,
            player_id = pd.source or src,
            citizenid = pd.citizenid,
            name = name,
            cash = money.cash or 0,
            bank = money.bank or 0,
            job = pd.job or {},
            gang = pd.gang or {},
            charinfo = charinfo,
            metadata = pd.metadata or {},
            wanted_stars = 0
        },
        server = {
            online = #QBCore.Functions.GetPlayers(),
            max = GetConvarInt('sv_maxclients', 64),
            name = GetConvar('sv_projectName', 'Dark City RP')
        },
        progression = { progress = { level = 1, xp = 0, total_xp = 0, reputation = 0 }, jobs = {}, achievements = {}, achievement_catalog = {}, daily_tasks = {} },
        reward_tiers = DailyTiers
    }
end

QBCore.Functions.CreateCallback('dc-core-ui:server:GetData', function(src, cb, view)
    view = tostring(view or 'statisticsTab')
    local key = cacheKey(src, view)
    local now = GetGameTimer()
    local cached = __dcuiDataCache[key]
    if cached and cached.data and (now - (cached.time or 0)) < cacheTtl(view) then
        cb(cached.data)
        return
    end

    local ok, data = pcall(function()
        local p = getPlayerRow(src)
        local base = {
            view = view,
            player = p,
            server = {
                online = #QBCore.Functions.GetPlayers(),
                max = GetConvarInt('sv_maxclients', 64),
                name = GetConvar('sv_projectName', 'Dark City RP')
            },
            reward_tiers = DailyTiers
        }

        -- Daily reward SQL only where needed. This prevents every tab from doing extra DB work.
        if view == 'dailyReward' or view == 'hud' then
            base.daily_reward = getActiveDailyReward(p.player_id)
            -- Default to the 5-hour track for new/no-active players so the HUD
            -- always has a live reward timer. Players can select 3h/5h/7h/9h
            -- from Daily Reward before starting a different cycle.
            if not base.daily_reward then
                local tier = DailyTiers['5h']
                if tier then
                    safeQuery([[
                        INSERT INTO dc_daily_reward_state
                        (player_id,tier,reward_amount,required_seconds,seconds_played,status,started_at,updated_at,claimed_at)
                        VALUES (?,?,?,?,0,'active',NOW(),NOW(),NULL)
                        ON DUPLICATE KEY UPDATE player_id=player_id
                    ]], {p.player_id, tier.id, tier.reward, tier.required_seconds})
                    base.daily_reward = getActiveDailyReward(p.player_id)
                end
            end
        end

        if view == 'auth' then
            base.characters = {}
            local P = QBCore.Functions.GetPlayer(src)
            if P and P.PlayerData and P.PlayerData.citizenid then
                base.characters[#base.characters + 1] = { citizenid = P.PlayerData.citizenid }
            end
            return base
        end

        if view == 'spawnSelect' then
            base.spawns = {}
            for _, s in ipairs(Config.Spawns or {}) do
                base.spawns[#base.spawns+1] = { id=s.id, label=s.label, icon=s.icon }
            end
            return base
        end

        if view == 'realEstate' then
            base.businesses = safeQuery('SELECT * FROM dc_businesses WHERE IFNULL(owner_player_id,0)=0 OR sale_status IN (\'for_sale\',\'auction\') ORDER BY id ASC')
            base.houses = safeQuery('SELECT * FROM dc_houses ORDER BY id ASC')
            return base
        end

        if view == 'settings' then
            local options, savedCount, settingsSource, settingsPid, settingsCitizenid = loadPersistentSettings(src)
            base.options = options
            base.options_saved_count = savedCount
            base.options_source = settingsSource
            base.settings_identity_ready = settingsCitizenid ~= '' or tonumber(settingsPid or 0) > 0
            return base
        end

        if view == 'familyMenu' then
            base.rankNames = { 'Recruit','Member','Senior Member','Trusted','Enforcer','Manager','Captain','Underboss','Deputy','Leader' }
            if GetResourceState('dc-life') ~= 'started' then
                base.createPrice = 500000
                base.family = nil
                base.member = nil
                base.members = {}
                base.vehicles = {}
                base.logs = {}
                base.rankings = {}
                base.ranks = {}
                base.holdings = { houses={}, businesses={}, companies={} }
                base.battles = {}
                base.events = {}
                base.transferOffers = {}
                return base
            end

            local okCanonical, canonical = pcall(function()
                return exports['dc-life']:GetFamilyMenuData(src)
            end)
            if not okCanonical or type(canonical) ~= 'table' then
                print('[dc-core-ui] canonical family backend failed: '..tostring(canonical))
                base.createPrice = 500000
                base.family = nil
                base.member = nil
                base.members = {}
                base.vehicles = {}
                base.logs = {}
                base.rankings = {}
                base.ranks = {}
                base.holdings = { houses={}, businesses={}, companies={} }
                base.battles = {}
                base.events = {}
                base.transferOffers = {}
                return base
            end

            -- dc-life is the only family DB/business-logic authority. dc-core-ui only presents it.
            for key, value in pairs(canonical) do base[key] = value end
            return base
        end

        if view == 'business' or view == 'myBusiness' then
            base.my_business = safeSingle('SELECT * FROM dc_businesses WHERE owner_player_id=? LIMIT 1', { p.player_id })
            base.business = base.my_business
            if base.my_business then
                base.business_logs = safeQuery('SELECT * FROM dc_business_v2_logs WHERE business_id=? ORDER BY id DESC LIMIT 60', { base.my_business.id })
                base.business_supply_orders = safeQuery('SELECT * FROM dc_business_supply_orders WHERE business_id=? ORDER BY id DESC LIMIT 20', { base.my_business.id })
            else
                base.business_logs = {}
                base.business_supply_orders = {}
            end
            return base
        end

        if view == 'contactAdmin' or view == 'reportMenu' then
            base.reports = {}
            if GetResourceState('dc-reports') == 'started' then
                local okReports, reportList = pcall(function()
                    return exports['dc-reports']:GetPlayerReports(p.player_id)
                end)
                if okReports and type(reportList) == 'table' then base.reports = reportList end
            end
            return base
        end

        if view == 'darkStore' then
            base.dark_store = { coins = 0, products = {}, categories = {}, orders = {}, ledger = {}, entitlements = {} }
            if GetResourceState('dc-darkstore') == 'started' then
                local okStore, storeData = pcall(function()
                    return exports['dc-darkstore']:GetDashboard(src)
                end)
                if okStore and type(storeData) == 'table' then
                    base.dark_store = storeData
                else
                    base.dark_store.error = 'Dark Store data is unavailable'
                    print('[dc-core-ui] Dark Store bridge failed: '..tostring(storeData))
                end
            else
                base.dark_store.error = 'dc-darkstore is not started'
            end
            return base
        end

        if view == 'referral' then
            base.referral = { loading = true }
            if GetResourceState('dc-referral') == 'started' then
                local okReferral, referralData = pcall(function()
                    return exports['dc-referral']:GetDashboard(src)
                end)
                if okReferral and type(referralData) == 'table' then
                    base.referral = referralData
                else
                    base.referral = { error = 'Referral data is unavailable' }
                    print('[dc-core-ui] Referral bridge failed: '..tostring(referralData))
                end
            else
                base.referral = { error = 'dc-referral is not started' }
            end
            return base
        end

        if view == 'prime' then
            base.prime = { loading = true }
            if GetResourceState('dc-prime') == 'started' then
                local okPrime, primeData = pcall(function()
                    return exports['dc-prime']:GetDashboard(src)
                end)
                if okPrime and type(primeData) == 'table' then
                    base.prime = primeData
                else
                    base.prime = { error = 'Prime data is unavailable' }
                    print('[dc-core-ui] Prime bridge failed: '..tostring(primeData))
                end
            else
                base.prime = { error = 'dc-prime is not started' }
            end
            return base
        end

        if view == 'battlePass' then
            base.battle_pass = { loading = true }
            if GetResourceState('dc-battlepass') == 'started' then
                local okBp, bpData = pcall(function()
                    return exports['dc-battlepass']:GetDashboard(src)
                end)
                if okBp and type(bpData) == 'table' then
                    base.battle_pass = bpData
                else
                    base.battle_pass = { error = 'Battle Pass data is unavailable' }
                    print('[dc-core-ui] Battle Pass bridge failed: '..tostring(bpData))
                end
            else
                base.battle_pass = { error = 'dc-battlepass is not started' }
            end
            return base
        end

        -- Progression is only loaded for the pages that actually show XP/job progress.
        if view == 'statisticsTab' or view == 'achievement' or view == 'jobs' or view == 'dailyReward' then
            base.progression = getProgressionDashboardSafe(src, p.player_id)
        end

        -- Licence documents shown in M Menu -> Statistics.
        -- Read directly from dc_licenses so legal/illegal extensions and expiry
        -- changes are visible immediately after the statistics cache is cleared.
        if view == 'statisticsTab' then
            local P = QBCore.Functions.GetPlayer(src)
            local citizenid = P and P.PlayerData and P.PlayerData.citizenid or nil
            base.licences = {}

            if citizenid then
                local rows = safeQuery([[
                    SELECT
                        `license_type`,
                        `status`,
                        `source`,
                        DATE_FORMAT(`issued_at`, '%Y-%m-%d %H:%i:%s') AS `issued_at`,
                        DATE_FORMAT(`expires_at`, '%Y-%m-%d %H:%i:%s') AS `expires_at`,
                        CASE
                            WHEN `status` = 'valid'
                             AND (`expires_at` IS NULL OR `expires_at` > NOW())
                            THEN 1 ELSE 0
                        END AS `is_valid`
                    FROM `dc_licenses`
                    WHERE `citizenid` = ?
                    ORDER BY FIELD(`license_type`, 'driver', 'boat', 'helicopter'),
                             `license_type`
                ]], { citizenid })

                for _, row in ipairs(rows or {}) do
                    row.is_valid = tonumber(row.is_valid or 0) == 1
                    base.licences[#base.licences + 1] = row
                end
            end

            -- Alias retained for any current/future Documents UI.
            base.documents = base.licences
        end

        if view == 'dailyReward' then
            base.daily_history = safeQuery('SELECT * FROM dc_daily_reward_logs WHERE player_id=? ORDER BY id DESC LIMIT 20', { p.player_id })
            return base
        end

        return base
    end)

    if not ok or type(data) ~= 'table' then
        print('[dc-core-ui] GetData server fallback for '..tostring(view)..': '..tostring(data))
        data = minimalBase(src, view)
    end

    __dcuiDataCache[key] = { data = data, time = GetGameTimer() }
    cb(data)
end)

RegisterNetEvent('dc-core-ui:server:DailyStart', function(tierId)
    local src = source
    local p = getPlayerRow(src)
    tierId = tostring(tierId or '')
    local tier = DailyTiers[tierId]
    if not tier then notify(src, 'Invalid reward selected', 'error') return end

    -- Selecting a different tier intentionally changes/resets the active reward track.
    -- This lets players switch between 3h/5h/7h/9h instead of being locked to the first selection.
    DailyRuntime[p.player_id] = nil
    safeQuery([[
        INSERT INTO dc_daily_reward_state
        (player_id,tier,reward_amount,required_seconds,seconds_played,status,started_at,updated_at,claimed_at)
        VALUES (?,?,?,?,0,'active',NOW(),NOW(),NULL)
        ON DUPLICATE KEY UPDATE
            tier=VALUES(tier),
            reward_amount=VALUES(reward_amount),
            required_seconds=VALUES(required_seconds),
            seconds_played=0,
            status='active',
            started_at=NOW(),
            updated_at=NOW(),
            claimed_at=NULL
    ]], { p.player_id, tier.id, tier.reward, tier.required_seconds })

    __dcuiDataCache[cacheKey(src, 'dailyReward')] = nil
    __dcuiDataCache[cacheKey(src, 'hud')] = nil
    notify(src, tier.label..' selected. Timer started.', 'success')
    TriggerClientEvent('dc-core-ui:client:Refresh', src, 'dailyReward')
end)

RegisterNetEvent('dc-core-ui:server:Action', function(payload)
    local src = source
    payload = payload or {}
    local action = tostring(payload.action or '')
    local data = payload.data or {}
    local p = getPlayerRow(src)

    if action == 'spawn_select' then
        TriggerClientEvent('dc-core-ui:client:Spawn', src, data.id or 'last')
        return
    end

    if action == 'option_save' then
        local key = tostring(data.key or '')
        local value = normalizeSettingValue(key, data.value)
        if not value then
            notify(src, 'Invalid setting value', 'error')
            TriggerClientEvent('dc-core-ui:client:SettingSaveResult', src, key, false, value)
            return
        end

        local wrote = savePersistentSetting(src, key, value)
        __dcuiDataCache[cacheKey(src, 'settings')] = nil
        TriggerClientEvent('dc-core-ui:client:SettingSaveResult', src, key, wrote == true, value)
        if not wrote then
            notify(src, 'Setting could not be saved. Please try again.', 'error')
        end
        return
    end

    if action == 'option_reset' then
        local wrote = resetPersistentSettings(src)
        __dcuiDataCache[cacheKey(src, 'settings')] = nil
        TriggerClientEvent('dc-core-ui:client:SettingsResetResult', src, wrote == true)
        notify(src, wrote and 'Settings reset to defaults' or 'Settings reset failed', wrote and 'success' or 'error')
        return
    end

    if action == 'business_buy' then
        local bid = tonumber(data.businessId or data.business_id or data.id or 0) or 0
        if bid <= 0 then notify(src, 'Invalid business ID', 'error') return end
        if GetResourceState('dc-business-v1') ~= 'started' then
            notify(src, 'Business system is not available', 'error')
            return
        end
        -- Route every UI purchase through the single hardened purchase authority.
        local okCall, purchased, message = pcall(function()
            return exports['dc-business-v1']:BuyBusiness(src, bid)
        end)
        if not okCall then
            print('[dc-core-ui] business buy bridge failed: '..tostring(purchased))
            notify(src, 'Business purchase failed. Please try again.', 'error')
            return
        end
        notify(src, message or (purchased and 'Business bought successfully' or 'Business purchase failed'), purchased and 'success' or 'error')
        if purchased then
            __dcuiDataCache[cacheKey(src, 'business')] = nil
            __dcuiDataCache[cacheKey(src, 'myBusiness')] = nil
            __dcuiDataCache[cacheKey(src, 'realEstate')] = nil
            TriggerClientEvent('dc-core-ui:client:Refresh', src, 'business')
        end
        return
    end

    if action == 'business_price_level' then
        local bid = tonumber(data.businessId or data.business_id or data.id or 0) or 0
        local level = tostring(data.level or ''):lower()
        local allowed = { low=true, medium=true, high=true }
        if bid <= 0 or not allowed[level] then notify(src, 'Invalid price level', 'error') return end
        local b = safeSingle('SELECT * FROM dc_businesses WHERE id=? AND owner_player_id=? LIMIT 1', { bid, p.player_id })
        if not b then notify(src, 'You are not owner', 'error') return end
        local basePrice = ({ store247=250, gunshop=2500, fuel=150, atm=80, carrent=1000, parking=250 })[tostring(b.type or '')] or 100
        local mult = ({ low=0.85, medium=1.0, high=1.15 })[level] or 1.0
        local newPrice = math.floor(basePrice * mult)
        safeQuery('UPDATE dc_businesses SET price_level=?, product_price=? WHERE id=?', { level, newPrice, bid })
        safeQuery('INSERT INTO dc_business_v2_logs (business_id,actor_player_id,action,amount,details) VALUES (?,?,?,?,?)', { bid, p.player_id, 'price_level', newPrice, level })
        notify(src, 'Business price level updated', 'success')
        TriggerClientEvent('dc-core-ui:client:Refresh', src, 'business')
        return
    end

    if action == 'business_order_stock' then
        local size = tostring(data.size or 'medium'):lower()
        local ok, err = pcall(function()
            exports['dc-business-supply']:CreateOwnerOrder(src, size)
        end)
        if not ok then
            notify(src, 'Supply system is not started. Ensure dc-business-supply.', 'error')
            print('[dc-core-ui] business_order_stock failed: '..tostring(err))
        end
        TriggerClientEvent('dc-core-ui:client:Refresh', src, 'business')
        return
    end

    if action == 'business_cancel_supply_order' then
        local oid = tonumber(data.orderId or data.id or 0) or 0
        if oid <= 0 then notify(src, 'Invalid order ID', 'error') return end
        TriggerEvent('dc-business-supply:server:CancelOrderFromCoreUI', src, oid)
        TriggerClientEvent('dc-core-ui:client:Refresh', src, 'business')
        return
    end

    if action == 'house_buy' or action == 'house_enter' then
        TriggerEvent('dc-life:server:Action', payload)
        return
    end

    if action:find('family_') == 1 then
        TriggerEvent('dc-life:server:Action', payload)
        TriggerClientEvent('dc-core-ui:client:ClearCache', src, 'familyMenu')
        SetTimeout(900, function()
            TriggerClientEvent('dc-core-ui:client:Refresh', src, 'familyMenu')
        end)
        return
    end
end)

local function resetDailyRewardTimers()
    local ok, result = safeWrite([[
        UPDATE dc_daily_reward_state
        SET seconds_played=0,
            status='active',
            started_at=NOW(),
            updated_at=NOW(),
            claimed_at=NULL
    ]])
    if ok then
        print(('[dc-core-ui] Daily reward timers reset on FXServer startup (%s rows)'):format(tonumber(result or 0) or 0))
    end
end

CreateThread(function()
    Wait(100)
    ensureTables()

    -- GlobalState survives a resource restart but is cleared when FXServer itself restarts.
    -- Therefore a daily cycle resets on server boot, not on /restart dc-core-ui.
    if GlobalState.dcDailyRewardBootInitialized ~= true then
        resetDailyRewardTimers()
        GlobalState.dcDailyRewardBootInitialized = true
        print('[dc-core-ui] Daily reward cycle reset for new FXServer boot.')
    else
        print('[dc-core-ui] Resource restarted; existing daily reward progress preserved.')
    end
    print('[dc-core-ui] V5.15 family displayed-ID fix V8 loaded')
end)

-- Accrue actual elapsed server time, not a hard-coded +60 per loop.
-- GetGameTimer is monotonic, so SQL latency/server hitches cannot make the timer jump.
CreateThread(function()
    while true do
        Wait(1000)
        local now = GetGameTimer()
        local onlinePids = {}

        for _, src in ipairs(QBCore.Functions.GetPlayers()) do
            local P = QBCore.Functions.GetPlayer(src)
            if P then
                local pid = getPid(src)
                if pid and pid > 0 then
                    onlinePids[pid] = true
                    local r = safeSingle([[SELECT id, tier, reward_amount, required_seconds, seconds_played
                        FROM dc_daily_reward_state WHERE player_id=? AND status='active' LIMIT 1]], { pid })

                    if r then
                        local runtime = DailyRuntime[pid]
                        if not runtime or runtime.rowId ~= tonumber(r.id) then
                            runtime = {
                                rowId = tonumber(r.id),
                                played = tonumber(r.seconds_played or 0) or 0,
                                lastTick = now,
                                lastSave = now,
                                fractionMs = 0,
                                source = src
                            }
                            DailyRuntime[pid] = runtime
                        else
                            local deltaMs = now - (runtime.lastTick or now)
                            -- Handle GetGameTimer's signed 32-bit wraparound safely.
                            if deltaMs < 0 then deltaMs = deltaMs + 4294967296 end
                            runtime.lastTick = now
                            runtime.fractionMs = (runtime.fractionMs or 0) + deltaMs
                            local wholeSeconds = math.floor(runtime.fractionMs / 1000)
                            if wholeSeconds > 0 then
                                runtime.played = (runtime.played or 0) + wholeSeconds
                                runtime.fractionMs = runtime.fractionMs - (wholeSeconds * 1000)
                            end
                        end

                        local required = tonumber(r.required_seconds or 0) or 0
                        local reward = tonumber(r.reward_amount or 0) or 0
                        if required > 0 and runtime.played >= required then
                            -- Mark claimed before paying to prevent duplicate payouts after callbacks/restarts.
                            local ok = safeWrite([[UPDATE dc_daily_reward_state
                                SET seconds_played=?, status='claimed', claimed_at=NOW(), updated_at=NOW()
                                WHERE id=? AND status='active']], { required, r.id })
                            if ok then
                                P.Functions.AddMoney('bank', reward, 'daily-reward')
                                safeQuery('INSERT INTO dc_daily_reward_logs (player_id,tier,reward_amount,completed_at) VALUES (?,?,?,NOW())', { pid, r.tier, reward })
                                notify(src, 'Daily reward complete: $'..reward..' deposited to bank', 'success')
                                TriggerClientEvent('dc-core-ui:client:Refresh', src, 'dailyReward')
                                TriggerClientEvent('dc-core-ui:client:Refresh', src, 'hud')
                            end
                            DailyRuntime[pid] = nil
                        elseif (now - (runtime.lastSave or now)) >= 5000 then
                            safeQuery([[UPDATE dc_daily_reward_state SET seconds_played=?, updated_at=NOW() WHERE id=? AND status='active']], { math.floor(runtime.played or 0), r.id })
                            runtime.lastSave = now
                        end
                    else
                        DailyRuntime[pid] = nil
                    end
                end
            end
        end

        -- Drop runtime state for players who went offline; the latest value was saved at most 5s ago.
        for pid, runtime in pairs(DailyRuntime) do
            if not onlinePids[pid] then DailyRuntime[pid] = nil end
        end
    end
end)

print('[dc-core-ui] V6.1 business supply M Menu bridge loaded')

CreateThread(function() Wait(1000) print('[dc-core-ui] V5.15 family displayed-ID fix backend loaded') end)

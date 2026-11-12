local QBCore = exports['qb-core']:GetCoreObject()

local pidCache = {}
local wantedCache = {}

local function getLicense(src)
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if id:sub(1, 8) == 'license:' then return id end
    end
end

local function getPermanentId(src)
    local P = QBCore.Functions.GetPlayer(src)
    local citizenid = P and P.PlayerData and P.PlayerData.citizenid or ''
    local cached = pidCache[src]
    if cached and cached.citizenid == citizenid and (GetGameTimer() - cached.at) < 60000 then return cached.value end

    local pid = 0
    if P and P.PlayerData then
        local pd = P.PlayerData
        local md = pd.metadata or {}
        if pd.citizenid then
            local ok, row = pcall(function()
                return MySQL.single.await('SELECT player_id FROM dc_players WHERE citizenid=? LIMIT 1', { pd.citizenid })
            end)
            if ok and row then pid = tonumber(row.player_id or 0) or 0 end
        end
        if pid <= 0 then pid = tonumber(md.player_id or md.playerid or md.permanent_id or md.dcid or 0) or 0 end
    end

    if pid <= 0 and GetResourceState('dc-identity') == 'started' then
        local ok, value = pcall(function() return exports['dc-identity']:GetPlayerId(src) end)
        if ok then pid = tonumber(value or 0) or 0 end
    end

    if pid <= 0 then pid = src end
    pidCache[src] = { value = pid, citizenid = citizenid, at = GetGameTimer() }
    return pid
end

local function getWanted(pid)
    pid = tonumber(pid or 0) or 0
    if pid <= 0 then return 0 end
    local cached = wantedCache[pid]
    if cached and (GetGameTimer() - cached.at) < 4000 then return cached.value end

    local stars = 0
    local ok, row = pcall(function()
        return MySQL.single.await('SELECT stars FROM dc_lspd_wanted WHERE target_player_id=? AND status=? ORDER BY id DESC LIMIT 1', { pid, 'active' })
    end)
    if ok and row then stars = math.max(0, math.min(5, tonumber(row.stars or 0) or 0)) end
    wantedCache[pid] = { value = stars, at = GetGameTimer() }
    return stars
end

QBCore.Functions.CreateCallback('dc-core-ui:server:Phase1State', function(src, cb)
    local P = QBCore.Functions.GetPlayer(src)
    local pd = P and P.PlayerData or {}
    local money = pd.money or {}
    local pid = getPermanentId(src)
    cb({
        playerId = pid,
        online = #QBCore.Functions.GetPlayers(),
        max = GetConvarInt('sv_maxclients', 64),
        wanted = getWanted(pid),
        cash = tonumber(money.cash or 0) or 0,
        bank = tonumber(money.bank or 0) or 0,
    })
end)

AddEventHandler('QBCore:Server:OnMoneyChange', function(src)
    src = tonumber(src or 0) or 0
    if src <= 0 then return end
    local P = QBCore.Functions.GetPlayer(src)
    if not P then return end
    local money = P.PlayerData.money or {}
    TriggerClientEvent('dc-core-ui:client:Phase1MoneySync', src, money.cash or 0, money.bank or 0)
end)

AddEventHandler('playerDropped', function()
    local src = source
    pidCache[src] = nil
end)

-- Server-side timer API for other resources.
RegisterNetEvent('dc-core-ui:server:SetTimer', function(target, timerType, seconds, label, extra)
    local src = source
    target = tonumber(target or src) or src
    if target ~= src and src ~= 0 and not QBCore.Functions.HasPermission(src, 'admin') then return end
    timerType = tostring(timerType or ''):lower()
    local eventMap = {
        prison = 'dc-core-ui:client:SetPrisonTimer',
        work = 'dc-core-ui:client:SetWorkTimer',
        quest = 'dc-core-ui:client:SetQuestTimer',
        capture = 'dc-core-ui:client:SetCaptureTimer',
    }
    local eventName = eventMap[timerType]
    if not eventName then return end
    TriggerClientEvent(eventName, target, seconds, label, extra)
end)

exports('SetPlayerTimer', function(target, timerType, seconds, label, extra)
    local eventMap = {
        prison = 'dc-core-ui:client:SetPrisonTimer',
        work = 'dc-core-ui:client:SetWorkTimer',
        quest = 'dc-core-ui:client:SetQuestTimer',
        capture = 'dc-core-ui:client:SetCaptureTimer',
    }
    local eventName = eventMap[tostring(timerType or ''):lower()]
    if eventName then TriggerClientEvent(eventName, tonumber(target), seconds, label, extra) return true end
    return false
end)

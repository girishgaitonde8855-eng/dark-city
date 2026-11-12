local QBCore = exports['qb-core']:GetCoreObject()

local function getSeatbeltResource()
    if GetResourceState('dc-seatbelt') == 'started' then return 'dc-seatbelt' end
    if GetResourceState('qb-smallresources') == 'started' then return 'qb-smallresources' end
    return nil
end
local Phase1 = {
    loaded = false,
    visible = true,
    seatbelt = false,
    voiceMode = 1,
    zones = { green = false, red = false, fishing = false },
    lastVehicle = 0,
    lastWeapon = 0,
    prisonTimer = nil,
    prefs = {
        damage_indicator = true,
        vehicle_hud = true,
        auto_seatbelt = false,
    },
    lastHealth = 0,
    autoBeltVehicle = 0,
}

local function send(action, data)
    data = type(data) == 'table' and data or {}
    data.action = action
    SendNUIMessage(data)
end

local function playerMoney()
    local pd = QBCore.Functions.GetPlayerData() or {}
    local money = pd.money or {}
    return tonumber(money.cash or 0) or 0, tonumber(money.bank or 0) or 0
end

local lastMoneyFx = { at = 0, account = '', amount = 0, minus = false }
local lastPlayerDataSync = { at = 0, cash = 0, bank = 0 }
local function sendMoneyFx(account, amount, isMinus)
    local now = GetGameTimer()
    amount = math.abs(tonumber(amount or 0) or 0)
    account = tostring(account or 'cash')
    isMinus = isMinus == true
    if lastMoneyFx.account == account and lastMoneyFx.amount == amount and lastMoneyFx.minus == isMinus and (now - lastMoneyFx.at) < 250 then return end
    lastMoneyFx = { at = now, account = account, amount = amount, minus = isMinus }
    local cash, bank = playerMoney()
    send('phase1:money', { account = account, amount = amount, delta = isMinus and -amount or amount, cash = cash, bank = bank })
end

local function refreshServerState()
    QBCore.Functions.TriggerCallback('dc-core-ui:server:Phase1State', function(data)
        if not data then return end
        local cash, bank = playerMoney()
        data.cash = cash
        data.bank = bank
        send('phase1:state', data)
    end)
end

local function currentStreet(ped)
    local coords = GetEntityCoords(ped)
    local streetHash, crossHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
    local street = streetHash and streetHash ~= 0 and GetStreetNameFromHashKey(streetHash) or ''
    local cross = crossHash and crossHash ~= 0 and GetStreetNameFromHashKey(crossHash) or ''
    if cross ~= '' and cross ~= street then street = street .. ' / ' .. cross end
    local zoneCode = GetNameOfZone(coords.x, coords.y, coords.z)
    local area = zoneCode and GetLabelText(zoneCode) or ''
    if area == 'NULL' then area = zoneCode or '' end
    return street, area
end

local function getFuel(vehicle)
    if vehicle == 0 then return 0 end
    local pct = GetVehicleFuelLevel(vehicle) or 0
    if GetResourceState('dc-vehicle-system') == 'started' then
        local ok, value = pcall(function() return exports['dc-vehicle-system']:GetFuel(vehicle) end)
        if ok and value ~= nil then pct = tonumber(value) or pct end
    end
    pct = math.max(0.0, math.min(100.0, tonumber(pct) or 0.0))
    local state = Entity(vehicle).state
    local tank = tonumber(state and state.dcTankCapacity) or 0
    if tank <= 0 then
        local ok, handlingTank = pcall(function() return GetVehicleHandlingFloat(vehicle, 'CHandlingData', 'fPetrolTankVolume') end)
        if ok and tonumber(handlingTank or 0) > 0 then tank = handlingTank end
    end
    if tank <= 0 then tank = 65.0 end
    return math.floor((pct * tank / 100.0) + 0.5), math.floor(tank + 0.5)
end

local function getVoiceMode()
    local proximity = LocalPlayer and LocalPlayer.state and LocalPlayer.state.proximity or nil
    if type(proximity) == 'table' then
        return tonumber(proximity.index or 1) or 1, tostring(proximity.mode or 'Normal')
    end
    return Phase1.voiceMode or 1, 'Normal'
end

local function collectVehicle(ped)
    if not IsPedInAnyVehicle(ped, false) then
        Phase1.lastVehicle = 0
        return { inVehicle = false }
    end

    local vehicle = GetVehiclePedIsIn(ped, false)
    if vehicle == 0 then return { inVehicle = false } end
    Phase1.lastVehicle = vehicle

    local speed = math.floor((GetEntitySpeed(vehicle) * 3.6) + 0.5)
    local state = Entity(vehicle).state
    -- Store values are already in KM/H. Prefer the saved vehicle configuration;
    -- only use GTA's model estimate when no configured top speed exists.
    local configuredSpeed = tonumber(state and state.dcTopSpeed) or tonumber(state and state.dcStoreSpeed) or 0
    local modelMaxSpeed = GetVehicleModelEstimatedMaxSpeed(GetEntityModel(vehicle))
    local maxSpeed = configuredSpeed > 0 and math.floor(configuredSpeed + 0.5)
        or math.floor(((tonumber(modelMaxSpeed) or 0) * 3.6) + 0.5)
    if maxSpeed < 1 then maxSpeed = 1 end
    local fuelLitres, tankCapacity = getFuel(vehicle)
    local displayName = GetLabelText(GetDisplayNameFromVehicleModel(GetEntityModel(vehicle)))
    if not displayName or displayName == '' or displayName == 'NULL' then displayName = GetDisplayNameFromVehicleModel(GetEntityModel(vehicle)) end
    local gear = GetVehicleCurrentGear(vehicle)
    if gear == 0 and speed < 2 then gear = 'N' end
    local engineHealth = math.max(0, math.min(100, math.floor((GetVehicleEngineHealth(vehicle) / 1000.0) * 100)))
    local _, lightsOn, highBeamsOn = GetVehicleLightsState(vehicle)
    local lockStatus = GetVehicleDoorLockStatus(vehicle)
    local locked = lockStatus == 2 or lockStatus == 3 or lockStatus == 4 or lockStatus == 5
    -- Engine ON/OFF must follow ignition state only. RPM can remain non-zero
    -- briefly after ignition is switched off, so never use RPM as an ON fallback.
    -- Read authoritative ignition state published by dc-vehicle-ignition.
    local engineOn = false
    local ignitionState = nil
    pcall(function() ignitionState = Entity(vehicle).state.dcIgnitionOn end)
    if ignitionState ~= nil then
        engineOn = ignitionState == true
    else
        local nativeEngineOn = false
        pcall(function() nativeEngineOn = IsVehicleEngineOn(vehicle) end)
        engineOn = nativeEngineOn == true
    end
    local lightsOnBool = (lightsOn == true or lightsOn == 1) or (highBeamsOn == true or highBeamsOn == 1)
    local rpm = math.max(0.0, math.min(1.0, GetVehicleCurrentRpm(vehicle) or 0.0))

    return {
        inVehicle = true,
        driver = GetPedInVehicleSeat(vehicle, -1) == ped,
        speed = speed,
        maxSpeed = maxSpeed,
        fuel = fuelLitres,
        maxFuel = tankCapacity,
        name = displayName,
        gear = gear,
        engine = engineOn,
        rpm = rpm,
        engineHealth = engineHealth,
        locked = locked,
        lights = lightsOnBool,
        highBeams = (highBeamsOn == true or highBeamsOn == 1),
        seatbelt = Phase1.seatbelt,
    }
end

local function collectWeapon(ped)
    local weapon = GetSelectedPedWeapon(ped)
    if weapon == joaat('WEAPON_UNARMED') or weapon == 0 then
        Phase1.lastWeapon = weapon
        return { armed = false, clip = 0, reserve = 0, total = 0 }
    end

    local total = GetAmmoInPedWeapon(ped, weapon) or 0
    local _, clip = GetAmmoInClip(ped, weapon)
    clip = tonumber(clip or 0) or 0
    local reserve = math.max(0, total - clip)
    Phase1.lastWeapon = weapon
    return { armed = true, clip = clip, reserve = reserve, total = total }
end

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    Phase1.loaded = true
    Phase1.visible = true
    Wait(700)
    refreshServerState()
    send('phase1:visible', { value = true })
end)

RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
    Phase1.loaded = false
    send('phase1:visible', { value = false })
end)

RegisterNetEvent('QBCore:Player:SetPlayerData', function(data)
    if not data then return end
    local money = data.money or {}
    local cash = tonumber(money.cash or 0) or 0
    local bank = tonumber(money.bank or 0) or 0
    lastPlayerDataSync = { at = GetGameTimer(), cash = cash, bank = bank }
    send('phase1:moneySync', { cash = cash, bank = bank })
end)

RegisterNetEvent('QBCore:Client:OnMoneyChange', function(account, amount, action)
    if action == 'set' then
        local cash, bank = playerMoney()
        send('phase1:moneySync', { cash = cash, bank = bank })
        return
    end
    sendMoneyFx(account, amount, action == 'remove')
end)

RegisterNetEvent('hud:client:OnMoneyChange', function(account, amount, isMinus)
    account = tostring(account or 'cash')
    amount = tonumber(amount or 0) or 0
    local now = GetGameTimer()
    local syncedBalance = account == 'bank' and lastPlayerDataSync.bank or lastPlayerDataSync.cash
    -- Some legacy resources misuse this HUD event as a full-balance refresh. Do not animate that as a transaction.
    if (now - lastPlayerDataSync.at) < 650 and math.abs(amount - syncedBalance) < 0.01 then
        send('phase1:moneySync', { cash = lastPlayerDataSync.cash, bank = lastPlayerDataSync.bank })
        return
    end
    sendMoneyFx(account, amount, isMinus == true)
end)

RegisterNetEvent('seatbelt:client:ToggleSeatbelt', function(state)
    if type(state) == 'boolean' then
        Phase1.seatbelt = state
    else
        Phase1.seatbelt = not Phase1.seatbelt
    end
    send('phase1:seatbelt', { value = Phase1.seatbelt })
end)

RegisterNetEvent('pma-voice:setTalkingMode', function(mode)
    Phase1.voiceMode = tonumber(mode or 1) or 1
end)


RegisterNetEvent('dc-core-ui:client:SetPhase1Preference', function(key, value)
    key = tostring(key or '')
    if Phase1.prefs[key] == nil then return end
    Phase1.prefs[key] = value == true
    if key == 'vehicle_hud' then
        send('setting', { key = 'vehicle_hud', value = Phase1.prefs.vehicle_hud })
    elseif key == 'damage_indicator' then
        send('setting', { key = 'damage_indicator', value = Phase1.prefs.damage_indicator })
    end
end)

RegisterNetEvent('dc-core-ui:client:SetZoneState', function(zoneName, enabled, label)
    zoneName = tostring(zoneName or ''):lower()
    if zoneName == 'fish' then zoneName = 'fishing' end
    if zoneName ~= 'green' and zoneName ~= 'red' and zoneName ~= 'fishing' then return end
    Phase1.zones[zoneName] = enabled == true
    send('phase1:zone', { zone = zoneName, enabled = enabled == true, label = label })
end)

RegisterNetEvent('dc-core-ui:client:SetPrisonTimer', function(seconds, reason)
    seconds = math.max(0, math.floor(tonumber(seconds or 0) or 0))
    Phase1.prisonTimer = seconds > 0 and { seconds = seconds, reason = tostring(reason or '') } or nil
    send('phase1:timer', { timer = 'prison', seconds = seconds, label = 'ARREST TIME', reason = tostring(reason or '') })
end)

RegisterNetEvent('dc-core-ui:client:ClearPrisonTimer', function()
    Phase1.prisonTimer = nil
    send('phase1:timerClear', { timer = 'prison' })
end)

RegisterNetEvent('dc-core-ui:client:SetWorkTimer', function(seconds, label)
    send('phase1:timer', { timer = 'work', seconds = math.max(0, math.floor(tonumber(seconds or 0) or 0)), label = tostring(label or 'WORK') })
end)

RegisterNetEvent('dc-core-ui:client:ClearWorkTimer', function()
    send('phase1:timerClear', { timer = 'work' })
end)

RegisterNetEvent('dc-core-ui:client:SetQuestTimer', function(seconds, title, subtitle)
    send('phase1:timer', { timer = 'quest', seconds = math.max(0, math.floor(tonumber(seconds or 0) or 0)), label = tostring(title or 'QUEST'), subtitle = tostring(subtitle or '') })
end)

RegisterNetEvent('dc-core-ui:client:ClearQuestTimer', function()
    send('phase1:timerClear', { timer = 'quest' })
end)

RegisterNetEvent('dc-core-ui:client:SetCaptureTimer', function(seconds, label)
    send('phase1:timer', { timer = 'capture', seconds = math.max(0, math.floor(tonumber(seconds or 0) or 0)), label = tostring(label or 'CAPTURE') })
end)

RegisterNetEvent('dc-core-ui:client:ClearCaptureTimer', function()
    send('phase1:timerClear', { timer = 'capture' })
end)

exports('SetZoneState', function(zoneName, enabled, label)
    TriggerEvent('dc-core-ui:client:SetZoneState', zoneName, enabled, label)
end)
exports('SetPrisonTimer', function(seconds, reason) TriggerEvent('dc-core-ui:client:SetPrisonTimer', seconds, reason) end)
exports('ClearPrisonTimer', function() TriggerEvent('dc-core-ui:client:ClearPrisonTimer') end)
exports('SetWorkTimer', function(seconds, label) TriggerEvent('dc-core-ui:client:SetWorkTimer', seconds, label) end)
exports('ClearWorkTimer', function() TriggerEvent('dc-core-ui:client:ClearWorkTimer') end)
exports('SetQuestTimer', function(seconds, title, subtitle) TriggerEvent('dc-core-ui:client:SetQuestTimer', seconds, title, subtitle) end)
exports('ClearQuestTimer', function() TriggerEvent('dc-core-ui:client:ClearQuestTimer') end)
exports('SetCaptureTimer', function(seconds, label) TriggerEvent('dc-core-ui:client:SetCaptureTimer', seconds, label) end)
exports('ClearCaptureTimer', function() TriggerEvent('dc-core-ui:client:ClearCaptureTimer') end)

-- qb-prison compatibility. The metadata value is minutes/month-style units in qb-prison,
-- while the Dark City department prison sends exact seconds through its own bridge.
RegisterNetEvent('prison:client:Enter', function(jailTime)
    local units = math.max(0, tonumber(jailTime or 0) or 0)
    if units > 0 and not Phase1.prisonTimer then
        TriggerEvent('dc-core-ui:client:SetPrisonTimer', units * 60, 'Prison sentence')
    end
end)

CreateThread(function()
    Wait(1500)
    local pd = QBCore.Functions.GetPlayerData() or {}
    Phase1.loaded = pd.citizenid ~= nil
    if Phase1.loaded then refreshServerState() end

    while true do
        if Phase1.loaded and Phase1.visible then
            local ped = PlayerPedId()
            local street, area = currentStreet(ped)
            local voiceIndex, voiceLabel = getVoiceMode()
            local telemetry = {
                vehicle = collectVehicle(ped),
                weapon = collectWeapon(ped),
                voice = {
                    talking = NetworkIsPlayerTalking(PlayerId()),
                    mode = voiceIndex,
                    label = voiceLabel,
                    radioActive = LocalPlayer.state.radioActive == true,
                    radioChannel = tonumber(LocalPlayer.state.radioChannel or 0) or 0,
                },
                location = { street = street, area = area },
                zones = Phase1.zones,
            }
            send('phase1:telemetry', telemetry)
            Wait(Phase1.lastVehicle ~= 0 and 100 or 250)
        else
            Wait(1000)
        end
    end
end)

CreateThread(function()
    while true do
        if Phase1.loaded then refreshServerState() end
        Wait(5000)
    end
end)


-- Attacker damage feedback: snapshot nearby player peds and show the actual health/armor loss after a hit.
Phase1.entityVitals = {}

CreateThread(function()
    while true do
        if Phase1.loaded then
            local localPed = PlayerPedId()
            local localCoords = GetEntityCoords(localPed)
            for _, player in ipairs(GetActivePlayers()) do
                local target = GetPlayerPed(player)
                if target ~= 0 and target ~= localPed and DoesEntityExist(target) then
                    Phase1.entityVitals[target] = { health = GetEntityHealth(target), armor = GetPedArmour(target), at = GetGameTimer() }
                end
            end
        end
        Wait(75)
    end
end)

AddEventHandler('gameEventTriggered', function(event, data)
    if event ~= 'CEventNetworkEntityDamage' or type(data) ~= 'table' then return end

    local victim = data[1]
    local attacker = data[2]
    local victimDied = data[4] == 1 or data[4] == true
    local weapon = data[7] or data[5] or 0
    local localPed = PlayerPedId()
    if victim == 0 or victim == localPed or not IsEntityAPed(victim) or not DoesEntityExist(victim) then return end

    local localVehicle = GetVehiclePedIsIn(localPed, false)
    local attackerIsLocal = attacker == localPed or (localVehicle ~= 0 and attacker == localVehicle)
    if not attackerIsLocal and attacker ~= 0 and DoesEntityExist(attacker) and IsEntityAVehicle(attacker) then
        attackerIsLocal = GetPedInVehicleSeat(attacker, -1) == localPed
    end
    if not attackerIsLocal and attacker ~= 0 and IsEntityAPed(attacker) then
        local attackerPlayer = NetworkGetPlayerIndexFromPed(attacker)
        attackerIsLocal = attackerPlayer == PlayerId()
    end
    if not attackerIsLocal then return end

    local before = Phase1.entityVitals[victim]
    local afterHealth = GetEntityHealth(victim)
    local afterArmor = GetPedArmour(victim)
    local healthDamage = before and math.max(0, (tonumber(before.health) or afterHealth) - afterHealth) or 0
    local armorDamage = before and math.max(0, (tonumber(before.armor) or afterArmor) - afterArmor) or 0
    local totalDamage = healthDamage + armorDamage

    if totalDamage <= 0 then
        local ok, baseDamage = pcall(function() return GetWeaponDamage(weapon, 0) end)
        if ok and tonumber(baseDamage) and tonumber(baseDamage) > 0 then
            healthDamage = tonumber(baseDamage)
            totalDamage = healthDamage
        end
    end

    if totalDamage > 0 then
        send('phase1:damageDealt', {
            amount = math.max(1, math.floor(totalDamage + 0.5)),
            health = math.max(0, math.floor(healthDamage + 0.5)),
            armor = math.max(0, math.floor(armorDamage + 0.5)),
            fatal = victimDied
        })
    end

    CreateThread(function()
        Wait(40)
        if DoesEntityExist(victim) then
            Phase1.entityVitals[victim] = { health = GetEntityHealth(victim), armor = GetPedArmour(victim), at = GetGameTimer() }
        end
    end)
end)

-- Settings V16: damage feedback and auto-seatbelt preference.
CreateThread(function()
    Wait(1500)
    Phase1.lastHealth = GetEntityHealth(PlayerPedId())

    while true do
        if Phase1.loaded then
            local ped = PlayerPedId()
            local health = GetEntityHealth(ped)
            if Phase1.prefs.damage_indicator and Phase1.lastHealth > 0 and health > 0 and health < Phase1.lastHealth then
                local direction = 'front'
                -- GetPedSourceOfDamage is not available in this FiveM runtime.
                -- Keep a safe default direction instead of throwing a client error.
                local sourceEntity = 0
                send('phase1:damage', { direction = direction, amount = Phase1.lastHealth - health })
            end
            Phase1.lastHealth = health

            -- Seatbelts are manual only; B toggles the belt.
            Phase1.autoBeltVehicle = 0
            Wait(120)
        else
            Wait(1000)
        end
    end
end)


-- Restart-safe state bridge: dc-core-ui can restart independently without losing zone/jail UI state.
CreateThread(function()
    local lastGreen = nil
    local lastRed = nil
    local lastFishing = nil
    local lastPrisonSeconds = -1

    while true do
        if Phase1.loaded then
            if GetResourceState('dc-worldmanager') == 'started' then
                local ok, zone = pcall(function() return exports['dc-worldmanager']:GetCurrentZone() end)
                if ok then
                    zone = tostring(zone or ''):lower()
                    local green = zone == 'green'
                    local red = zone == 'red'
                    if green ~= lastGreen then
                        lastGreen = green
                        TriggerEvent('dc-core-ui:client:SetZoneState', 'green', green, 'GREEN ZONE')
                    end
                    if red ~= lastRed then
                        lastRed = red
                        TriggerEvent('dc-core-ui:client:SetZoneState', 'red', red, 'RED ZONE')
                    end
                end
            end

            if GetResourceState('dc-fishing') == 'started' then
                local ok, active = pcall(function() return exports['dc-fishing']:IsFishingZoneActive() end)
                if ok then
                    active = active == true
                    if active ~= lastFishing then
                        lastFishing = active
                        TriggerEvent('dc-core-ui:client:SetZoneState', 'fishing', active, 'FISHING PLACE')
                    end
                end
            end

            if GetResourceState('dc-departments') == 'started' then
                local ok, seconds, reason = pcall(function()
                    local left, why = exports['dc-departments']:GetPrisonTimerState()
                    return left, why
                end)
                if ok then
                    seconds = math.max(0, math.floor(tonumber(seconds or 0) or 0))
                    if seconds > 0 then
                        if lastPrisonSeconds <= 0 or math.abs(seconds - lastPrisonSeconds) > 2 then
                            TriggerEvent('dc-core-ui:client:SetPrisonTimer', seconds, tostring(reason or ''))
                        end
                    elseif lastPrisonSeconds > 0 then
                        TriggerEvent('dc-core-ui:client:ClearPrisonTimer')
                    end
                    lastPrisonSeconds = seconds
                end
            end
        end
        Wait(1000)
    end
end)


CreateThread(function()
    while true do
        if Phase1.loaded then
            -- Hide stock GTA HUD pieces replaced by Phase 1.
            HideHudComponentThisFrame(2)
            HideHudComponentThisFrame(3)
            HideHudComponentThisFrame(6)
            HideHudComponentThisFrame(7)
            HideHudComponentThisFrame(8)
            HideHudComponentThisFrame(9)
        end
        Wait(0)
    end
end)


-- Dark City RP map-only mode: pause/map screen hides custom HUD and chat.
CreateThread(function()
    local wasMap=false
    while true do
        Wait(100)
        local map=IsPauseMenuActive()
        if map~=wasMap then
            wasMap=map
            Phase1.visible=not map
            send('phase1:visible',{value=not map})
            if GetResourceState('dc-chat')=='started' then
                TriggerEvent('dc-chat:client:SetVisibility',not map)
            end
            if GetResourceState('dc-tutorial')=='started' then
                SendNUIMessage({action='hudHide'})
            end
            if GetResourceState('qb-hud')=='started' then
                SendNUIMessage({action='hudtick', show=not map})
                SendNUIMessage({action='car', show=not map})
            end
        end
    end
end)

RegisterNetEvent('dc-core-ui:client:Phase1MoneySync', function(cash, bank)
    send('phase1:moneySync', { cash = tonumber(cash or 0) or 0, bank = tonumber(bank or 0) or 0 })
end)

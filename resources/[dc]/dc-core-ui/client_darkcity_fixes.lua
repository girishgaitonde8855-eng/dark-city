local QBCore = exports['qb-core']:GetCoreObject()

-- Dark City RP: pause/map screen must show the map only.
-- Keep map/radar and map blips; suppress custom HUD/chat while the pause map is active.
CreateThread(function()
    local wasPaused = false
    while true do
        local paused = IsPauseMenuActive()
        if paused then
            -- Hide normal gameplay HUD layers without disabling the map itself.
            SendNUIMessage({ action = 'hudVisible', value = false })
            TriggerEvent('dc-core-ui:client:SetHudVisible', false)
            TriggerEvent('dc-chat:client:SetVisibility', false)
            DisplayRadar(true)
            -- Keep GTA pause/map UI and its blips available.
        elseif wasPaused then
            SendNUIMessage({ action = 'hudVisible', value = true })
            TriggerEvent('dc-core-ui:client:SetHudVisible', true)
            TriggerEvent('dc-chat:client:SetVisibility', true)
        end
        wasPaused = paused
        Wait(paused and 0 or 250)
    end
end)

-- Engine control is owned exclusively by dc-vehicle-ignition.
-- Do not run a second engine-state loop here: two resources fighting over
-- SetVehicleEngineOn can make a vehicle start and immediately shut off.

-- Unconscious/dead players cannot stand or walk.
CreateThread(function()
    while true do
        local ped = PlayerPedId()
        local unconscious = LocalPlayer.state and (LocalPlayer.state.dc_unconscious == true or LocalPlayer.state.dc_dead == true)
        if unconscious then
            Wait(0)
            DisableControlAction(0, 21, true)
            DisableControlAction(0, 22, true)
            DisableControlAction(0, 23, true)
            DisableControlAction(0, 24, true)
            DisableControlAction(0, 25, true)
            DisableControlAction(0, 30, true)
            DisableControlAction(0, 31, true)
            DisableControlAction(0, 32, true)
            DisableControlAction(0, 33, true)
            DisableControlAction(0, 34, true)
            DisableControlAction(0, 35, true)
            if not IsEntityDead(ped) and GetEntityHealth(ped) <= 115 then
                SetPedMoveRateOverride(ped, 0.0)
            end
        else
            Wait(400)
        end
    end
end)

-- Fall damage: GTA can be overridden by invincibility in another resource.
-- Apply damage only after a real airborne fall, and never while the ambulance
-- death-state owns the ped.
local lastGroundZ, airborneZ, airborne = nil, nil, false
CreateThread(function()
    while true do
        local ped = PlayerPedId()
        if DoesEntityExist(ped) and not IsEntityDead(ped)
           and not (LocalPlayer.state and LocalPlayer.state.dc_unconscious == true) then
            local c = GetEntityCoords(ped)
            if not IsPedInAnyVehicle(ped, false) and not IsPedSwimming(ped) then
                if IsEntityInAir(ped) and not IsPedClimbing(ped) then
                    if not airborne then airborne = true; airborneZ = c.z end
                elseif airborne then
                    local drop = (airborneZ or c.z) - c.z
                    if drop >= 7.0 and HasEntityCollidedWithAnything(ped) then
                        local damage = math.floor(math.max(5.0, (drop - 5.0) * 2.8))
                        local hp = GetEntityHealth(ped)
                        local armour = GetPedArmour(ped)
                        if armour > 0 then
                            local absorb = math.min(armour, damage)
                            SetPedArmour(ped, armour - absorb)
                            damage = damage - absorb
                        end
                        if damage > 0 then
                            SetEntityInvincible(ped, false)
                            SetEntityCanBeDamaged(ped, true)
                            SetEntityHealth(ped, math.max(0, hp - damage))
                        end
                    end
                    airborne = false
                end
            else
                airborne = false
            end
            lastGroundZ = c.z
        end
        Wait(100)
    end
end)

-- New-player hair fallback: only repair a genuinely bald freemode spawn.
local function ensureStarterHair()
    local ped = PlayerPedId()
    local model = GetEntityModel(ped)
    if model ~= `mp_m_freemode_01` and model ~= `mp_f_freemode_01` then return end
    local hair = GetPedDrawableVariation(ped, 2)
    if hair == 0 then
        -- 1 is a valid basic freemode hairstyle on both standard freemode bases.
        SetPedComponentVariation(ped, 2, 1, 0, 0)
        SetPedHairColor(ped, GetPedHairColor(ped), GetPedHairHighlightColor(ped))
    end
end
RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    CreateThread(function()
        Wait(1800)
        ensureStarterHair()
    end)
end)

-- Gang base blips are created by dc-map-blips from config. Refresh them after load.
RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    Wait(2200)
    TriggerEvent('dc-map-blips:client:Refresh')
end)

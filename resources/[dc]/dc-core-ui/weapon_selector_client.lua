-- Inventory owns weapon equip. Suppress only GTA's default weapon selector.
-- RegisterKeyMapping inventory slots remain independent from these PAD actions.
local weaponControls = { 37, 12, 13, 14, 15, 16, 17, 157, 158, 159, 160, 161, 162, 163, 164, 165 }
CreateThread(function()
    while true do
        for group = 0, 2 do
            for _, control in ipairs(weaponControls) do
                DisableControlAction(group, control, true)
            end
        end
        HideHudComponentThisFrame(19)
        HideHudComponentThisFrame(20)
        HudWeaponWheelIgnoreSelection()
        Wait(0)
    end
end)

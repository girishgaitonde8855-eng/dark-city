DARK CITY RP - PREMIUM SPEEDOMETER V16

This build replaces the existing Phase 1 vehicle speedometer with a premium glass-style dashboard:
- Large circular live speed gauge with orange progress ring
- Current vehicle display name (uses the model label registered by dc-premium-stores)
- Current fuel in litres and tank capacity
- Configured maximum speed
- Engine health/status, gear, seatbelt, lock and light indicators
- Responsive scaling for common screen sizes

Install:
1. Backup your current dc-core-ui resource.
2. Extract this ZIP.
3. Replace the existing dc-core-ui folder with the included dc-core-ui folder.
4. Ensure dc-premium-stores starts before/alongside dc-core-ui so its vehicle-name labels are registered.
5. Restart dc-core-ui, then enter a vehicle to test.

Commands:
restart dc-premium-stores
restart dc-core-ui

Notes:
- The speedometer is a live HTML/CSS/JS UI, not a static generated image.
- Fuel display uses the telemetry already collected by phase1_client.lua and shows litres / tank capacity.
- Speed display uses dcTopSpeed / dcStoreSpeed when available, otherwise the game's estimated max speed.
- In-game testing is still required on your server and screen resolution.

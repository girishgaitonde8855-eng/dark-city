DARK CITY RP — V40 ULTRA PREMIUM M MENU + SPAWN
================================================

This is a complete dc-core-ui resource based on the supplied original resource.

VISUAL UPGRADE
- Premium cinematic glass UI
- Large image treatment inside individual cards/boxes
- HD local artwork pack under html/premium_art/
- Statistics tiles use different artwork
- Profile/XP hero panels use large artwork
- Jobs, faction, family, real estate, business, store, achievements,
  battle pass, daily reward, contact admin, referral, settings and Prime
  panels receive image layers
- Sidebar/nav upgraded
- Spawn menu upgraded with large cinematic cards
- Airport spawn explicitly uses premium_art/airport.jpg
- Hover zoom/glow effects

FUNCTIONALITY
- Existing app.js logic preserved except spawn card image selection:
  airport/hospital/sandy/paleto/legion/last are assigned visual artwork.
- Existing NUI action/event names are not intentionally changed.
- No database or Lua gameplay changes are included.

INSTALL
1. BACK UP your current [dc]/dc-core-ui folder.
2. Replace the COMPLETE dc-core-ui folder with this package's [dc]/dc-core-ui.
3. Restart dc-core-ui or restart the server.
4. If FiveM/browser cache shows old CSS, restart the resource/server; the
   HTML uses a new cache-busting version string (dc-premium-v40).

IMPORTANT
Do not merge only individual CSS snippets. Use the complete resource so the
new premium_art assets are present.

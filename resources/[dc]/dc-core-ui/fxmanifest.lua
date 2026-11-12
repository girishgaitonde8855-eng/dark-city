fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'Dark City RP'
description 'Dark City RP Core UI - Dark City Phase 3 unified menu + Phase 1 HUD'
version '6.1.0-darkcity-premium-v2'

ui_page 'html/index.html'

shared_script 'config.lua'
client_scripts {
    'client.lua',
    'phase1_client.lua',
    'client_darkcity_fixes.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server.lua',
    'phase1_server.lua'
}

files {
    'html/index.html',
    'html/style.css',
    'html/app.js',
    'html/phase1_hud.css',
    'html/phase3_ui.css',
    'html/dc_premium_v2.css',
    'html/phase1_hud.js',
    'html/img/**/*.*'
}

dependencies {
    'qb-core',
    'oxmysql'
}

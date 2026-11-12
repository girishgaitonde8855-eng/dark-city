Config = {}

Config.Debug = false
Config.OpenKey = 'M'
Config.HudEnabled = true
Config.HudRefreshMs = 5000
Config.DefaultView = 'statisticsTab'

Config.AuthOnJoin = true
Config.AuthDelayMs = 2500

Config.HospitalRespawn = vector4(304.7494, -588.2769, 43.1298, 70.0)

Config.Spawns = {
    { id='last', label='Last Location', coords=nil, icon='📍' },
    { id='organization', label='Organization', coords=nil, icon='🛡️' },
    { id='house', label='House', coords=nil, icon='🏠' },
    { id='airport', label='Airport', coords=vector4(-1037.65, -2737.84, 20.17, 330.0), icon='✈️' },
}

Config.OrgSpawns = {
    police = vector4(441.048, -978.8915, 30.6896, 203.3063),
    lspd = vector4(441.048, -978.8915, 30.6896, 203.3063),
    fib = vector4(136.0, -761.0, 45.75, 160.0),
    gov = vector4(-545.0, -204.0, 38.22, 205.0),
    ambulance = vector4(304.7494, -588.2769, 43.1298, 70.0),
    ems = vector4(304.7494, -588.2769, 43.1298, 70.0),
    bloods = vector4(413.9573, -1548.4282, 29.2385, 21.6895),
    families = vector4(-164.7061, -1674.8501, 33.2346, 48.6165),
    vagos = vector4(352.6813, -2035.7576, 22.3543, 126.3356),
    ballas = vector4(106.1, -1941.2, 20.8, 320.0),
    default = vector4(195.17, -933.77, 30.69, 144.0),
}
Config.HouseSpawnFallback = vector4(-774.0, 312.0, 85.7, 180.0)

Config.ViewAliases = {
    statisticsTab='statisticsTab',
    darkStore='darkStore',
    familyMenu='familyMenu',
    organization='organization',
    jobs='jobs',
    realEstate='realEstate',
    settings='settings',
    battlePass='battlePass',
    dailyReward='dailyReward',
    achievement='achievement',
    contactAdmin='contactAdmin',
    referral='referral',
    prime='prime',
    auth='auth',
    newauth='auth',
    newauths='auth',
    spawn='spawnSelect',
    spawnSelect='spawnSelect',
    customization='customization',
    newcustomization='customization',
    deathScreen='deathScreen',
    reportMenu='contactAdmin',
    truckersMenu='jobs',
    businessPurchase='realEstate',
    homePurchase='realEstate',
}

Config.Commands = {
    Open = 'dcui',
    Bank = 'bank',
    Inventory = 'invui',
    Report = 'report',
    Passport = 'passport',
    Hud = 'togglehud',
}

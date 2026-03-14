"""
Curated account registry — maps assets to the top X/Twitter accounts
that produce high-signal content for that asset.

How to maintain this:
- Add handles as you discover better sources.
- Accounts are ordered by signal quality (best first).
- Run /admin/rank-accounts (future) to let Claude re-rank based on engagement.
"""

ASSET_ACCOUNTS: dict[str, list[str]] = {
    "GOLD": [
        "KitcoNews",         # Kitco — gold price news
        "GoldSilverWorlds",  # macro + precious metals
        "PeterSchiff",       # gold bull, macro commentary
        "JimRickards",       # monetary system, gold
        "JanNielsen_",       # gold/silver technical analysis
        "SilverDoctors",     # precious metals news
        "GoldTelegraph_",    # gold market updates
        "RonStoeferle",      # In Gold We Trust report author
        "Mike_Maloney",      # gold/silver education
        "GoldMoney",         # gold-backed finance
        "LawrieOnGold",      # gold market analysis
        "StellarCollapse",   # macro + commodities
        "DanOliver_",        # Myrmikan Capital — gold
        "TaviCosta",         # macro/commodities researcher
        "LukeGromen",        # Forest for the Trees macro
        "IanBremmer",        # geopolitical risk (gold safe haven)
        "julianmb",          # Julian Brigden macro
        "FeroxCapital",      # commodity trading
        "MacroAlf",          # macro — rates/gold correlation
        "DiMartinoBooth",    # Fed watcher — gold impact
        "HoweStreet",        # precious metals radio
        "GoldSeek",          # gold news aggregator
        "GoldEagle",         # gold investment
        "GoldSilverNews",    # daily precious metals
        "MiningDotCom",      # mining stocks + gold
        "SprottMoney",       # gold/silver bullion
        "SchiffGold",        # Peter Schiff's gold company
        "BullionStar",       # gold market research
        "GoldCoreNews",      # gold IRA + market news
        "GoldBroker",        # French gold intelligence
        "MarcFaber",         # Dr. Doom — macro/gold
        "MattersonMacro",    # macro cycles
        "VBL_source",        # gold/silver trading desk
        "SilverSeeker",      # silver + gold news
        "GoldSilverRatio",   # ratio trading signals
        "WallStSilver",      # silver/gold reddit → twitter bridge
        "rickRule",          # resource sector investing
        "BMGgroup",          # gold/silver research
        "PhilippineGold",    # Asian gold demand
        "TurkGoldMoney",     # James Turk — GoldMoney founder
        "GoldSilverWeb",     # gold/silver forecasting
        "commoditywatch",    # broad commodities incl. gold
        "GoldAlertHQ",       # real-time gold alerts
        "BullionVault",      # gold market data
        "ResearchedMacro",   # macro + gold correlation
        "darioperkins_",     # TS Lombard macro
        "DuncanMacInnes",    # Ruffer — real assets
        "HenrikZeberg",      # macro cycle + commodities
        "ClarencesTake",     # gold/silver momentum
        "GoldCoreTV",        # video commentary on gold
    ],

    "BTC": [
        "saylor",            # MicroStrategy — BTC advocate
        "aantonop",          # Andreas Antonopoulos
        "PeterLBrandt",      # veteran chart trader
        "APompliano",        # Morgan Creek — BTC
        "WClementeIII",      # on-chain analytics
        "glassnode",         # on-chain data
        "woonomic",          # Willy Woo on-chain
        "RaoulGMI",          # Real Vision macro + BTC
        "DocumentingBTC",    # BTC adoption news
        "BitcoinMagazine",   # BTC news
        "CathieDWood",       # ARK — BTC price targets
        "NickSzabo4",        # cypherpunk / BTC OG
        "adam3us",           # Blockstream CEO
        "pierre_rochard",    # BTC treasury
        "matt_odell",        # BTC privacy/self custody
    ],

    "ETH": [
        "VitalikButerin",    # Ethereum founder
        "sassal0x",          # Daily Gwei
        "EthHub",            # Ethereum education
        "RyanSAdams",        # Bankless
        "TrustlessState",    # Bankless
        "lightclients",      # Ethereum dev
        "evan_van_ness",     # Week in Ethereum
        "TimBeiko",          # Ethereum core dev
        "StakeWithPride",    # staking analytics
        "ultrasoundmoney",   # ETH monetary policy
    ],

    "SOL": [
        "aeyakovenko",       # Solana co-founder
        "rajgokal",          # Solana co-founder
        "solana",            # official
        "SolanaFloor",       # Solana NFT/ecosystem
        "heliumdotcom",      # major Solana app
        "armaniferrante",    # Solana ecosystem
        "weremeow",          # Solana DeFi
        "0xMert_",           # Helius — Solana infra
        "solanalegend",      # Solana trading
        "SolanaCompass",     # ecosystem tracker
    ],

    "OIL": [
        "HFI_Research",      # oil market research
        "eia_gov",           # US energy data
        "OilPrice_com",      # oil news
        "RobertMcNally_",    # Rapidan Energy
        "ClarkeMacDonald_",  # oil macro
        "EnergyIntelGrp",    # Energy Intelligence
        "JavierBlas",        # Bloomberg commodities editor
        "KlausMedved",       # oil trading
        "RystadEnergy",      # upstream analytics
        "SPGlobal_Energy",   # S&P energy data
    ],

    "SPX": [
        "michaellebowitz",   # 720 Global macro
        "markets",           # Bloomberg markets
        "elerianm",          # Mohamed El-Erian
        "LizAnnSonders",     # Schwab chief strategist
        "KobeissiLetter",    # markets newsletter
        "MacroCharts",       # long-term macro charts
        "Jesse_Livermore",   # equity macro
        "unusual_whales",    # options flow
        "zerohedge",         # market news
        "SoberLook",         # Walter Kurtz macro
    ],
}

# Alias map — normalize user input
ASSET_ALIASES: dict[str, str] = {
    "XAUUSD": "GOLD",
    "XAU": "GOLD",
    "BITCOIN": "BTC",
    "ETHEREUM": "ETH",
    "SOLANA": "SOL",
    "CRUDE": "OIL",
    "WTI": "OIL",
    "BRENT": "OIL",
    "SP500": "SPX",
    "S&P": "SPX",
}


def get_accounts_for_asset(asset: str, limit: int = 50) -> list[str]:
    """Return up to `limit` curated handles for a given asset ticker."""
    key = ASSET_ALIASES.get(asset.upper(), asset.upper())
    return ASSET_ACCOUNTS.get(key, [])[:limit]


def all_supported_assets() -> list[str]:
    return list(ASSET_ACCOUNTS.keys())

"""
News Ingestion Service.

Sources:
  - CryptoPanic  → crypto news aggregated from 100+ sources (free tier)
  - Marketaux    → finance/macro news: gold, oil, SPX, forex (free tier)

Falls back to mock data when keys are missing or USE_MOCK_NEWS=true.
"""
import os
import hashlib
import httpx
from datetime import datetime, timezone
from models.schemas import NewsItem

USE_MOCK = os.environ.get("USE_MOCK_NEWS", "true").lower() == "true"
CRYPTOPANIC_KEY = os.environ.get("CRYPTOPANIC_API_KEY", "")
MARKETAUX_KEY = os.environ.get("MARKETAUX_API_KEY", "")

# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------
MOCK_FEED: list[NewsItem] = [
    NewsItem(
        id="mock-001",
        headline="SEC approves spot Bitcoin ETF options, institutional floodgates open",
        body="The Securities and Exchange Commission greenlighted options trading on spot Bitcoin ETFs, a move analysts say could bring billions in new institutional capital to crypto markets within weeks.",
        source="Reuters",
        published_at="2026-03-14T08:00:00Z",
        url="https://reuters.com/mock",
        thumbnail="https://picsum.photos/seed/btc-etf/400/250",
    ),
    NewsItem(
        id="mock-002",
        headline="Ethereum Pectra upgrade goes live on mainnet — EIP-7702 enables smart accounts",
        body="Ethereum's long-awaited Pectra upgrade activated on mainnet, introducing account abstraction via EIP-7702 and increasing validator withdrawal limits.",
        source="CoinDesk",
        published_at="2026-03-14T06:30:00Z",
        url="https://coindesk.com/mock",
        thumbnail="https://picsum.photos/seed/eth-pectra/400/250",
    ),
    NewsItem(
        id="mock-003",
        headline="Solana network congestion spikes 400% amid meme coin frenzy",
        body="Solana's transaction failure rates climbed sharply as a wave of meme coin launches overwhelmed the network.",
        source="The Block",
        published_at="2026-03-14T05:15:00Z",
        url="https://theblock.co/mock",
        thumbnail="https://picsum.photos/seed/sol-cong/400/250",
    ),
    NewsItem(
        id="mock-004",
        headline="Federal Reserve signals two rate cuts in 2026 — risk assets rally",
        body="Fed Chair Powell indicated the central bank expects to cut rates twice this year, sending equities and crypto markets sharply higher.",
        source="Bloomberg Crypto",
        published_at="2026-03-14T04:00:00Z",
        url="https://bloomberg.com/mock",
        thumbnail="https://picsum.photos/seed/fed-rates/400/250",
    ),
    NewsItem(
        id="mock-005",
        headline="Gold hits all-time high as dollar weakens on trade war fears",
        body="Spot gold surged past $3,100/oz as investors fled to safe havens amid escalating US-China trade tensions and a weakening dollar index.",
        source="Reuters Markets",
        published_at="2026-03-14T03:30:00Z",
        url="https://reuters.com/mock-gold",
        thumbnail="https://picsum.photos/seed/gold-ath/400/250",
    ),
    NewsItem(
        id="mock-006",
        headline="Tether USDT supply surpasses $140B — liquidity wall for crypto markets",
        body="Tether's total USDT supply has hit an all-time high of $140 billion, signaling significant dry powder on the sidelines.",
        source="CoinTelegraph",
        published_at="2026-03-14T02:45:00Z",
        url="https://cointelegraph.com/mock",
        thumbnail="https://picsum.photos/seed/usdt-supply/400/250",
    ),
]


# ---------------------------------------------------------------------------
# CryptoPanic — crypto news aggregator (free tier available)
# Docs: https://cryptopanic.com/developers/api/
# ---------------------------------------------------------------------------
async def _fetch_cryptopanic(limit: int) -> list[NewsItem]:
    if not CRYPTOPANIC_KEY:
        return []

    params = {
        "auth_token": CRYPTOPANIC_KEY,
        "public": "true",
        "kind": "news",
        "filter": "hot",
        "regions": "en",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get("https://cryptopanic.com/api/v1/posts/", params=params)
        if r.status_code != 200:
            print(f"[CryptoPanic] {r.status_code} error")
            return []

    items = []
    for post in r.json().get("results", [])[:limit]:
        post_id = str(post.get("id", ""))
        items.append(NewsItem(
            id=f"cp-{hashlib.md5(post_id.encode()).hexdigest()[:8]}",
            headline=post.get("title", ""),
            body=None,
            source=post.get("source", {}).get("title", "CryptoPanic"),
            published_at=post.get("published_at", datetime.now(timezone.utc).isoformat()),
            url=post.get("url"),
            thumbnail=None,
        ))
    return items


# ---------------------------------------------------------------------------
# Marketaux — finance/macro news with sentiment (free: 100 req/day)
# Docs: https://www.marketaux.com/documentation
# ---------------------------------------------------------------------------
async def _fetch_marketaux(limit: int) -> list[NewsItem]:
    if not MARKETAUX_KEY:
        return []

    params = {
        "api_token": MARKETAUX_KEY,
        "industries": "Financial Services,Banking & Investment Services,Precious Metals & Mining,Energy - Fossil Fuels",
        "language": "en",
        "limit": limit,
        "sort": "published_desc",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get("https://api.marketaux.com/v1/news/all", params=params)
        if r.status_code != 200:
            print(f"[Marketaux] {r.status_code} error")
            return []

    items = []
    for a in r.json().get("data", [])[:limit]:
        art_id = str(a.get("uuid", ""))
        items.append(NewsItem(
            id=f"mx-{hashlib.md5(art_id.encode()).hexdigest()[:8]}",
            headline=a.get("title", ""),
            body=a.get("description") or a.get("snippet"),
            source=a.get("source", "Marketaux"),
            published_at=a.get("published_at", datetime.now(timezone.utc).isoformat()),
            url=a.get("url"),
            thumbnail=a.get("image_url"),
        ))
    return items


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def get_news_feed(limit: int = 20) -> list[NewsItem]:
    if USE_MOCK:
        return MOCK_FEED[:limit]

    # Fetch from both sources concurrently
    import asyncio
    crypto_items, finance_items = await asyncio.gather(
        _fetch_cryptopanic(limit // 2 + limit % 2),   # slightly more crypto
        _fetch_marketaux(limit // 2),
    )

    combined = crypto_items + finance_items

    # Sort by recency
    combined.sort(key=lambda n: n.published_at, reverse=True)

    return combined[:limit] if combined else MOCK_FEED[:limit]

"""
Polymarket integration — fetch and match prediction markets to news headlines.
Fetches events filtered by finance/crypto/economics tags, then does server-side
keyword relevance scoring since the search param is unreliable.
"""
import httpx
import json
import re

GAMMA_BASE = "https://gamma-api.polymarket.com"
LIQUID_PREDICT_URL = "https://app.tryliquid.xyz/predict"

# Tag slugs to fetch — finance, crypto, and geopolitical/commodity tags
FINANCE_TAGS = ["crypto", "finance", "economy", "stocks", "oil", "iran", "middle-east", "commodities", "geopolitics", "politics"]

# Keywords to pull from assets + headline for relevance matching
ASSET_KEYWORDS = {
    "BTC":  ["bitcoin", "btc", "crypto", "coinbase", "satoshi"],
    "ETH":  ["ethereum", "eth", "crypto"],
    "SOL":  ["solana", "sol", "crypto"],
    "XRP":  ["xrp", "ripple", "crypto"],
    "GOLD": ["gold", "xau", "bullion"],
    "OIL":  ["oil", "crude", "wti", "opec", "energy"],
    "JPM":  ["jpmorgan", "jp morgan", "bank", "lending"],
    "SPX":  ["s&p", "stocks", "equities"],
    "AAPL": ["apple", "iphone", "tech"],
    "NVDA": ["nvidia", "ai chips", "semiconductor"],
    "TSLA": ["tesla", "elon", "electric vehicle"],
    "MSFT": ["microsoft", "azure", "tech"],
}

MACRO_KEYWORDS = [
    "fed", "federal reserve", "rate", "inflation", "recession",
    "war", "iran", "russia", "ukraine", "china", "taiwan",
    "trump", "election", "tariff", "trade", "gdp",
    "bank", "debt", "credit", "lbo", "earnings",
    "gold", "bitcoin", "crypto", "oil", "energy",
    "hormuz", "strait", "nuclear", "israel", "strike", "missile",
    "ceasefire", "sanctions", "opec", "crude", "tanker",
]


def _score_market(question: str, keywords: list[str]) -> int:
    q = question.lower()
    score = 0
    for kw in keywords:
        # Word-boundary matching to avoid "war" matching "stewart", "gold" matching "golden"
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, q):
            score += (3 if len(kw) > 6 else 2 if len(kw) > 4 else 1)
    return score


def _build_keywords(headline: str, asset_tickers: list[str]) -> list[str]:
    kws = []
    # Asset-specific keywords
    for t in asset_tickers:
        kws.extend(ASSET_KEYWORDS.get(t.upper(), [t.lower()]))
    # Extract significant words from headline (>4 chars, not stopwords)
    stopwords = {"will", "with", "from", "this", "that", "have", "been",
                 "their", "they", "some", "into", "over", "after", "about",
                 "make", "push", "huge", "says", "bold", "high", "more",
                 "most", "last", "week", "year", "month", "next", "hits"}
    for word in re.findall(r'[a-zA-Z]{4,}', headline.lower()):
        if word not in stopwords:
            kws.append(word)
    # Add macro keywords that appear in headline
    for mk in MACRO_KEYWORDS:
        if mk in headline.lower() and mk not in kws:
            kws.append(mk)
    return list(dict.fromkeys(kws))  # dedupe preserving order


async def _fetch_tag_markets(client: httpx.AsyncClient, tag_slug: str) -> list[dict]:
    """Fetch markets from events with a given tag slug."""
    markets = []
    try:
        r = await client.get(
            f"{GAMMA_BASE}/events",
            params={"active": "true", "closed": "false", "limit": 100, "tag_slug": tag_slug},
        )
        if r.status_code == 200:
            events = r.json()
            for event in events:
                for m in event.get("markets", []):
                    # Attach event title for richer context
                    m["_event_title"] = event.get("title", "")
                    markets.append(m)
    except Exception:
        pass
    return markets


async def fetch_related_markets(
    headline: str,
    asset_tickers: list[str],
    limit: int = 4,
) -> list[dict]:
    keywords = _build_keywords(headline, asset_tickers)

    # Fetch finance/crypto/economics events in parallel
    all_markets: list[dict] = []
    seen_ids: set = set()
    async with httpx.AsyncClient(timeout=15) as client:
        import asyncio
        results = await asyncio.gather(
            *[_fetch_tag_markets(client, tag) for tag in FINANCE_TAGS],
            return_exceptions=True,
        )
        for batch in results:
            if isinstance(batch, list):
                for m in batch:
                    mid = m.get("id")
                    if mid and mid not in seen_ids:
                        seen_ids.add(mid)
                        all_markets.append(m)

    if not all_markets:
        return []

    scored = []
    for m in all_markets:
        if m.get("closed") or not m.get("active", True):
            continue

        try:
            prices = json.loads(m.get("outcomePrices", "[0.5,0.5]"))
            yes_price = round(float(prices[0]) * 100, 1)
            no_price  = round(float(prices[1]) * 100, 1)
        except Exception:
            continue

        # Skip nearly-resolved markets
        if yes_price <= 3 or yes_price >= 97:
            continue

        question = m.get("question", "")
        # Score against the market question; also include the event title for richer matching
        combined_text = question + " " + m.get("_event_title", "")
        score = _score_market(combined_text, keywords)
        volume_24h = float(m.get("volume24hr") or 0)
        scored.append((score, volume_24h, m, yes_price, no_price))

    # Sort by relevance score first, then 24h volume
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)

    # Take keyword-matched results (score >= 1), fall back to top-volume markets
    matched = [x for x in scored if x[0] >= 1]
    if len(matched) < limit:
        # Pad with highest-volume open markets not already included
        seen = {x[2]["id"] for x in matched}
        for x in scored:
            if x[2]["id"] not in seen:
                matched.append(x)
                seen.add(x[2]["id"])
            if len(matched) >= limit:
                break

    results = []
    for score, volume_24h, m, yes_price, no_price in matched[:limit]:
        results.append({
            "id":           m["id"],
            "question":     m.get("question", ""),
            "yes_price":    yes_price,
            "no_price":     no_price,
            "volume_24h":   round(volume_24h),
            "liquidity":    round(float(m.get("liquidity") or 0)),
            "end_date":     m.get("endDate", ""),
            "image":        m.get("image") or m.get("icon") or "",
            "liquid_url":   LIQUID_PREDICT_URL,
            "polymarket_url": f"https://polymarket.com/event/{m.get('slug', m['id'])}",
        })

    return results

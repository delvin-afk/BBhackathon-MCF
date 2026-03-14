"""
X/Twitter Ingestion Service.

Flow:
  1. Resolve asset → top-N account handles (from x_accounts.py)
  2. Look up Twitter user IDs for those handles (cached)
  3. Fetch recent tweets from each account via X API v2
  4. Score tweets by relevance to the asset
  5. Return top results as NewsItem (same schema as news_ingestion.py)

Requires:
  X_BEARER_TOKEN in .env  (X API v2 — Basic tier or above)

Falls back to mock data when token is missing or USE_MOCK_NEWS=true.
"""

import os
import asyncio
import hashlib
from datetime import datetime, timezone
from typing import Optional

import httpx

from models.schemas import NewsItem
from services.x_accounts import get_accounts_for_asset

X_BEARER_TOKEN = os.environ.get("X_BEARER_TOKEN", "")
USE_MOCK = os.environ.get("USE_MOCK_NEWS", "true").lower() == "true"

X_API_BASE = "https://api.twitter.com/2"

# In-memory handle → user_id cache (avoids repeated lookups)
_user_id_cache: dict[str, str] = {}

TWEET_FIELDS = "created_at,author_id,public_metrics,entities"
USER_FIELDS = "username,name,profile_image_url"
EXPANSIONS = "author_id"

# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------
def _mock_x_feed(asset: str, limit: int) -> list[NewsItem]:
    accounts = get_accounts_for_asset(asset, limit=5)
    mocks = [
        NewsItem(
            id=f"x-mock-{asset}-{i}",
            headline=f"[{handle}] Breaking: {asset} showing strong momentum as institutional flows accelerate into Q2.",
            body=f"Thread 🧵 on why {asset} is at a critical technical level right now. Volume divergence suggests accumulation phase...",
            source=f"@{handle} on X",
            published_at=datetime.now(timezone.utc).isoformat(),
            url=f"https://x.com/{handle}",
            thumbnail=None,
        )
        for i, handle in enumerate(accounts[:limit])
    ]
    return mocks


# ---------------------------------------------------------------------------
# X API v2 helpers
# ---------------------------------------------------------------------------
def _auth_headers() -> dict:
    return {"Authorization": f"Bearer {X_BEARER_TOKEN}"}


async def _get_user_id(client: httpx.AsyncClient, handle: str) -> Optional[str]:
    if handle in _user_id_cache:
        return _user_id_cache[handle]

    r = await client.get(
        f"{X_API_BASE}/users/by/username/{handle}",
        headers=_auth_headers(),
        params={"user.fields": "id"},
    )
    if r.status_code != 200:
        return None

    uid = r.json().get("data", {}).get("id")
    if uid:
        _user_id_cache[handle] = uid
    return uid


async def _fetch_user_tweets(
    client: httpx.AsyncClient,
    user_id: str,
    asset: str,
    max_results: int = 5,
) -> list[dict]:
    """Fetch recent tweets for a single user, filtered by asset keyword."""
    r = await client.get(
        f"{X_API_BASE}/users/{user_id}/tweets",
        headers=_auth_headers(),
        params={
            "max_results": min(max_results * 3, 100),  # over-fetch then filter
            "tweet.fields": TWEET_FIELDS,
            "expansions": EXPANSIONS,
            "user.fields": USER_FIELDS,
            "exclude": "retweets,replies",
        },
    )
    if r.status_code != 200:
        return []

    data = r.json()
    tweets = data.get("data", [])

    # Build author lookup from includes
    users_map = {
        u["id"]: u
        for u in data.get("includes", {}).get("users", [])
    }

    # Filter + score by asset relevance
    keyword = asset.lower()
    scored = []
    for t in tweets:
        text = t.get("text", "").lower()
        if keyword not in text and asset.upper() not in t.get("text", ""):
            continue
        metrics = t.get("public_metrics", {})
        score = (
            metrics.get("like_count", 0) * 1.0
            + metrics.get("retweet_count", 0) * 2.0
            + metrics.get("reply_count", 0) * 0.5
            + metrics.get("quote_count", 0) * 1.5
        )
        author = users_map.get(t.get("author_id", ""), {})
        scored.append((score, t, author))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [(t, author) for _, t, author in scored[:max_results]]


def _tweet_to_news_item(tweet: dict, author: dict, handle: str) -> NewsItem:
    tweet_id = tweet.get("id", "")
    return NewsItem(
        id=f"x-{hashlib.md5(tweet_id.encode()).hexdigest()[:8]}",
        headline=tweet.get("text", "")[:280],
        body=None,
        source=f"@{author.get('username', handle)} on X",
        published_at=tweet.get("created_at", datetime.now(timezone.utc).isoformat()),
        url=f"https://x.com/{author.get('username', handle)}/status/{tweet_id}",
        thumbnail=author.get("profile_image_url"),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def get_x_feed(asset: str, limit: int = 20) -> list[NewsItem]:
    """
    Return up to `limit` relevant tweets from top accounts for `asset`.
    Falls back to mock data if no X_BEARER_TOKEN is set.
    """
    if USE_MOCK or not X_BEARER_TOKEN:
        return _mock_x_feed(asset, limit)

    handles = get_accounts_for_asset(asset, limit=50)
    if not handles:
        return []

    results: list[NewsItem] = []

    async with httpx.AsyncClient(timeout=15) as client:
        # Resolve handles → user IDs in parallel (batched to avoid rate limits)
        batch_size = 10
        for i in range(0, len(handles), batch_size):
            batch = handles[i : i + batch_size]
            user_ids = await asyncio.gather(
                *[_get_user_id(client, h) for h in batch]
            )

            # Fetch tweets for resolved IDs in parallel
            tweets_per_account = max(1, limit // len(handles) + 1)
            tweet_batches = await asyncio.gather(
                *[
                    _fetch_user_tweets(client, uid, asset, tweets_per_account)
                    for uid, handle in zip(user_ids, batch)
                    if uid
                ]
            )

            for (tweet_list, handle) in zip(tweet_batches, batch):
                for tweet, author in tweet_list:
                    results.append(_tweet_to_news_item(tweet, author, handle))

            if len(results) >= limit:
                break

    # Sort all results by engagement-weighted score isn't available post-fetch,
    # so sort by recency as a proxy
    results.sort(key=lambda n: n.published_at, reverse=True)
    return results[:limit]

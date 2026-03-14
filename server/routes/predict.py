from fastapi import APIRouter, Query
from services.polymarket import fetch_related_markets

router = APIRouter(prefix="/predict", tags=["predict"])


@router.get("/related")
async def related_markets(
    headline: str = Query(..., description="News headline to match against"),
    assets: str = Query("", description="Comma-separated tickers, e.g. BTC,ETH"),
    limit: int = Query(4, ge=1, le=8),
):
    """
    Return Polymarket prediction markets related to the given headline and assets.
    """
    tickers = [t.strip() for t in assets.split(",") if t.strip()]
    return await fetch_related_markets(headline, tickers, limit)

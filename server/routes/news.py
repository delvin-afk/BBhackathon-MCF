from fastapi import APIRouter, Query
from services.news_ingestion import get_news_feed
from services.x_ingestion import get_x_feed
from services.x_accounts import all_supported_assets
from models.schemas import NewsItem

router = APIRouter(prefix="/news", tags=["news"])


@router.get("/feed", response_model=list[NewsItem])
async def news_feed(limit: int = Query(default=20, ge=1, le=50)):
    """Return the latest crypto/macro news items."""
    return await get_news_feed(limit=limit)


@router.get("/x-feed", response_model=list[NewsItem])
async def x_feed(
    asset: str = Query(..., description="Asset ticker, e.g. GOLD, BTC, ETH, SOL, OIL"),
    limit: int = Query(default=20, ge=1, le=50),
):
    """
    Return the top tweets about `asset` from curated expert accounts on X.
    Results are normalized to NewsItem and can feed directly into the Butterfly Engine.
    """
    return await get_x_feed(asset=asset.upper(), limit=limit)


@router.get("/x-assets", response_model=list[str])
async def supported_assets():
    """List all assets that have curated X account lists."""
    return all_supported_assets()

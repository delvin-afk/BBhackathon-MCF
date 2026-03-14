from fastapi import APIRouter, HTTPException, Query
from services.liquid_client import get_liquid_client
from models.schemas import TradeRequest, TradeResponse, BalanceResponse

router = APIRouter(prefix="/trade", tags=["trade"])


@router.post("/execute", response_model=TradeResponse)
async def execute_trade(req: TradeRequest):
    """Execute a Market or Limit order via the Liquid Trading SDK."""
    try:
        return await get_liquid_client().execute_trade(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balances", response_model=list[BalanceResponse])
async def get_balances():
    """Fetch USD balance from Liquid account."""
    try:
        return await get_liquid_client().get_balances()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/account")
async def get_account():
    """Full account overview: equity, available balance, margin used."""
    try:
        return await get_liquid_client().get_account()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions")
async def get_positions():
    """All open positions on the Liquid account."""
    try:
        return await get_liquid_client().get_positions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ticker")
async def get_ticker(asset: str = Query(..., description="e.g. BTC, ETH, SOL")):
    """Live mark price and 24h stats for an asset."""
    try:
        return await get_liquid_client().get_ticker(asset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/markets")
async def get_markets():
    """List all tradeable markets on Liquid."""
    try:
        return await get_liquid_client().get_markets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
async def get_open_orders():
    """List all open orders."""
    try:
        return await get_liquid_client().get_open_orders()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

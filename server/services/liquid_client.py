"""
Liquid Trading client — wired to the real liquidtrading-python SDK.

Key SDK facts (from introspection):
  - place_order(symbol, side, type, size, leverage, price, tp, sl)
  - symbol format: "BTC-PERP", "ETH-PERP", "SOL-PERP"
  - size = USD notional
  - SDK is synchronous → wrapped in thread executor for async FastAPI
  - get_balances() returns a Balance dataclass (not a list)
  - get_positions() returns list[Position]
  - get_ticker(symbol) returns Ticker with mark_price
"""
import os
import asyncio
from functools import partial
from models.schemas import TradeRequest, TradeResponse, BalanceResponse, Sentiment

try:
    from liquidtrading import LiquidClient as _LiquidClient
    _SDK_AVAILABLE = True
except ImportError:
    try:
        import liquid as _liq
        _LiquidClient = _liq.LiquidClient
        _SDK_AVAILABLE = True
    except Exception:
        _SDK_AVAILABLE = False

# Asset ticker → Liquid perpetual symbol
SYMBOL_MAP = {
    "BTC":  "BTC-PERP",
    "ETH":  "ETH-PERP",
    "SOL":  "SOL-PERP",
    "XRP":  "XRP-PERP",
    "LINK": "LINK-PERP",
    "GOLD": "XAU-PERP",
}


def _ticker_to_symbol(asset: str) -> str:
    return SYMBOL_MAP.get(asset.upper(), f"{asset.upper()}-PERP")


async def _run(fn, *args, **kwargs):
    """Run a synchronous SDK call in a thread so FastAPI stays non-blocking."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(fn, *args, **kwargs))


class LiquidClient:
    def __init__(self) -> None:
        self.api_key    = os.environ.get("LIQUID_API_KEY", "")
        self.api_secret = os.environ.get("LIQUID_API_SECRET", "")
        self._client    = None

        if _SDK_AVAILABLE and self.api_key and self.api_secret:
            self._client = _LiquidClient(
                api_key=self.api_key,
                api_secret=self.api_secret,
            )

    # ------------------------------------------------------------------ #
    # Orders                                                               #
    # ------------------------------------------------------------------ #
    async def execute_trade(self, req: TradeRequest) -> TradeResponse:
        if self._client is None:
            return self._mock_trade(req)

        symbol = _ticker_to_symbol(req.asset)
        side   = "buy" if req.direction == Sentiment.LONG else "sell"

        # Convert UI size ($USD) → pass as-is (SDK accepts USD notional)
        order = await _run(
            self._client.place_order,
            symbol,
            side,
            req.order_type.lower(),      # "market" | "limit"
            req.quantity,                # USD notional from frontend
            req.leverage or 1,
            req.price,                   # None for market orders
            req.tp_price,                # take-profit (optional)
            req.sl_price,                # stop-loss   (optional)
        )

        return TradeResponse(
            order_id=str(order.id),
            status=order.status,
            asset=req.asset,
            direction=req.direction.value,
            quantity=req.quantity,
            executed_price=getattr(order, "price", None) or getattr(order, "avg_price", None),
            message=f"Order {order.id} submitted to Liquid.",
        )

    # ------------------------------------------------------------------ #
    # Account & Balances                                                   #
    # ------------------------------------------------------------------ #
    async def get_balances(self) -> list[BalanceResponse]:
        if self._client is None:
            return self._mock_balances()

        bal = await _run(self._client.get_balances)
        # Balance dataclass: equity, available_balance, margin_used, cross_margin
        return [
            BalanceResponse(
                currency="USD",
                balance=round(bal.equity, 2),
                available=round(bal.available_balance, 2),
            )
        ]

    async def get_account(self) -> dict:
        if self._client is None:
            return {"equity": 10_000, "available_balance": 8_500, "margin_used": 1_500, "account_value": 10_000}

        acc = await _run(self._client.get_account)
        return {
            "equity":            round(acc.equity, 2),
            "available_balance": round(acc.available_balance, 2),
            "margin_used":       round(acc.margin_used, 2),
            "account_value":     round(acc.account_value, 2),
        }

    # ------------------------------------------------------------------ #
    # Positions                                                            #
    # ------------------------------------------------------------------ #
    async def get_positions(self) -> list[dict]:
        if self._client is None:
            return self._mock_positions()

        positions = await _run(self._client.get_positions)
        return [
            {
                "symbol":            p.symbol,
                "side":              p.side,
                "size":              p.size,
                "entry_price":       p.entry_price,
                "mark_price":        p.mark_price,
                "leverage":          p.leverage,
                "unrealized_pnl":    round(p.unrealized_pnl, 2),
                "liquidation_price": p.liquidation_price,
                "margin_used":       round(p.margin_used, 2),
            }
            for p in positions
        ]

    # ------------------------------------------------------------------ #
    # Live prices                                                          #
    # ------------------------------------------------------------------ #
    async def get_ticker(self, asset: str) -> dict:
        if self._client is None:
            return self._mock_ticker(asset)

        symbol = _ticker_to_symbol(asset)
        try:
            t = await _run(self._client.get_ticker, symbol)
            return {
                "symbol":       symbol,
                "mark_price":   t.mark_price,
                "volume_24h":   t.volume_24h,
                "change_24h":   t.change_24h,
                "funding_rate": t.funding_rate,
            }
        except Exception:
            return self._mock_ticker(asset)

    async def get_markets(self) -> list[dict]:
        if self._client is None:
            return []
        return await _run(self._client.get_markets)

    async def get_open_orders(self) -> list[dict]:
        if self._client is None:
            return []
        orders = await _run(self._client.get_open_orders)
        return [
            {"id": o.id, "symbol": o.symbol, "side": o.side,
             "size": o.size, "price": o.price, "status": o.status}
            for o in orders
        ]

    # ------------------------------------------------------------------ #
    # Mock fallbacks                                                       #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _mock_trade(req: TradeRequest) -> TradeResponse:
        import uuid, random
        prices = {"BTC": 67_420, "ETH": 3_180, "SOL": 142, "GOLD": 3_100}
        p = prices.get(req.asset.upper(), 100) * random.uniform(0.998, 1.002)
        return TradeResponse(
            order_id=str(uuid.uuid4())[:8],
            status="filled",
            asset=req.asset,
            direction=req.direction.value,
            quantity=req.quantity,
            executed_price=round(p, 2),
            message="[MOCK] Trade executed in simulation mode.",
        )

    @staticmethod
    def _mock_balances() -> list[BalanceResponse]:
        return [BalanceResponse(currency="USD", balance=10_000.0, available=8_500.0)]

    @staticmethod
    def _mock_positions() -> list[dict]:
        return [
            {"symbol": "BTC-PERP", "side": "buy", "size": 100, "entry_price": 65_000,
             "mark_price": 67_420, "leverage": 2, "unrealized_pnl": 372.0,
             "liquidation_price": 32_500, "margin_used": 50},
        ]

    @staticmethod
    def _mock_ticker(asset: str) -> dict:
        prices = {"BTC": 67_420, "ETH": 3_180, "SOL": 142, "GOLD": 3_100, "XRP": 0.61}
        p = prices.get(asset.upper(), 100)
        return {"symbol": f"{asset.upper()}-PERP", "mark_price": p,
                "volume_24h": 1_200_000, "change_24h": 1.4, "funding_rate": 0.0001}


# ------------------------------------------------------------------ #
# Singleton                                                            #
# ------------------------------------------------------------------ #
_liquid_client: LiquidClient | None = None

def get_liquid_client() -> LiquidClient:
    global _liquid_client
    if _liquid_client is None:
        _liquid_client = LiquidClient()
    return _liquid_client

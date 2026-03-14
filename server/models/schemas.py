from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Sentiment(str, Enum):
    LONG = "Long"
    SHORT = "Short"
    NEUTRAL = "Neutral"


class OrderType(str, Enum):
    MARKET = "Market"
    LIMIT = "Limit"


class NewsItem(BaseModel):
    id: str
    headline: str
    body: Optional[str] = None
    source: str
    published_at: str
    url: Optional[str] = None
    thumbnail: Optional[str] = None


class AssetHorizon(BaseModel):
    recommendation: str              # "BUY" | "SELL" | "HOLD" | "WATCH"
    expected_move_pct: str           # e.g. "+3 to +6" or "-5 to -10"
    confidence: float = Field(ge=0.0, le=1.0)
    thesis: str                      # one sentence rationale


class ButterflyAsset(BaseModel):
    ticker: str
    name: str
    asset_type: str                  # "crypto" | "stock" | "commodity" | "forex" | "index"
    impact_reason: str               # why this asset is specifically affected
    short_term: AssetHorizon
    mid_term: AssetHorizon
    long_term: AssetHorizon


class ButterflyAnalysis(BaseModel):
    news_id: str
    primary_sentiment: Sentiment
    already_priced_in: bool
    summary: str
    causal_chain: str
    key_risk: str
    affected_assets: list[ButterflyAsset]


class TradeRequest(BaseModel):
    asset: str                               # e.g. "BTC", "ETH"
    direction: Sentiment
    order_type: OrderType = OrderType.MARKET
    quantity: float = Field(gt=10.0)         # USD notional size (Liquid minimum > $10)
    price: Optional[float] = None           # required for Limit orders
    leverage: Optional[int] = Field(default=1, ge=1, le=200)
    tp_price: Optional[float] = None        # take-profit trigger price
    sl_price: Optional[float] = None        # stop-loss trigger price


class TradeResponse(BaseModel):
    order_id: str
    status: str
    asset: str
    direction: str
    quantity: float
    executed_price: Optional[float] = None
    message: str


class BalanceResponse(BaseModel):
    currency: str
    balance: float
    available: float

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


class TimeHorizonAnalysis(BaseModel):
    direction: Sentiment
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str


class ButterflyAnalysis(BaseModel):
    news_id: str
    affected_assets: list[str]
    primary_sentiment: Sentiment
    already_priced_in: bool
    short_horizon: TimeHorizonAnalysis
    mid_horizon: TimeHorizonAnalysis
    long_horizon: TimeHorizonAnalysis
    causal_explanation: str = Field(max_length=600)


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

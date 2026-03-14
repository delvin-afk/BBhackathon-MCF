"""
Butterfly Engine — sends news to Claude 3.5 Sonnet and returns
structured multi-horizon market analysis.
"""
import json
import os
import anthropic
from models.schemas import ButterflyAnalysis, Sentiment, TimeHorizonAnalysis

_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


SYSTEM_PROMPT = """You are NewsFi's Butterfly Engine — a crypto market analyst.
Given a news headline and optional body text, return ONLY valid JSON (no markdown fences) with this exact schema:

{
  "affected_assets": ["BTC", "ETH"],          // 1-5 ticker symbols
  "primary_sentiment": "Long" | "Short" | "Neutral",
  "already_priced_in": true | false,           // is this old news the market has digested?
  "short_horizon": {
    "direction": "Long" | "Short" | "Neutral",
    "confidence": 0.0-1.0,
    "rationale": "one sentence"
  },
  "mid_horizon": {
    "direction": "Long" | "Short" | "Neutral",
    "confidence": 0.0-1.0,
    "rationale": "one sentence"
  },
  "long_horizon": {
    "direction": "Long" | "Short" | "Neutral",
    "confidence": 0.0-1.0,
    "rationale": "one sentence"
  },
  "causal_explanation": "Max 3 sentences explaining the cause-effect chain."
}

Rules:
- Only list assets genuinely affected by this specific news.
- Confidence scores must reflect true uncertainty — avoid extremes unless news is unambiguous.
- already_priced_in = true when the event is well-telegraphed or happened >24h ago.
- Never recommend leverage. Never give financial advice. Stick to analysis.
"""


async def analyze_news(news_id: str, headline: str, body: str = "") -> ButterflyAnalysis:
    user_content = f"Headline: {headline}"
    if body:
        user_content += f"\n\nBody (excerpt): {body[:800]}"

    message = await get_client().messages.create(
        model=os.environ.get("CLAUDE_MODEL", "claude-3-5-sonnet-20241022"),
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = message.content[0].text.strip()
    data = json.loads(raw)

    def parse_horizon(h: dict) -> TimeHorizonAnalysis:
        return TimeHorizonAnalysis(
            direction=Sentiment(h["direction"]),
            confidence=float(h["confidence"]),
            rationale=h["rationale"],
        )

    return ButterflyAnalysis(
        news_id=news_id,
        affected_assets=data["affected_assets"],
        primary_sentiment=Sentiment(data["primary_sentiment"]),
        already_priced_in=data["already_priced_in"],
        short_horizon=parse_horizon(data["short_horizon"]),
        mid_horizon=parse_horizon(data["mid_horizon"]),
        long_horizon=parse_horizon(data["long_horizon"]),
        causal_explanation=data["causal_explanation"],
    )

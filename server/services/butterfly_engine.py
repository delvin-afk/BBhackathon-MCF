"""
Butterfly Engine — sends news to Claude and returns per-asset,
per-horizon trading recommendations with expected price moves.
"""
import json
import os
import anthropic
from models.schemas import ButterflyAnalysis, ButterflyAsset, AssetHorizon, Sentiment

_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


SYSTEM_PROMPT = """You are NewsFi's Butterfly Engine — a professional macro and crypto market analyst.

Given a news headline and optional body, identify EVERY asset (crypto, stock, commodity, forex) that is meaningfully impacted and output ONLY valid JSON — no markdown, no explanation, just JSON.

Schema:
{
  "primary_sentiment": "Long" | "Short" | "Neutral",
  "already_priced_in": true | false,
  "summary": "2-3 sentences: what happened, who is affected, and the key market implication.",
  "causal_chain": "Step-by-step: Event → mechanism → market effect. Max 3 sentences.",
  "key_risk": "One sentence: the main risk that could invalidate this thesis.",
  "affected_assets": [
    {
      "ticker": "BTC",
      "name": "Bitcoin",
      "asset_type": "crypto",
      "impact_reason": "One sentence: why THIS asset specifically is affected by this news.",
      "short_term": {
        "recommendation": "BUY" | "SELL" | "HOLD" | "WATCH",
        "expected_move_pct": "+3 to +6",
        "confidence": 0.72,
        "thesis": "One sentence rationale for this timeframe (0-72 hours)."
      },
      "mid_term": {
        "recommendation": "BUY" | "SELL" | "HOLD" | "WATCH",
        "expected_move_pct": "+8 to +15",
        "confidence": 0.58,
        "thesis": "One sentence rationale for this timeframe (1-4 weeks)."
      },
      "long_term": {
        "recommendation": "BUY" | "SELL" | "HOLD" | "WATCH",
        "expected_move_pct": "+20 to +50",
        "confidence": 0.44,
        "thesis": "One sentence rationale for this timeframe (1-6 months)."
      }
    }
  ]
}

Rules:
- Include 2-5 assets. Only include assets GENUINELY impacted — not every asset in the market.
- asset_type must be one of: "crypto", "stock", "commodity", "forex", "index"
- For crypto news: lead with the directly affected crypto, then correlated ones (e.g. BTC news → BTC, then ETH if correlated).
- For macro news (rates, inflation, war): include both crypto (BTC as safe haven or risk-off) AND relevant stocks/commodities.
- expected_move_pct: use realistic ranges like "+2 to +5", "-3 to -8", "0 to +3". Negative for SELL.
- Confidence: short < mid < long is NOT required — be honest. If short-term is clearer, give it higher confidence.
- already_priced_in = true only when the event is well-known or happened >24h ago.
- Do NOT include generic assets (e.g. do not include SOL just because it's crypto — only if this news actually affects Solana).
"""


async def analyze_news(news_id: str, headline: str, body: str = "") -> ButterflyAnalysis:
    user_content = f"Headline: {headline}"
    if body:
        user_content += f"\n\nBody: {body[:1000]}"

    message = await get_client().messages.create(
        model=os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6"),
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = message.content[0].text.strip()
    # Strip markdown fences if Claude adds them despite instructions
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    data = json.loads(raw.strip())

    def parse_horizon(h: dict) -> AssetHorizon:
        return AssetHorizon(
            recommendation=h["recommendation"],
            expected_move_pct=h.get("expected_move_pct", ""),
            confidence=float(h["confidence"]),
            thesis=h["thesis"],
        )

    assets = []
    for a in data.get("affected_assets", []):
        assets.append(ButterflyAsset(
            ticker=a["ticker"].upper(),
            name=a["name"],
            asset_type=a.get("asset_type", "crypto"),
            impact_reason=a.get("impact_reason", ""),
            short_term=parse_horizon(a["short_term"]),
            mid_term=parse_horizon(a["mid_term"]),
            long_term=parse_horizon(a["long_term"]),
        ))

    return ButterflyAnalysis(
        news_id=news_id,
        primary_sentiment=Sentiment(data["primary_sentiment"]),
        already_priced_in=data.get("already_priced_in", False),
        summary=data.get("summary", ""),
        causal_chain=data.get("causal_chain", ""),
        key_risk=data.get("key_risk", ""),
        affected_assets=assets,
    )

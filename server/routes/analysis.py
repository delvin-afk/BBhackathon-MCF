from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.butterfly_engine import analyze_news
from models.schemas import ButterflyAnalysis

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalyzeRequest(BaseModel):
    news_id: str
    headline: str
    body: str = ""


@router.post("/butterfly", response_model=ButterflyAnalysis)
async def butterfly_analysis(req: AnalyzeRequest):
    """
    Send a news item to the Butterfly Engine (Claude 3.5 Sonnet)
    and receive structured multi-horizon market analysis.
    """
    try:
        return await analyze_news(
            news_id=req.news_id,
            headline=req.headline,
            body=req.body,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""
NewsFi Backend — FastAPI entry point
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.news import router as news_router
from routes.analysis import router as analysis_router
from routes.trade import router as trade_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("NewsFi backend starting...")
    yield
    print("NewsFi backend shutting down.")


app = FastAPI(
    title="NewsFi API",
    description="News-Driven Crypto Discovery & Trading — powered by Claude 3.5 Sonnet + Liquid",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow Vite dev server + production origins
origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(news_router)
app.include_router(analysis_router)
app.include_router(trade_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "NewsFi"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", 8000)),
        reload=True,
    )

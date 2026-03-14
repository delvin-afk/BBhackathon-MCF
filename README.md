# NewsFi — News-Driven Crypto Discovery & Trading

> From breaking news to executed trade in under 30 seconds.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, FastAPI, Uvicorn |
| AI Engine | Claude 3.5 Sonnet (Anthropic) |
| Trading | Liquid Trading SDK (`liquidtrading-python`) |
| Frontend | React 18, Vite, Framer Motion |
| State | Zustand |

## Project Structure

```
BBhackathon-MCF/
├── server/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   ├── services/
│   │   ├── butterfly_engine.py  # Claude 3.5 Sonnet integration
│   │   ├── liquid_client.py     # Liquid Trading SDK wrapper
│   │   └── news_ingestion.py    # News feed (mock + real NewsAPI)
│   └── routes/
│       ├── news.py              # GET /news/feed
│       ├── analysis.py          # POST /analysis/butterfly
│       └── trade.py             # POST /trade/execute, GET /trade/balances
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── NewsFeed.jsx     # TikTok-style vertical scroll feed
│       │   ├── NewsCard.jsx     # Swipeable news card
│       │   ├── ButterflyPanel.jsx # AI multi-horizon analysis panel
│       │   ├── TradeBar.jsx     # One-tap trade bar (with confirm step)
│       │   └── Disclaimer.jsx   # Educational disclaimer
│       ├── hooks/
│       │   └── useNewsStore.js  # Zustand store
│       └── services/
│           └── api.js           # Axios API client
├── .env.example
├── Makefile
└── README.md
```

## Quick Start

```bash
# 1. Clone & configure
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, LIQUID_API_KEY, LIQUID_API_SECRET

# 2. Install everything
make setup

# 3. Run backend (terminal 1)
make backend

# 4. Run frontend (terminal 2)
make frontend
```

Open http://localhost:5173

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/news/feed?limit=20` | Latest crypto news |
| POST | `/analysis/butterfly` | Butterfly Engine (Claude) |
| POST | `/trade/execute` | Execute Market/Limit order |
| GET | `/trade/balances` | Account balances |
| GET | `/health` | Health check |

## The 30-Second Demo Loop

1. Scroll the news feed (vertical swipe / arrow keys on desktop)
2. Swipe right on any card → Butterfly Panel opens
3. Claude 3.5 Sonnet returns multi-horizon analysis in ~2s
4. Tap the pre-filled trade button → review confirm step → execute

## Disclaimer

> **Educational purposes only.** This application is not financial advice.
> Crypto trading involves significant risk of loss.
> Never trade more than you can afford to lose.

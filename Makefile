.PHONY: setup backend frontend dev

setup:
	@echo "── Backend setup ──────────────────────────────"
	cd server && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
	@echo "── Frontend setup ─────────────────────────────"
	cd client && npm install
	@echo "── Copying .env ───────────────────────────────"
	@test -f .env || cp .env.example .env && echo "Created .env from .env.example — fill in your keys!"

backend:
	cd server && .venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd client && npm run dev

# Run both in parallel (requires two terminals or use tmux)
dev:
	@echo "Start backend:  make backend"
	@echo "Start frontend: make frontend"

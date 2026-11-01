#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}=== Starting VANIK Complete Stack ===${NC}\n"

# 1. Start Infrastructure (PostgreSQL & Redis)
echo -e "${BOLD}1. Checking infrastructure (PostgreSQL & Redis)...${NC}"
if command -v docker &>/dev/null && docker info &>/dev/null; then
    docker compose up -d postgres redis
elif command -v podman &>/dev/null; then
    if ! podman ps --format '{{.Names}}' | grep -q 'vanik-postgres'; then
        echo "Starting vanik-postgres container..."
        podman start vanik-postgres 2>/dev/null || podman run -d --name vanik-postgres -e POSTGRES_DB=vanik -e POSTGRES_USER=vanik -e POSTGRES_PASSWORD=vanik -p 5432:5432 docker.io/library/postgres:16
    fi
    if ! podman ps --format '{{.Names}}' | grep -q 'vanik-redis'; then
        echo "Starting vanik-redis container..."
        podman start vanik-redis 2>/dev/null || podman run -d --name vanik-redis -p 6379:6379 docker.io/library/redis:7-alpine
    fi
else
    echo -e "${YELLOW}Neither docker nor podman found. Ensure local PostgreSQL (port 5432) is running.${NC}"
fi

# Wait for PostgreSQL readiness
echo -n "Waiting for PostgreSQL to accept connections..."
for i in {1..30}; do
    if command -v pg_isready &>/dev/null && pg_isready -h localhost -p 5432 -U vanik -t 1 &>/dev/null; then
        echo -e " ${GREEN}ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# 2. Database Migrations
echo -e "\n${BOLD}2. Applying database migrations...${NC}"
uv --directory apps/api run --locked alembic upgrade head

# 3. Database Seed
echo -e "\n${BOLD}3. Seeding synthetic demo data...${NC}"
uv --directory apps/api run --locked python -m app.seed

# 4. Launch Application Services
echo -e "\n${BOLD}4. Launching application services...${NC}"

PIDS=()

cleanup() {
    echo -e "\n${YELLOW}Shutting down VANIK services...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    wait 2>/dev/null || true
    echo -e "${GREEN}All services stopped cleanly.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start API
if lsof -i :8000 &>/dev/null || curl -s http://127.0.0.1:8000/health &>/dev/null; then
    echo -e "• FastAPI Backend: ${GREEN}Already running on http://127.0.0.1:8000${NC}"
else
    echo -e "• Starting FastAPI Backend on http://127.0.0.1:8000..."
    uv --directory apps/api run --locked uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000 &
    PIDS+=($!)
fi

# Start Web Portal
if lsof -i :3000 &>/dev/null || curl -s http://localhost:3000 &>/dev/null; then
    echo -e "• Next.js Web: ${GREEN}Already running on http://localhost:3000${NC}"
else
    echo -e "• Starting Next.js Web Portal on http://localhost:3000..."
    npm --prefix apps/web run dev &
    PIDS+=($!)
fi

# Start Telegram Bot
if pgrep -f "python.*bot\.main" &>/dev/null; then
    echo -e "• Telegram Bot: ${GREEN}Already running (polling mode)${NC}"
else
    echo -e "• Starting Telegram Bot worker..."
    uv --directory apps/telegram-bot run python -m bot.main &
    PIDS+=($!)
fi

echo -e "\n${BOLD}${GREEN}==============================================${NC}"
echo -e "${BOLD}${GREEN}   VANIK IS LIVE & FULLY OPERATIONAL! 🎉      ${NC}"
echo -e "${BOLD}${GREEN}==============================================${NC}"
echo -e "• Web Dashboard:     ${BLUE}http://localhost:3000${NC}"
echo -e "• Telegram Mini App: ${BLUE}http://localhost:3000/miniapp${NC}"
echo -e "• Backend API Docs:  ${BLUE}http://127.0.0.1:8000/docs${NC}"
echo -e "• Live Telegram Bot: ${BLUE}@vanik33_bot${NC}"
echo -e "\nPress [Ctrl+C] to stop all active services."

# Wait for children if any were spawned in this process
if [ ${#PIDS[@]} -gt 0 ]; then
    wait "${PIDS[@]}"
else
    # All services are already running in background
    ./scripts/health.sh
fi

#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}=== VANIK System Health Check ===${NC}\n"

ALL_OK=true

# 1. PostgreSQL Check
echo -n "• PostgreSQL (port 5432): "
if command -v pg_isready &>/dev/null && pg_isready -h localhost -p 5432 -U vanik -t 2 &>/dev/null; then
    echo -e "${GREEN}✓ Accepting connections${NC}"
else
    echo -e "${RED}✗ Disconnected / unreachable${NC}"
    ALL_OK=false
fi

# 2. Redis Check
echo -n "• Redis (port 6379): "
if python3 -c "import socket; s = socket.socket(); s.settimeout(1.5); s.connect(('localhost', 6379)); s.close()" 2>/dev/null; then
    echo -e "${GREEN}✓ Accepting connections${NC}"
else
    echo -e "${YELLOW}⚠ Not responding on port 6379 (optional cache)${NC}"
fi

# 3. FastAPI Backend
echo -n "• FastAPI Backend (http://127.0.0.1:8000/health): "
HEALTH_RESP=$(curl -s --max-time 2 http://127.0.0.1:8000/health 2>/dev/null || true)
if [[ -n "$HEALTH_RESP" && "$HEALTH_RESP" =~ \"status\":\"ok\" ]]; then
    VERSION=$(echo "$HEALTH_RESP" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "0.6.0")
    echo -e "${GREEN}✓ Online (v${VERSION})${NC}"
else
    echo -e "${RED}✗ Offline / unreachable${NC}"
    ALL_OK=false
fi

# 4. Backend Database Readiness
echo -n "• Backend DB Readiness (http://127.0.0.1:8000/health/ready): "
READY_RESP=$(curl -s --max-time 2 http://127.0.0.1:8000/health/ready 2>/dev/null || true)
if [[ -n "$READY_RESP" && "$READY_RESP" =~ \"database\":\"ok\" ]]; then
    echo -e "${GREEN}✓ Ready (database connected)${NC}"
else
    echo -e "${RED}✗ Disconnected ($READY_RESP)${NC}"
    ALL_OK=false
fi

# 5. Next.js Web App
echo -n "• Next.js Web Portal (http://localhost:3000): "
WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:3000 2>/dev/null || true)
if [[ "$WEB_CODE" == "200" ]]; then
    echo -e "${GREEN}✓ Online (HTTP 200 OK)${NC}"
else
    echo -e "${RED}✗ Offline (HTTP ${WEB_CODE:-down})${NC}"
    ALL_OK=false
fi

# 6. Telegram Bot
echo -n "• Telegram Bot Worker: "
BOT_PID=$(pgrep -f "python.*bot\.main" | head -n 1 || true)
if [[ -n "$BOT_PID" ]]; then
    echo -e "${GREEN}✓ Running (PID ${BOT_PID})${NC}"
else
    echo -e "${YELLOW}⚠ Worker process not detected${NC}"
fi

# 7. Telegram Bot Token API verification
if [[ -f "$ROOT_DIR/.env" ]]; then
    TOKEN=$(grep -E '^TELEGRAM_BOT_TOKEN=' "$ROOT_DIR/.env" | cut -d'=' -f2- | tr -d ' "')
    if [[ -n "$TOKEN" ]]; then
        TG_ME=$(curl -s --max-time 3 "https://api.telegram.org/bot${TOKEN}/getMe" 2>/dev/null || true)
        if [[ "$TG_ME" =~ \"ok\":true ]]; then
            BOT_USER=$(echo "$TG_ME" | grep -o '"username":"[^"]*"' | cut -d'"' -f4 || echo "bot")
            echo -e "  └─ Telegram Cloud API: ${GREEN}✓ Verified (@${BOT_USER})${NC}"
        else
            echo -e "  └─ Telegram Cloud API: ${YELLOW}⚠ Token invalid or network restricted${NC}"
        fi
    fi
fi

echo ""
if [ "$ALL_OK" = true ]; then
    echo -e "${BOLD}${GREEN}All core systems are operational and healthy! 🎉${NC}"
    exit 0
else
    echo -e "${BOLD}${RED}Some services are offline. Run 'make run' to start everything.${NC}"
    exit 1
fi

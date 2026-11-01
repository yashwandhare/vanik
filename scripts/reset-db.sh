#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}=== VANIK Database & State Reset ===${NC}\n"

# 1. Drop & Recreate PostgreSQL Database
echo -e "${BOLD}1. Dropping and recreating PostgreSQL database 'vanik'...${NC}"

if command -v podman &>/dev/null && podman ps --format '{{.Names}}' | grep -q 'vanik-postgres'; then
    podman exec vanik-postgres psql -U vanik -d postgres -c "DROP DATABASE IF EXISTS vanik WITH (FORCE);" -c "CREATE DATABASE vanik;"
elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q 'vanik-postgres'; then
    docker exec vanik-postgres psql -U vanik -d postgres -c "DROP DATABASE IF EXISTS vanik WITH (FORCE);" -c "CREATE DATABASE vanik;"
elif command -v psql &>/dev/null; then
    PGPASSWORD="${POSTGRES_PASSWORD:-vanik}" psql -h localhost -p 5432 -U "${POSTGRES_USER:-vanik}" -d postgres -c "DROP DATABASE IF EXISTS vanik WITH (FORCE);" -c "CREATE DATABASE vanik;"
else
    echo -e "${YELLOW}Warning: Neither container runtime nor psql found. Attempting Python engine reset...${NC}"
    uv --directory apps/api run python -c "
from sqlalchemy import create_engine, text
engine = create_engine('postgresql+psycopg://vanik:vanik@localhost:5432/postgres', isolation_level='AUTOCOMMIT')
with engine.connect() as conn:
    conn.execute(text('DROP DATABASE IF EXISTS vanik WITH (FORCE)'))
    conn.execute(text('CREATE DATABASE vanik'))
"
fi
echo -e "✓ Database 'vanik' recreated cleanly.\n"

# 2. Run Alembic Migrations
echo -e "${BOLD}2. Applying database migrations (alembic upgrade head)...${NC}"
uv --directory apps/api run --locked alembic upgrade head
echo -e "✓ Schema migrations applied.\n"

# 3. Seed Fresh Synthetic Data
echo -e "${BOLD}3. Seeding fresh synthetic demo data...${NC}"
uv --directory apps/api run --locked python -m app.seed
echo -e "✓ 40 SKUs, 4 seller principals/agents, and Shree Ganesh Kirana buyer agent seeded.\n"

# 4. Flush Redis Cache
echo -e "${BOLD}4. Flushing Redis cache & sessions...${NC}"
if command -v podman &>/dev/null && podman ps --format '{{.Names}}' | grep -q 'vanik-redis'; then
    podman exec vanik-redis redis-cli FLUSHALL >/dev/null 2>&1 || true
elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q 'vanik-redis'; then
    docker exec vanik-redis redis-cli FLUSHALL >/dev/null 2>&1 || true
elif command -v redis-cli &>/dev/null; then
    redis-cli FLUSHALL >/dev/null 2>&1 || true
fi
echo -e "✓ Redis cache flushed.\n"

echo -e "${BOLD}${GREEN}🎉 VANIK Database successfully reset and ready for a fresh presentation!${NC}"
echo -e "• To reset the Telegram chat session: Send ${BOLD}/disconnect${NC} or ${BOLD}/reset${NC} in Telegram"
echo -e "• To onboard persona: Send ${BOLD}/ganesh_kirana${NC}"
echo -e "• To spawn agent: Send ${BOLD}/ganesh_agent${NC}"
echo -e "• To launch negotiations: Send ${BOLD}/task${NC}\n"

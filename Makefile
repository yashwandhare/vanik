.PHONY: help infra down install dev test lint format migrate seed demo reset-demo

help:
	@echo "VANIK developer targets"
	@echo "infra       Start PostgreSQL and Redis"
	@echo "down        Stop local infrastructure"
	@echo "install     Install application dependencies (implement per app)"
	@echo "dev         Run API, web and Telegram bot (implement per app)"
	@echo "test        Run test suites (implement per app)"
	@echo "lint        Run linters (implement per app)"
	@echo "format      Format source (implement per app)"
	@echo "migrate     Apply database migrations (requires API implementation)"
	@echo "seed        Load synthetic demo data (requires seed script)"
	@echo "demo        Run canonical demo (requires implementation)"
	@echo "reset-demo  Reset and reseed demo (requires implementation)"

infra:
	docker compose up -d postgres redis

down:
	docker compose down

install:
	@echo "TODO: install apps/api, apps/web and apps/telegram-bot dependencies"

dev:
	@echo "TODO: start API, web and Telegram bot after implementation"

test:
	@echo "TODO: run test suites after implementation"

lint:
	@echo "TODO: run linters after implementation"

format:
	@echo "TODO: run formatters after implementation"

migrate:
	@echo "TODO: alembic upgrade head after API implementation"

seed:
	@echo "TODO: python -m app.seed after API implementation"

demo:
	@echo "TODO: launch canonical demo after implementation"

reset-demo:
	@echo "TODO: reset demo database and reseed after implementation"

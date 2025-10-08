.PHONY: help docker-start docker-stop docker-dev docker-logs docker-ps docker-clean docker-rebuild dev-start dev-stop local-dev test

# Default target
help:
	@echo "Query Builder - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Docker Commands (Recommended):"
	@echo "  make docker-start     - Start application in production mode (port 80)"
	@echo "  make docker-dev       - Start application in development mode (port 5173)"
	@echo "  make docker-stop      - Stop all Docker services"
	@echo "  make docker-logs      - View logs from all services"
	@echo "  make docker-ps        - Show status of all containers"
	@echo "  make docker-rebuild   - Rebuild and restart all services"
	@echo "  make docker-clean     - Stop and remove all containers, volumes, and images"
	@echo ""
	@echo "Local Development Commands:"
	@echo "  make local-dev        - Start backend and frontend locally (requires Node.js)"
	@echo "  make dev-start        - Start infrastructure only (MySQL databases)"
	@echo "  make dev-stop         - Stop infrastructure"
	@echo "  make test             - Run all tests"
	@echo ""
	@echo "Quick Start: make docker-start"
	@echo ""

# Docker production mode
docker-start:
	@echo "🚀 Starting in production mode..."
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env file..."; \
		cp .env.docker .env; \
		echo "⚠️  Please edit .env and add your API keys!"; \
		exit 1; \
	fi
	docker-compose up -d --build
	@echo "✅ Application started!"
	@echo "   Frontend: http://localhost"
	@echo "   Backend: http://localhost:3001"

# Docker development mode
docker-dev:
	@echo "🚀 Starting in development mode..."
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env file..."; \
		cp .env.docker .env; \
		echo "⚠️  Please edit .env and add your API keys!"; \
		exit 1; \
	fi
	docker-compose -f docker-compose.dev.yml up -d --build
	@echo "✅ Application started!"
	@echo "   Frontend: http://localhost:5173"
	@echo "   Backend: http://localhost:3001"

# Stop Docker services
docker-stop:
	@echo "🛑 Stopping Docker services..."
	@if docker ps | grep -q "query-builder-frontend-dev"; then \
		docker-compose -f docker-compose.dev.yml down; \
	else \
		docker-compose down; \
	fi
	@echo "✅ Services stopped"

# View Docker logs
docker-logs:
	@if docker ps | grep -q "query-builder-frontend-dev"; then \
		docker-compose -f docker-compose.dev.yml logs -f; \
	else \
		docker-compose logs -f; \
	fi

# Show container status
docker-ps:
	@docker-compose ps

# Rebuild Docker images
docker-rebuild:
	@echo "🔨 Rebuilding Docker images..."
	@if docker ps | grep -q "query-builder-frontend-dev"; then \
		docker-compose -f docker-compose.dev.yml up -d --build --force-recreate; \
	else \
		docker-compose up -d --build --force-recreate; \
	fi
	@echo "✅ Services rebuilt and restarted"

# Clean up Docker (remove volumes)
docker-clean:
	@echo "⚠️  This will remove all containers, volumes, and images!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v --rmi all; \
		docker-compose -f docker-compose.dev.yml down -v --rmi all 2>/dev/null || true; \
		echo "✅ Cleanup complete"; \
	fi

# Start infrastructure only (for local development)
dev-start:
	@echo "🚀 Starting infrastructure (MySQL databases)..."
	docker-compose -f docker-compose.infra.yml up -d
	@echo "✅ Infrastructure started"
	@echo "   MySQL (query_builder): localhost:3306"
	@echo "   MySQL (sakila): localhost:3310"

# Stop infrastructure
dev-stop:
	@echo "🛑 Stopping infrastructure..."
	docker-compose -f docker-compose.infra.yml down
	@echo "✅ Infrastructure stopped"

# Local development (requires Node.js)
local-dev:
	@echo "🚀 Starting local development..."
	@if [ ! -f packages/backend/.env ]; then \
		echo "📝 Creating backend .env file..."; \
		cp packages/backend/.env.example packages/backend/.env; \
		echo "⚠️  Please edit packages/backend/.env and configure your settings!"; \
		exit 1; \
	fi
	@echo "Starting infrastructure first..."
	@make dev-start
	@echo ""
	@echo "Starting application..."
	@npm run dev

# Run tests
test:
	@echo "🧪 Running tests..."
	npm run test
	@echo "✅ Tests complete"

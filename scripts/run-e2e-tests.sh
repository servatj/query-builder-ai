#!/bin/bash
# Run E2E tests for the backend

set -e

echo "🧪 Query Builder Backend E2E Tests"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL=${API_BASE_URL:-http://localhost:3001}
BACKEND_DIR="packages/backend"

# Function to check if backend is running
check_backend() {
    echo "📡 Checking if backend is running at $API_URL..."
    if curl -s "$API_URL/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Backend is not accessible at $API_URL${NC}"
        return 1
    fi
}

# Function to check if databases are running
check_databases() {
    echo "🗄️  Checking database connections..."
    
    # Check main MySQL
    if nc -z localhost 3306 2>/dev/null || ~/.orbstack/bin/docker ps | grep -q "query-builder-mysql"; then
        echo -e "${GREEN}✅ Main MySQL (port 3306) is accessible${NC}"
    else
        echo -e "${RED}❌ Main MySQL (port 3306) is not accessible${NC}"
        return 1
    fi
    
    # Check Sakila MySQL
    if nc -z localhost 3310 2>/dev/null || ~/.orbstack/bin/docker ps | grep -q "sakila"; then
        echo -e "${GREEN}✅ Sakila MySQL (port 3310) is accessible${NC}"
    else
        echo -e "${RED}❌ Sakila MySQL (port 3310) is not accessible${NC}"
        return 1
    fi
    
    return 0
}

# Function to start infrastructure if needed
start_infrastructure() {
    echo ""
    echo "🚀 Do you want to start the database infrastructure? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "Starting databases for macOS..."
            docker-compose -f docker-compose.infra.mac.yml up -d
        else
            echo "Starting databases for Linux..."
            docker-compose -f docker-compose.infra.linux.yml up -d
        fi
        
        echo "⏳ Waiting for databases to be ready (30 seconds)..."
        sleep 30
        
        check_databases
    else
        echo -e "${RED}❌ Cannot run E2E tests without databases${NC}"
        exit 1
    fi
}

# Function to start backend if needed
start_backend() {
    echo ""
    echo "🚀 Do you want to start the backend? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Starting backend in background..."
        cd "$BACKEND_DIR"
        npm run dev > /tmp/backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > /tmp/backend.pid
        cd - > /dev/null
        
        echo "⏳ Waiting for backend to start (10 seconds)..."
        sleep 10
        
        if check_backend; then
            echo -e "${GREEN}✅ Backend started successfully (PID: $BACKEND_PID)${NC}"
        else
            echo -e "${RED}❌ Failed to start backend${NC}"
            cat /tmp/backend.log
            exit 1
        fi
    else
        echo -e "${RED}❌ Cannot run E2E tests without backend${NC}"
        exit 1
    fi
}

# Main execution
echo "Checking prerequisites..."
echo ""

# Check databases
if ! check_databases; then
    start_infrastructure
fi

echo ""

# Check backend
if ! check_backend; then
    start_backend
fi

echo ""
echo "===================================="
echo "🏃 Running E2E Tests"
echo "===================================="
echo ""

cd "$BACKEND_DIR"

# Run tests based on argument
case "${1:-all}" in
    "api")
        echo "Running API E2E tests..."
        npm run test:e2e -- api.e2e.test.ts
        ;;
    "database")
        echo "Running Database E2E tests..."
        npm run test:e2e -- database.e2e.test.ts
        ;;
    "ai")
        echo "Running AI E2E tests..."
        npm run test:e2e -- ai.e2e.test.ts
        ;;
    "security")
        echo "Running Security E2E tests..."
        npm run test:e2e -- security.e2e.test.ts
        ;;
    "coverage")
        echo "Running E2E tests with coverage..."
        npm run test:e2e:coverage
        ;;
    "watch")
        echo "Running E2E tests in watch mode..."
        npm run test:e2e:watch
        ;;
    "all")
        echo "Running all E2E tests..."
        npm run test:e2e
        ;;
    *)
        echo "Unknown test suite: $1"
        echo "Available options: api, database, ai, security, coverage, watch, all"
        exit 1
        ;;
esac

TEST_EXIT_CODE=$?

# Cleanup if we started the backend
if [ -f /tmp/backend.pid ]; then
    echo ""
    echo "🧹 Cleaning up backend process..."
    BACKEND_PID=$(cat /tmp/backend.pid)
    kill $BACKEND_PID 2>/dev/null || true
    rm /tmp/backend.pid
fi

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ E2E Tests Passed!${NC}"
else
    echo -e "${RED}❌ E2E Tests Failed!${NC}"
fi

exit $TEST_EXIT_CODE

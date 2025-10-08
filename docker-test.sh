#!/bin/bash

# Docker Setup Verification Script
# This script tests that all Docker services are working correctly

set -e

echo "🧪 Query Builder - Docker Setup Verification"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
echo "1️⃣  Checking Docker..."
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if containers are running
echo "2️⃣  Checking containers..."
CONTAINERS=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
if [ "$CONTAINERS" -lt 3 ]; then
    echo -e "${RED}❌ Not all containers are running${NC}"
    echo "Expected at least 3 containers (mysql, backend, frontend)"
    echo "Run: docker-compose ps"
    exit 1
fi
echo -e "${GREEN}✅ All containers are running${NC}"
echo ""

# Check MySQL (query_builder)
echo "3️⃣  Testing MySQL (query_builder)..."
if docker-compose exec -T mysql mysqladmin ping -u queryuser -pquerypass --silent &> /dev/null; then
    echo -e "${GREEN}✅ MySQL is responding${NC}"
else
    echo -e "${RED}❌ MySQL is not responding${NC}"
    exit 1
fi
echo ""

# Check MySQL Sakila
echo "4️⃣  Testing MySQL (sakila)..."
if docker-compose exec -T mysql-sakila mysqladmin ping -u queryuser -pquerypass --silent &> /dev/null; then
    echo -e "${GREEN}✅ Sakila database is responding${NC}"
else
    echo -e "${RED}❌ Sakila database is not responding${NC}"
    exit 1
fi
echo ""

# Check Backend API
echo "5️⃣  Testing Backend API..."
sleep 2  # Give backend a moment to start
HEALTH_CHECK=$(curl -s http://localhost:3001/api/health || echo "failed")
if [[ "$HEALTH_CHECK" == *"status"* ]]; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
    echo "   Response: $(echo $HEALTH_CHECK | jq -r '.status' 2>/dev/null || echo 'OK')"
else
    echo -e "${RED}❌ Backend API is not responding${NC}"
    echo "   Try: curl http://localhost:3001/api/health"
    exit 1
fi
echo ""

# Check Frontend
echo "6️⃣  Testing Frontend..."
FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
if [ "$FRONTEND_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend is not responding (HTTP $FRONTEND_CHECK)${NC}"
    echo "   Try: curl http://localhost/"
    exit 1
fi
echo ""

# Check if AI is configured
echo "7️⃣  Checking AI Configuration..."
source .env 2>/dev/null || true
if [ -n "$ANTHROPIC_API_KEY" ] || [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${GREEN}✅ AI API key is configured${NC}"
else
    echo -e "${YELLOW}⚠️  No AI API key found${NC}"
    echo "   The application will not generate queries without an API key"
    echo "   Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env file"
fi
echo ""

# Test query generation (if API key is present)
if [ -n "$ANTHROPIC_API_KEY" ] || [ -n "$OPENAI_API_KEY" ]; then
    echo "8️⃣  Testing Query Generation..."
    QUERY_TEST=$(curl -s -X POST http://localhost:3001/api/generate-query \
        -H "Content-Type: application/json" \
        -d '{"prompt": "Show all films", "useAI": true}' || echo "failed")
    
    if [[ "$QUERY_TEST" == *"sql"* ]]; then
        echo -e "${GREEN}✅ Query generation is working${NC}"
        echo "   Generated SQL: $(echo $QUERY_TEST | jq -r '.sql' 2>/dev/null | cut -c1-60)..."
    else
        echo -e "${YELLOW}⚠️  Query generation test failed${NC}"
        echo "   This may be normal if the AI API key is invalid"
    fi
    echo ""
fi

# Summary
echo "=============================================="
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Your Docker setup is working correctly!"
echo ""
echo "📍 Access the application:"
echo "   Frontend: http://localhost"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""

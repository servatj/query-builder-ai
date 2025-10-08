#!/bin/bash

# Query Builder - Docker Stop Script

echo "🛑 Stopping Query Builder services..."

# Check which compose file is running
if docker ps | grep -q "query-builder-frontend-dev"; then
    echo "📍 Detected development mode"
    docker-compose -f docker-compose.dev.yml down
elif docker ps | grep -q "query-builder-frontend"; then
    echo "📍 Detected production mode"
    docker-compose down
else
    echo "⚠️  No running containers detected"
    # Try both just in case
    docker-compose down 2>/dev/null
    docker-compose -f docker-compose.dev.yml down 2>/dev/null
fi

echo ""
echo "✅ Services stopped"
echo ""
echo "To start again, run: ./docker-start.sh"
echo "To remove volumes (delete data), run: docker-compose down -v"
echo ""

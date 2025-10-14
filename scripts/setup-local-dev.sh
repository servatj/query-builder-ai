#!/bin/bash
# Script to set up local development with Docker infrastructure

echo "🚀 Setting up local development environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start infrastructure (MySQL databases)
echo "📦 Starting MySQL infrastructure..."
docker-compose -f docker-compose.infra.mac.yml up -d

echo ""
echo "⏳ Waiting for MySQL to be ready (this may take 1-2 minutes)..."
sleep 10

# Wait for MySQL main to be healthy
echo "   Checking main MySQL..."
until docker exec query-builder-mysql mysqladmin ping -h localhost -u root -prootpassword --silent 2>/dev/null; do
    echo "   Still waiting for main MySQL..."
    sleep 5
done
echo "   ✅ Main MySQL is ready"

# Wait for Sakila to be healthy
echo "   Checking Sakila MySQL..."
until docker exec sakila mysqladmin ping -h localhost -u root -prootpassword --silent 2>/dev/null; do
    echo "   Still waiting for Sakila MySQL..."
    sleep 5
done
echo "   ✅ Sakila MySQL is ready"

echo ""
echo "🔧 Verifying Sakila database..."
ACTOR_COUNT=$(docker exec sakila mysql -uroot -prootpassword sakila -se "SELECT COUNT(*) FROM actor;" 2>/dev/null || echo "0")

if [ "$ACTOR_COUNT" -eq "0" ]; then
    echo "   ⚠️  Sakila database is empty, waiting for initialization..."
    sleep 30
    ACTOR_COUNT=$(docker exec sakila mysql -uroot -prootpassword sakila -se "SELECT COUNT(*) FROM actor;" 2>/dev/null || echo "0")
fi

if [ "$ACTOR_COUNT" -gt "0" ]; then
    echo "   ✅ Sakila database loaded ($ACTOR_COUNT actors found)"
else
    echo "   ⚠️  Sakila database may still be loading..."
fi

echo ""
echo "📝 Database connection info:"
echo "   Main MySQL:   localhost:3306 (user: queryuser, password: querypass)"
echo "   Sakila MySQL: localhost:3310 (user: queryuser, password: querypass)"
echo ""
echo "🎯 Now you can run your application locally:"
echo "   cd packages/backend && npm run dev"
echo "   cd packages/frontend && npm run dev"
echo ""
echo "✨ Done! Your local development environment is ready."

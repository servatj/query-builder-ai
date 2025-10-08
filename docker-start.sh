#!/bin/bash

# Query Builder - Docker Startup Script
# This script helps you get started with Docker quickly

set -e

echo "🚀 Query Builder - Docker Setup"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Visit: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file and add your API keys!"
    echo ""
    echo "   You need at least one of these:"
    echo "   - ANTHROPIC_API_KEY (get from https://console.anthropic.com/)"
    echo "   - OPENAI_API_KEY (get from https://platform.openai.com/api-keys)"
    echo ""
    read -p "Press Enter after you've added your API key to .env, or Ctrl+C to exit..."
fi

# Check if API keys are configured
source .env
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  WARNING: No API keys found in .env file"
    echo "   The application will not work without at least one API key."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ API key(s) configured"
fi

echo ""
echo "🏗️  Building and starting Docker containers..."
echo ""

# Ask for mode
echo "Select mode:"
echo "1) Production (optimized, no hot reload) - Port 80"
echo "2) Development (hot reload enabled) - Port 5173"
echo "3) Sandbox (demo with Sakila database on port 3310) - Port 80"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting in PRODUCTION mode..."
        docker-compose up -d --build
        FRONTEND_URL="http://localhost"
        COMPOSE_FILE="docker-compose.yml"
        ;;
    2)
        echo ""
        echo "🚀 Starting in DEVELOPMENT mode..."
        docker-compose -f docker-compose.dev.yml up -d --build
        FRONTEND_URL="http://localhost:5173"
        COMPOSE_FILE="docker-compose.dev.yml"
        ;;
    3)
        echo ""
        echo "🎮 Starting in SANDBOX mode with Sakila demo database..."
        docker-compose -f docker-compose.sandbox.yml up -d --build
        FRONTEND_URL="http://localhost"
        COMPOSE_FILE="docker-compose.sandbox.yml"
        ;;
    *)
        echo "Invalid choice. Starting in production mode..."
        docker-compose up -d --build
        FRONTEND_URL="http://localhost"
        COMPOSE_FILE="docker-compose.yml"
        ;;
esac

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check service health
echo ""
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ All services started!"
echo ""
echo "📍 Access the application:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend API: http://localhost:3001"
echo "   Health Check: http://localhost:3001/api/health"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
if [ "$choice" = "2" ]; then
    echo "   docker-compose -f docker-compose.dev.yml down"
elif [ "$choice" = "3" ]; then
    echo "   docker-compose -f docker-compose.sandbox.yml down"
else
    echo "   docker-compose down"
fi
echo ""
echo "📖 For more information, see DOCKER.md"
echo ""

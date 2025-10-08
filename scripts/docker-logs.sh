#!/bin/bash
# Docker Logs Script - View logs from containers

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}📋 Query Builder Logs Viewer${NC}\n"

# Check which environment is running
if docker ps | grep -q "query-builder-frontend-dev"; then
    ENV="development"
    COMPOSE_FILE="docker-compose.dev.yml"
elif docker ps | grep -q "query-builder-frontend-sandbox"; then
    ENV="sandbox"
    COMPOSE_FILE="docker-compose.sandbox.yml"
elif docker ps | grep -q "query-builder-frontend"; then
    ENV="production"
    COMPOSE_FILE="docker-compose.yml"
else
    echo -e "${YELLOW}No Query Builder containers are running${NC}"
    exit 0
fi

echo -e "${GREEN}Environment: $ENV${NC}\n"

# Ask which service to view
echo -e "${CYAN}Select service to view logs:${NC}"
echo -e "  ${GREEN}1${NC}) All services"
echo -e "  ${GREEN}2${NC}) Frontend"
echo -e "  ${GREEN}3${NC}) Backend"
echo -e "  ${GREEN}4${NC}) MySQL"
echo ""
read -p "Enter choice [1-4]: " service_choice

case $service_choice in
    1)
        SERVICE=""
        ;;
    2)
        SERVICE="frontend"
        ;;
    3)
        SERVICE="backend"
        ;;
    4)
        SERVICE="mysql"
        ;;
    *)
        echo -e "${YELLOW}Invalid choice. Showing all logs.${NC}"
        SERVICE=""
        ;;
esac

echo -e "\n${CYAN}📖 Viewing logs... (Press Ctrl+C to exit)${NC}\n"
docker-compose -f $COMPOSE_FILE logs -f $SERVICE

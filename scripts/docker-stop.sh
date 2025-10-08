#!/bin/bash
# Docker Stop Script - Stop all Query Builder containers

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🛑 Stopping Query Builder containers...${NC}\n"

# Stop all possible environments
echo -e "${YELLOW}Stopping production containers...${NC}"
docker-compose -f docker-compose.yml down 2>/dev/null || true

echo -e "${YELLOW}Stopping development containers...${NC}"
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

echo -e "${YELLOW}Stopping sandbox containers...${NC}"
docker-compose -f docker-compose.sandbox.yml down 2>/dev/null || true

echo -e "\n${GREEN}✅ All containers stopped${NC}"

# Ask if user wants to remove volumes
echo -e "\n${YELLOW}Do you want to remove data volumes?${NC}"
echo -e "  ${RED}WARNING: This will delete all database data!${NC}"
read -p "Remove volumes? [y/N]: " remove_volumes

if [[ $remove_volumes =~ ^[Yy]$ ]]; then
    echo -e "${RED}Removing volumes...${NC}"
    docker-compose -f docker-compose.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.sandbox.yml down -v 2>/dev/null || true
    echo -e "${GREEN}✅ Volumes removed${NC}"
else
    echo -e "${GREEN}✅ Volumes preserved${NC}"
fi

echo -e "\n${CYAN}To restart, run: ./scripts/docker-start.sh${NC}\n"

#!/bin/bash
# Setup Sakila Database Script - Ensures Sakila demo database is properly configured

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🎬 Sakila Database Setup${NC}\n"

# Detect which MySQL container is running
if docker ps | grep -q "query-builder-mysql-dev"; then
    MYSQL_CONTAINER="query-builder-mysql-dev"
elif docker ps | grep -q "query-builder-mysql-sandbox"; then
    MYSQL_CONTAINER="query-builder-mysql-sandbox"
elif docker ps | grep -q "query-builder-mysql"; then
    MYSQL_CONTAINER="query-builder-mysql"
else
    echo -e "${RED}❌ No MySQL container is running${NC}"
    echo -e "${YELLOW}Please start the application first using ./scripts/docker-start.sh${NC}"
    exit 1
fi

echo -e "${GREEN}Found MySQL container: $MYSQL_CONTAINER${NC}\n"

# Check if Sakila exists
if docker exec $MYSQL_CONTAINER mysql -u root -prootpass123 -e "USE sakila;" 2>/dev/null; then
    echo -e "${GREEN}✅ Sakila database already exists${NC}"
    
    # Show some stats
    TABLES=$(docker exec $MYSQL_CONTAINER mysql -u root -prootpass123 -D sakila -e "SHOW TABLES;" | wc -l)
    echo -e "${CYAN}   Tables: $((TABLES - 1))${NC}"
    
    FILMS=$(docker exec $MYSQL_CONTAINER mysql -u root -prootpass123 -D sakila -e "SELECT COUNT(*) FROM film;" | tail -1)
    echo -e "${CYAN}   Films: $FILMS${NC}"
    
    ACTORS=$(docker exec $MYSQL_CONTAINER mysql -u root -prootpass123 -D sakila -e "SELECT COUNT(*) FROM actor;" | tail -1)
    echo -e "${CYAN}   Actors: $ACTORS${NC}"
else
    echo -e "${YELLOW}Sakila database not found. The init scripts should have created it.${NC}"
    echo -e "${YELLOW}This might be because the container was started before init scripts were ready.${NC}"
    echo -e "\n${CYAN}Would you like to restart the containers to trigger initialization?${NC}"
    read -p "Restart containers? [Y/n]: " restart_choice
    restart_choice=${restart_choice:-Y}
    
    if [[ $restart_choice =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Restarting containers...${NC}"
        cd "$(dirname "$0")/.."
        ./scripts/docker-stop.sh
        ./scripts/docker-start.sh
    fi
fi

echo -e "\n${GREEN}✅ Sakila setup complete${NC}"
echo -e "${CYAN}Connection details:${NC}"
echo -e "   Host: localhost"
echo -e "   Port: 3310"
echo -e "   Database: sakila"
echo -e "   Username: queryuser"
echo -e "   Password: querypass"
echo -e "\n${CYAN}Try these example queries in the Query Builder:${NC}"
echo -e "   - ${GREEN}\"Show all films\"${NC}"
echo -e "   - ${GREEN}\"Action films\"${NC}"
echo -e "   - ${GREEN}\"Films rated PG\"${NC}"
echo -e "   - ${GREEN}\"List all actors\"${NC}\n"

#!/bin/bash

# Docker Start Script for Query Builder
# Supports multiple environments: production, development, sandbox

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════╗
║   AI-Powered Query Builder - Docker Setup    ║
╚═══════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Function to check if .env file exists
check_env_file() {
  if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f "packages/backend/.env.example" ]; then
      cp packages/backend/.env.example .env
      echo -e "${GREEN}✅ Created .env file. Please add your API keys.${NC}"
    else
      echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
      exit 1
    fi
  fi
}

# Function to prompt for API key
prompt_for_api_key() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}🔑 AI Configuration${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo ""
  echo "The Query Builder uses AI to generate SQL queries from natural language."
  echo "You need at least one AI provider API key."
  echo ""
  
  # Check if ANTHROPIC_API_KEY exists in .env
  if grep -q "ANTHROPIC_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${GREEN}✅ Anthropic API key found in .env${NC}"
  else
    read -p "Enter your Anthropic API key (or press Enter to skip): " anthropic_key
    if [ ! -z "$anthropic_key" ]; then
      # Update or add ANTHROPIC_API_KEY in .env
      if grep -q "ANTHROPIC_API_KEY=" .env; then
        sed -i.bak "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$anthropic_key|" .env
      else
        echo "ANTHROPIC_API_KEY=$anthropic_key" >> .env
      fi
      echo -e "${GREEN}✅ Anthropic API key configured${NC}"
    fi
  fi
  
  # Check if OPENAI_API_KEY exists in .env
  if grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${GREEN}✅ OpenAI API key found in .env${NC}"
  else
    read -p "Enter your OpenAI API key (or press Enter to skip): " openai_key
    if [ ! -z "$openai_key" ]; then
      # Update or add OPENAI_API_KEY in .env
      if grep -q "OPENAI_API_KEY=" .env; then
        sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$openai_key|" .env
      else
        echo "OPENAI_API_KEY=$openai_key" >> .env
      fi
      echo -e "${GREEN}✅ OpenAI API key configured${NC}"
    fi
  fi
  
  echo ""
}

# Function to start production environment
start_production() {
  echo -e "${GREEN}🚀 Starting PRODUCTION environment...${NC}"
  echo ""
  
  check_env_file
  prompt_for_api_key
  
  echo -e "${BLUE}Building and starting Docker containers...${NC}"
  docker-compose -f docker-compose.yml up --build -d
  
  echo ""
  echo -e "${GREEN}✅ Production environment started!${NC}"
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "Frontend:  ${GREEN}http://localhost${NC}"
  echo -e "Backend:   ${GREEN}http://localhost:3001${NC}"
  echo -e "MySQL:     ${GREEN}localhost:3306${NC}"
  echo -e "Sakila DB: ${GREEN}localhost:3310${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
}

# Function to start development environment
start_development() {
  echo -e "${YELLOW}🔧 Starting DEVELOPMENT environment...${NC}"
  echo ""
  
  check_env_file
  prompt_for_api_key
  
  echo -e "${BLUE}Building and starting Docker containers with hot reload...${NC}"
  docker-compose -f docker-compose.dev.yml up --build -d
  
  echo ""
  echo -e "${GREEN}✅ Development environment started!${NC}"
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "Frontend:  ${GREEN}http://localhost:5173${NC} (Vite with HMR)"
  echo -e "Backend:   ${GREEN}http://localhost:3001${NC} (Nodemon with auto-reload)"
  echo -e "MySQL:     ${GREEN}localhost:3306${NC}"
  echo -e "Sakila DB: ${GREEN}localhost:3310${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
}

# Function to start sandbox environment
start_sandbox() {
  echo -e "${PURPLE}🎪 Starting SANDBOX environment...${NC}"
  echo ""
  echo -e "${YELLOW}Sandbox mode enables:${NC}"
  echo "  • Read-only settings"
  echo "  • Pre-configured Sakila demo database"
  echo "  • Perfect for demos and testing"
  echo ""
  
  check_env_file
  
  # Set SANDBOX_MODE in .env
  if grep -q "SANDBOX_MODE=" .env; then
    sed -i.bak "s|SANDBOX_MODE=.*|SANDBOX_MODE=true|" .env
  else
    echo "SANDBOX_MODE=true" >> .env
  fi
  
  prompt_for_api_key
  
  echo -e "${BLUE}Building and starting Docker containers in sandbox mode...${NC}"
  docker-compose -f docker-compose.sandbox.yml up --build -d
  
  echo ""
  echo -e "${GREEN}✅ Sandbox environment started!${NC}"
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "Frontend:  ${GREEN}http://localhost${NC}"
  echo -e "Backend:   ${GREEN}http://localhost:3001${NC}"
  echo -e "MySQL:     ${GREEN}localhost:3306${NC}"
  echo -e "Sakila DB: ${GREEN}localhost:3310${NC} ${YELLOW}(Pre-configured!)${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
}

# Main menu
echo "Please select an environment:"
echo ""
echo "  1) 🚀 Production  - Optimized build, ready for deployment"
echo "  2) 🔧 Development - Hot reload enabled for coding"
echo "  3) 🎪 Sandbox     - Demo mode with Sakila database"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
  1)
    start_production
    ;;
  2)
    start_development
    ;;
  3)
    start_sandbox
    ;;
  *)
    echo -e "${RED}Invalid choice. Please run the script again.${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  • View logs:        ${BLUE}docker-compose logs -f${NC}"
echo "  • Stop services:    ${BLUE}docker-compose down${NC}"
echo "  • Restart services: ${BLUE}docker-compose restart${NC}"
echo "  • Check status:     ${BLUE}docker-compose ps${NC}"
echo ""

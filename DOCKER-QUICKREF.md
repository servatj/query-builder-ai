# Query Builder - Docker Quick Reference

## 🚀 Getting Started (First Time)

```bash
# 1. Clone the repository
git clone <repository-url>
cd query-builder

# 2. Create environment file
cp .env.docker .env

# 3. Edit .env and add your API key
# ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
# or
# OPENAI_API_KEY=sk-your-openai-key-here

# 4. Start everything
./docker-start.sh
# or
make docker-start

# 5. Open browser
# Production: http://localhost
# Development: http://localhost:5173
```

## 📋 Essential Commands

### Using Scripts (Easiest)
```bash
./docker-start.sh          # Start application (interactive)
./docker-stop.sh           # Stop application
```

### Using Makefile (Recommended)
```bash
make help                  # Show all available commands
make docker-start          # Start in production mode
make docker-dev            # Start in development mode
make docker-stop           # Stop all services
make docker-logs           # View logs
make docker-ps             # Check service status
make docker-rebuild        # Rebuild everything
make docker-clean          # Remove everything (including data!)
```

### Using Docker Compose Directly
```bash
# Production mode
docker-compose up -d                    # Start
docker-compose down                     # Stop
docker-compose logs -f                  # View logs
docker-compose ps                       # Check status
docker-compose restart backend          # Restart a service

# Development mode (with hot reload)
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f
```

## 🌐 Access URLs

| Service | Production | Development |
|---------|-----------|-------------|
| Frontend | http://localhost | http://localhost:5173 |
| Backend API | http://localhost:3001 | http://localhost:3001 |
| Health Check | http://localhost:3001/api/health | http://localhost:3001/api/health |
| MySQL (settings) | localhost:3306 | localhost:3306 |
| MySQL (sakila) | localhost:3310 | localhost:3310 |

## 📊 Monitoring & Debugging

```bash
# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# Check container status
docker-compose ps

# Check health status
docker-compose ps | grep "healthy"

# Execute command in container
docker-compose exec backend sh
docker-compose exec mysql mysql -u queryuser -pquerypass

# View resource usage
docker stats
```

## 🔄 Common Operations

### Restart a Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Rebuild After Code Changes
```bash
# Production
docker-compose up -d --build

# Development (usually auto-reloads)
docker-compose -f docker-compose.dev.yml up -d --build
```

### View Database
```bash
# Connect to MySQL
docker-compose exec mysql mysql -u queryuser -pquerypass query_builder

# Connect to Sakila
docker-compose exec mysql-sakila mysql -u queryuser -pquerypass sakila
```

### Update API Keys
```bash
# 1. Edit .env file
nano .env

# 2. Restart backend
docker-compose restart backend
```

## 🗂️ Data Management

### Backup Database
```bash
# Backup query_builder database
docker-compose exec mysql mysqldump -u queryuser -pquerypass query_builder > backup.sql

# Backup sakila database
docker-compose exec mysql-sakila mysqldump -u queryuser -pquerypass sakila > sakila_backup.sql
```

### Restore Database
```bash
# Restore query_builder database
docker-compose exec -T mysql mysql -u queryuser -pquerypass query_builder < backup.sql
```

### Reset Everything (Start Fresh)
```bash
# WARNING: This deletes ALL data!
docker-compose down -v --rmi all
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check if ports are in use
lsof -i :80
lsof -i :3001
lsof -i :3306
lsof -i :3310

# View detailed logs
docker-compose logs

# Check Docker resources
docker system df
```

### Backend Can't Connect to Database
```bash
# Check database is healthy
docker-compose ps

# View MySQL logs
docker-compose logs mysql

# Wait for database to be ready
docker-compose up -d mysql mysql-sakila
sleep 30
docker-compose up -d backend
```

### Frontend Can't Reach Backend
```bash
# Check backend is running
curl http://localhost:3001/api/health

# Check backend logs
docker-compose logs backend

# Restart frontend
docker-compose restart frontend
```

### Out of Disk Space
```bash
# Remove old images and containers
docker system prune -a

# Remove unused volumes
docker volume prune

# Check disk usage
docker system df
```

## 🔒 Environment Variables

Edit `.env` file:

```bash
# Required (at least one)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Optional
SANDBOX_MODE=false
```

After changing `.env`:
```bash
docker-compose restart backend
```

## 📦 Service Architecture

```
┌─────────────────────┐
│   Frontend (Nginx)  │  :80 (prod) / :5173 (dev)
│   React + Vite      │
└──────────┬──────────┘
           │ /api → proxy
           ↓
┌─────────────────────┐
│   Backend (Node)    │  :3001
│   Express + TS      │
└────┬──────────┬─────┘
     │          │
     ↓          ↓
┌─────────┐  ┌──────────────┐
│  MySQL  │  │ MySQL Sakila │
│  :3306  │  │    :3310     │
└─────────┘  └──────────────┘
```

## 📚 More Information

- Full documentation: [DOCKER.md](./DOCKER.md)
- Application docs: [README.md](./README.md)
- GitBook: https://joseps-personal-organization.gitbook.io/query-builder-ai/

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Check status: `docker-compose ps`
3. Check health: `curl http://localhost:3001/api/health`
4. Read: [DOCKER.md](./DOCKER.md)
5. Try: `make docker-clean` and start fresh

## 🎯 Production Deployment

For production deployment:

1. Use strong passwords (not defaults)
2. Set `NODE_ENV=production`
3. Use proper SSL/TLS certificates
4. Consider using Docker secrets for API keys
5. Set up proper logging and monitoring
6. Use a reverse proxy (nginx, traefik, etc.)
7. Enable firewall rules
8. Regular backups
9. Update images regularly

```bash
# Example production start
docker-compose up -d --no-build
docker-compose logs -f
```

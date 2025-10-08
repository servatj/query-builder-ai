# Docker Setup Guide

This guide explains how to run the Query Builder application using Docker.

## Prerequisites

- Docker Desktop installed (includes Docker and Docker Compose)
- At least one AI API key (Anthropic or OpenAI)

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file:

```bash
cp .env.docker .env
```

Edit `.env` and add your API keys:

```bash
# At least one of these is required
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Optional: Enable sandbox mode for read-only access
SANDBOX_MODE=false
```

### 2. Start All Services

**Production Mode** (optimized, no hot reload):

```bash
docker-compose up -d
```

**Development Mode** (with hot reload):

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Access the Application

- **Frontend**: http://localhost (production) or http://localhost:5173 (development)
- **Backend API**: http://localhost:3001
- **Backend Health**: http://localhost:3001/api/health

### 4. Check Status

```bash
# View logs
docker-compose logs -f

# Check running containers
docker-compose ps

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Available Commands

### Production Mode

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart backend

# View logs
docker-compose logs -f [service-name]

# Rebuild and restart
docker-compose up -d --build

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Development Mode

```bash
# Start in development mode with hot reload
docker-compose -f docker-compose.dev.yml up -d

# Stop development services
docker-compose -f docker-compose.dev.yml down

# View development logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild development images
docker-compose -f docker-compose.dev.yml up -d --build
```

## Services

The Docker setup includes:

1. **mysql** - MySQL database for Query Builder settings (port 3306)
2. **mysql-sakila** - Sakila demo database for queries (port 3310)
3. **backend** - Node.js backend API (port 3001)
4. **frontend** - React frontend with Nginx (port 80) or Vite dev server (port 5173)

## Architecture

```
┌─────────────────┐
│   Frontend      │  Port 80 (prod) / 5173 (dev)
│   (React/Vite)  │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│   Backend       │  Port 3001
│   (Node.js)     │
└────┬───────┬────┘
     │       │
     ↓       ↓
┌─────────┐ ┌──────────────┐
│  MySQL  │ │ MySQL Sakila │
│  Port   │ │ Port 3310    │
│  3306   │ │              │
└─────────┘ └──────────────┘
```

## Troubleshooting

### Services won't start

Check if ports are already in use:

```bash
# Check port usage
lsof -i :80
lsof -i :3001
lsof -i :3306
lsof -i :3310

# Or change ports in docker-compose.yml
```

### Database connection errors

Wait for databases to be healthy:

```bash
docker-compose logs mysql
docker-compose logs mysql-sakila

# Check health status
docker-compose ps
```

### Backend can't connect to database

Ensure the database services are running and healthy:

```bash
docker-compose up -d mysql mysql-sakila
docker-compose logs -f mysql
```

Wait for the message: "MySQL init process done. Ready for start up."

### Permission errors

On Linux, you may need to fix file permissions:

```bash
sudo chown -R $USER:$USER .
```

### Clear everything and start fresh

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Data Persistence

Data is stored in Docker volumes:

- `mysql_data` - Query Builder database (production)
- `sakila_data` - Sakila demo database (production)
- `mysql_data_dev` - Query Builder database (development)
- `sakila_data_dev` - Sakila demo database (development)

To backup data:

```bash
# Backup MySQL data
docker exec query-builder-mysql mysqldump -u queryuser -pquerypass query_builder > backup.sql

# Restore from backup
docker exec -i query-builder-mysql mysql -u queryuser -pquerypass query_builder < backup.sql
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | No* | - |
| `OPENAI_API_KEY` | OpenAI API key | No* | - |
| `SANDBOX_MODE` | Enable read-only mode | No | false |

*At least one AI API key is required for the application to generate queries.

## Performance Tips

1. **Production mode** is recommended for better performance
2. **Development mode** uses hot reload but requires more resources
3. Allocate at least **4GB RAM** to Docker Desktop
4. For better performance, use **SSD storage** for Docker volumes

## Security Notes

⚠️ **Important Security Considerations:**

1. Never commit `.env` file to version control
2. Change default database passwords in production
3. Use strong passwords for production databases
4. Consider using Docker secrets for sensitive data in production
5. The application is meant for internal use - add authentication if exposing publicly

## Health Checks

All services include health checks:

```bash
# Check if all services are healthy
docker-compose ps

# Manual health check
curl http://localhost:3001/api/health
curl http://localhost/
```

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# Or for development mode
docker-compose -f docker-compose.dev.yml up -d --build
```

## Support

For issues or questions:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose config`
3. Check service status: `docker-compose ps`
4. Review the main README.md for application-specific help

## Clean Up

To completely remove the application:

```bash
# Stop and remove containers, networks, volumes, and images
docker-compose down -v --rmi all

# Remove dangling images
docker image prune -a

# Remove unused volumes
docker volume prune
```

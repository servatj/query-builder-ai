# 🐳 Docker Sandbox Setup - Complete Overview

## 📦 Files Created

### Core Docker Files
| File | Purpose |
|------|---------|
| `Dockerfile.backend` | Backend container configuration (Node.js + Express) |
| `Dockerfile.frontend` | Frontend container configuration (React + Nginx) |
| `docker-compose.yml` | **Production setup** - optimized, port 80 |
| `docker-compose.dev.yml` | **Development setup** - hot reload, port 5173 |
| `docker-compose.infra.yml` | Infrastructure only (existing) |
| `.dockerignore` | Files to exclude from Docker builds |
| `docker/nginx.conf` | Nginx reverse proxy configuration |

### Helper Scripts
| Script | Purpose |
|--------|---------|
| `docker-start.sh` | **Interactive startup** - guides you through setup |
| `docker-stop.sh` | **Stop services** - automatically detects mode |
| `docker-test.sh` | **Verify setup** - tests all services |
| `Makefile` | **Make commands** - convenient shortcuts |

### Configuration Files
| File | Purpose |
|------|---------|
| `.env.docker` | **Environment template** - copy to `.env` |
| `packages/frontend/.env.example` | Frontend environment variables |

### Documentation
| Document | Purpose |
|----------|---------|
| `DOCKER.md` | **Full Docker guide** - comprehensive instructions |
| `DOCKER-QUICKREF.md` | **Quick reference** - common commands |
| `DOCKER-SETUP-COMPLETE.md` | **Setup summary** - getting started |
| `README.md` | **Updated** - includes Docker instructions |

## 🚀 Three Ways to Start

### 1. Interactive Script (Easiest)
```bash
./docker-start.sh
```
Walks you through setup, checks for API keys, and starts services.

### 2. Make Commands (Recommended)
```bash
make help              # Show all commands
make docker-start      # Production mode
make docker-dev        # Development mode
make docker-stop       # Stop services
make docker-logs       # View logs
```

### 3. Docker Compose (Direct)
```bash
# Setup
cp .env.docker .env
# Edit .env with your API key

# Production
docker-compose up -d --build

# Development
docker-compose -f docker-compose.dev.yml up -d --build
```

## 🎯 What You Get

### Services
1. **Frontend (React + Nginx)**
   - Production: Port 80
   - Development: Port 5173
   - Hot reload in dev mode

2. **Backend (Node.js + Express)**
   - Port 3001
   - REST API
   - Health checks

3. **MySQL (Query Builder)**
   - Port 3306
   - Settings storage
   - Auto-initialized

4. **MySQL Sakila (Demo DB)**
   - Port 3310
   - Sample data
   - Ready to query

## 📋 Prerequisites

### Required
- Docker Desktop installed
- At least one AI API key:
  - Anthropic: https://console.anthropic.com/
  - OpenAI: https://platform.openai.com/api-keys

### Recommended
- 4GB+ RAM allocated to Docker
- 10GB+ free disk space
- SSD storage for better performance

## 🔧 Configuration

### 1. Create .env file
```bash
cp .env.docker .env
```

### 2. Add API Keys
Edit `.env`:
```bash
# Required: At least one
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Optional
SANDBOX_MODE=false
```

### 3. Start Services
```bash
./docker-start.sh
```

## 🌐 Access Points

| Service | Production | Development |
|---------|-----------|-------------|
| Frontend | http://localhost | http://localhost:5173 |
| Backend API | http://localhost:3001 | http://localhost:3001 |
| Health Check | http://localhost:3001/api/health | http://localhost:3001/api/health |
| MySQL | localhost:3306 | localhost:3306 |
| Sakila | localhost:3310 | localhost:3310 |

## 🧪 Testing Your Setup

Run the verification script:
```bash
./docker-test.sh
```

This checks:
- ✅ Docker is running
- ✅ All containers are up
- ✅ MySQL databases are accessible
- ✅ Backend API responds
- ✅ Frontend loads
- ✅ AI configuration (if present)
- ✅ Query generation works

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Check Status
```bash
# Container status
docker-compose ps

# Resource usage
docker stats
```

### Health Checks
```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend
curl http://localhost/
```

## 🔄 Common Operations

### Restart a Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Update Code
```bash
# Rebuild after code changes
docker-compose up -d --build

# Or use Make
make docker-rebuild
```

### View Database
```bash
# Connect to MySQL
docker-compose exec mysql mysql -u queryuser -pquerypass query_builder

# Connect to Sakila
docker-compose exec mysql-sakila mysql -u queryuser -pquerypass sakila
```

### Update Environment
```bash
# 1. Edit .env file
nano .env

# 2. Restart backend
docker-compose restart backend
```

## 🗂️ Data Persistence

Data is stored in Docker volumes:
- `mysql_data` - Query Builder database (production)
- `sakila_data` - Sakila database (production)
- `mysql_data_dev` - Query Builder database (dev)
- `sakila_data_dev` - Sakila database (dev)

### Backup
```bash
# Backup database
docker-compose exec mysql mysqldump -u queryuser -pquerypass query_builder > backup.sql
```

### Restore
```bash
# Restore database
docker-compose exec -T mysql mysql -u queryuser -pquerypass query_builder < backup.sql
```

## 🐛 Troubleshooting

### Ports Already in Use
```bash
# Check what's using the port
lsof -i :80
lsof -i :3001

# Or change ports in docker-compose.yml
```

### Services Won't Start
```bash
# Check logs
docker-compose logs

# Check Docker resources
docker system df

# Try fresh start
make docker-clean
make docker-start
```

### Database Connection Issues
```bash
# Wait for databases to be healthy
docker-compose ps

# Check database logs
docker-compose logs mysql

# Restart databases
docker-compose restart mysql mysql-sakila
```

## 🧹 Cleanup

### Stop Services
```bash
./docker-stop.sh
# or
make docker-stop
```

### Remove Everything (including data)
```bash
make docker-clean
# or
docker-compose down -v --rmi all
```

## 🎓 Learning Resources

1. **Quick Start**: Read `DOCKER-SETUP-COMPLETE.md`
2. **Full Guide**: Read `DOCKER.md`
3. **Quick Reference**: Keep `DOCKER-QUICKREF.md` handy
4. **Application Docs**: See main `README.md`
5. **GitBook**: https://joseps-personal-organization.gitbook.io/query-builder-ai/

## 💡 Best Practices

### Development
- Use `docker-compose.dev.yml` for hot reload
- Mount source code as volumes
- Keep logs visible: `docker-compose logs -f`

### Production
- Use `docker-compose.yml` for optimized builds
- Change default passwords
- Enable HTTPS with reverse proxy
- Set up proper monitoring
- Regular backups of volumes

### Security
- Never commit `.env` files
- Use strong passwords (not defaults)
- Keep Docker images updated
- Use Docker secrets for sensitive data
- Enable firewall rules

## 🚀 Deployment Options

### Local Development
```bash
make docker-dev
```

### Local Production Testing
```bash
make docker-start
```

### Cloud Deployment
Works on any platform with Docker support:
- ☁️ AWS (ECS, EC2, Lightsail)
- ☁️ Google Cloud (Cloud Run, GCE)
- ☁️ Azure (Container Instances, AKS)
- ☁️ DigitalOcean (Droplets, App Platform)
- ☁️ Heroku (Container Registry)

## 📈 Performance Tips

1. **Allocate Resources**: 4GB+ RAM to Docker
2. **Use SSD**: For Docker volumes
3. **Production Mode**: Use optimized builds
4. **Monitoring**: Check `docker stats` regularly
5. **Cleanup**: Run `docker system prune` monthly

## 🎯 Next Steps

1. ✅ **Start the application**
   ```bash
   ./docker-start.sh
   ```

2. ✅ **Test everything works**
   ```bash
   ./docker-test.sh
   ```

3. ✅ **Open in browser**
   - http://localhost (production)
   - http://localhost:5173 (development)

4. ✅ **Try example queries**
   - Click examples in the sidebar
   - Generate SQL queries
   - Validate and preview results

5. ✅ **Read the documentation**
   - `DOCKER.md` for detailed info
   - `DOCKER-QUICKREF.md` for quick commands
   - Main `README.md` for application help

## ✨ Key Features

- 🐳 **Fully Containerized**: Everything runs in Docker
- 🔄 **Hot Reload**: Development mode updates instantly
- 🚀 **Production Ready**: Optimized builds with Nginx
- 🔒 **Secure**: Environment-based configuration
- 📊 **Monitored**: Health checks for all services
- 🗄️ **Persistent**: Data saved in volumes
- 🧪 **Testable**: Verification script included
- 📖 **Documented**: Comprehensive guides

## 🎊 You're Ready!

Your Query Builder is now a complete Docker sandbox. Everything you need is included:

- ✅ Docker files configured
- ✅ Helper scripts created
- ✅ Documentation written
- ✅ Examples provided
- ✅ Tests included

Just run:
```bash
./docker-start.sh
```

And start building queries! 🚀

---

**Questions?** Check the documentation:
- `DOCKER.md` - Full guide
- `DOCKER-QUICKREF.md` - Quick commands
- `README.md` - Application docs

**Issues?** Run the test script:
```bash
./docker-test.sh
```

Happy querying! 💜

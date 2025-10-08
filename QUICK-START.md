# 🚀 Quick Start Guide - Query Builder

## Start the Application

### Interactive Mode (Recommended)
```bash
./docker-start.sh
```

Then select:
- **Option 1**: Production (Port 80) - Optimized build
- **Option 2**: Development (Port 5173) - Hot reload for coding
- **Option 3**: Sandbox (Port 80) - Demo with Sakila database

---

## 🎮 Sandbox Mode (Best for First-Time Users)

### What You Get
✅ Pre-configured Sakila demo database  
✅ Sample movie data ready to query  
✅ No setup required  
✅ Perfect for testing and demos  

### Ports
- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3001
- **Sakila Database**: localhost:3310
- **Settings Database**: localhost:3306

### Try These Queries
Once the sandbox is running, open http://localhost and try:
- "Show all films"
- "Action films"
- "List all actors"
- "Films rated PG"
- "Show R-rated movies"
- "Comedy movies"

---

## 📊 Port Summary

| Environment | Frontend | Backend | Settings DB | Sakila DB |
|------------|----------|---------|-------------|-----------|
| Production | 80 | 3001 | 3306 | - |
| Development | 5173 | 3001 | 3306 | - |
| Sandbox | 80 | 3001 | 3306 | 3310 |

---

## ⚙️ Configuration

### Add Your API Key
Edit the `.env` file and add at least one:
```bash
ANTHROPIC_API_KEY=sk-ant-xxx...
# OR
OPENAI_API_KEY=sk-xxx...
```

### Sakila Database Connection (Pre-configured in Sandbox)
```
Host: localhost (or mysql-sakila in Docker)
Port: 3310
Database: sakila
Username: queryuser
Password: querypass
```

---

## 🛑 Stop the Application

### Using Docker Compose
```bash
# For sandbox
docker-compose -f docker-compose.sandbox.yml down

# For development
docker-compose -f docker-compose.dev.yml down

# For production
docker-compose down
```

### Stop All Containers
```bash
docker stop $(docker ps -q)
```

---

## 📝 View Logs

### All Services
```bash
docker-compose logs -f
```

### Specific Service
```bash
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f mysql
docker-compose logs -f mysql-sakila  # Only in sandbox
```

---

## 🔧 Troubleshooting

### Container Status
```bash
docker ps
```

### Restart Services
```bash
docker-compose restart
```

### Clean Start
```bash
docker-compose down -v
./docker-start.sh
```

### Port Conflicts
```bash
# Check what's using a port
lsof -ti:80    # or 5173, 3001, etc.

# Kill the process
kill -9 $(lsof -ti:80)
```

---

## 🎯 Next Steps

1. **Start with Sandbox** - Get familiar with the interface
2. **Try the examples** - Use the Quick Examples in the UI
3. **Switch to Development** - When ready to customize
4. **Deploy Production** - Use production mode for deployment

---

## 📚 More Information

- **Full Setup**: See `DOCKER-SETUP-COMPLETE.md`
- **Documentation**: Check the `docs/` folder
- **Main README**: See `README.md`

---

*Need help? Check the troubleshooting section or view the logs!*

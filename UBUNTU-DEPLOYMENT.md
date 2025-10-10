# Ubuntu Server Deployment Steps

## Quick Fix for Running Containers

After pulling the latest code, run these commands on your Ubuntu server:

```bash
# 1. Navigate to project directory
cd /opt/query-builder-ai

# 2. Pull latest changes
git pull origin main

# 3. Stop and remove ALL existing containers and volumes
docker-compose -f docker-compose.sandbox.yml down -v

# 4. Remove any stuck containers manually (if needed)
docker ps -a | grep sakila
docker rm -f query-builder-sakila-sandbox  # if exists

# 5. Start services fresh
docker-compose -f docker-compose.sandbox.yml up -d

# 6. Check container status
docker ps

# 7. Verify Sakila is running
docker logs query-builder-sakila-sandbox

# 8. Test database connection
docker exec -it query-builder-sakila-sandbox mysql -uroot -prootpassword -e "USE sakila; SELECT COUNT(*) FROM actor;"
```

## What Was Fixed?

- ✅ Replaced ARM64-only image with multi-platform `mysql:9.4`
- ✅ Added Sakila SQL files as volume mounts
- ✅ Explicit `platform: linux/amd64` for AMD64 Ubuntu servers
- ✅ Works on both ARM64 (Mac) and AMD64 (Ubuntu) systems

## Expected Output

After running `docker ps`, you should see:

```
CONTAINER ID   IMAGE       COMMAND                  STATUS
xxxxx          mysql:9.4   "docker-entrypoint.s…"   Up 30 seconds (healthy)
```

## If Still Having Issues

### Check logs for errors:
```bash
docker logs query-builder-sakila-sandbox 2>&1 | tail -50
```

### Verify SQL files exist:
```bash
ls -la scripts/sakila-*.sql
```

### Nuclear option (complete reset):
```bash
docker-compose -f docker-compose.sandbox.yml down -v
docker system prune -a --volumes -f
docker-compose -f docker-compose.sandbox.yml up -d --build
```

## Services URLs

After successful deployment:

- **Frontend**: http://your-server-ip (port 80)
- **Backend API**: http://your-server-ip:3001
- **MySQL Settings**: Port 3306
- **MySQL Sakila**: Port 3310

## Health Check

```bash
# Check all containers
docker ps

# Check backend logs
docker logs query-builder-backend-sandbox

# Check frontend logs  
docker logs query-builder-frontend-sandbox

# Check MySQL Sakila
docker exec -it query-builder-sakila-sandbox mysql -uroot -prootpassword sakila -e "SHOW TABLES;"
```

Should show Sakila tables: actor, film, customer, rental, etc.

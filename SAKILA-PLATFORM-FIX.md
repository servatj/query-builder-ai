# Fixing Sakila Docker Platform Issue (ARM64 vs AMD64)

## Problem
The `servatj/sakila-mysql:latest` Docker image was built for ARM64 architecture, causing "exec format error" on AMD64 systems (like Ubuntu servers on DigitalOcean).

## Solution
Changed from using a custom Sakila image to using the official `mysql:9.4` image with Sakila SQL files mounted as volumes.

## Changes Made

### Updated Docker Compose Files
1. **docker-compose.yml** - Production environment
2. **docker-compose.dev.yml** - Development environment  
3. **docker-compose.sandbox.yml** - Sandbox environment

### Changes in each file:
```yaml
# OLD (ARM64 only)
mysql-sakila:
  image: servatj/sakila-mysql:latest
  platform: linux/amd64
  
# NEW (Multi-platform compatible)
mysql-sakila:
  image: mysql:9.4
  platform: linux/amd64
  volumes:
    - sakila_data:/var/lib/mysql
    - ./scripts/sakila-schema.sql:/docker-entrypoint-initdb.d/01-sakila-schema.sql:ro
    - ./scripts/sakila-data.sql:/docker-entrypoint-initdb.d/02-sakila-data.sql:ro
```

## How to Deploy on Ubuntu Server

### 1. Stop and Remove Old Containers
```bash
docker-compose -f docker-compose.sandbox.yml down -v
docker ps -a  # Check for any remaining containers
docker rm -f query-builder-sakila-sandbox  # If needed
```

### 2. Pull Latest Code
```bash
cd /opt/query-builder-ai
git pull origin main
```

### 3. Ensure Sakila SQL Files Exist
The files should already be in `scripts/` directory:
- `scripts/sakila-schema.sql`
- `scripts/sakila-data.sql`

If missing, run:
```bash
bash scripts/download-sakila.sh
```

### 4. Start Services
```bash
docker-compose -f docker-compose.sandbox.yml up -d
```

### 5. Verify Services
```bash
docker ps
docker logs query-builder-sakila-sandbox
```

## Testing the Fix

### Check Container Status
```bash
docker ps -a | grep sakila
```

Should show:
```
CONTAINER ID   IMAGE       COMMAND                  STATUS
xxxxx          mysql:9.4   "docker-entrypoint.s…"   Up X minutes (healthy)
```

### Verify Sakila Database
```bash
docker exec -it query-builder-sakila-sandbox mysql -uroot -prootpassword -e "USE sakila; SHOW TABLES;"
```

Should show Sakila tables like: actor, film, customer, etc.

### Check Logs for Errors
```bash
docker logs query-builder-sakila-sandbox 2>&1 | grep -i error
```

Should return empty or no critical errors.

## Why This Works

1. **Official MySQL Image**: The `mysql:9.4` image is built for multiple platforms (amd64, arm64)
2. **Volume Mounting**: Sakila SQL files are mounted into `/docker-entrypoint-initdb.d/`
3. **Auto-Initialization**: MySQL automatically executes SQL files in that directory on first startup
4. **Read-Only Mounts**: Using `:ro` flag prevents accidental modifications

## Benefits

- ✅ Works on both AMD64 and ARM64 architectures
- ✅ No need to maintain custom Docker images
- ✅ Easy to update Sakila database (just replace SQL files)
- ✅ Same behavior across all environments
- ✅ Official MySQL image = better security & support

## Troubleshooting

### Container Keeps Restarting
```bash
docker logs query-builder-sakila-sandbox
```
Check for SQL syntax errors or missing files.

### "Cannot find sakila-schema.sql"
Ensure files exist:
```bash
ls -la scripts/sakila-*.sql
```

### Need to Rebuild from Scratch
```bash
docker-compose -f docker-compose.sandbox.yml down -v
docker volume rm query-builder-ai_sakila_data_sandbox
docker-compose -f docker-compose.sandbox.yml up -d
```

## Alternative: Building Multi-Platform Image

If you prefer using a custom image, build it for both platforms:

```bash
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t servatj/sakila-mysql:latest \
  --push .
```

However, the volume-mount approach is simpler and more maintainable.

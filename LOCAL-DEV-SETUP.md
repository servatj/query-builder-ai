# Local Development Setup (Without Full Docker)

This guide helps you run the app in local development mode with `npm run dev`.

## Quick Start

### Option 1: Frontend + Backend + Docker MySQL (Recommended)

This approach runs only MySQL in Docker, while your code runs locally for fast hot-reload.

**Step 1: Start MySQL containers**
```bash
# Start only MySQL services (not frontend/backend)
docker-compose up -d mysql mysql-sakila
```

**Step 2: Update backend .env**
```bash
cd packages/backend
```

Edit `.env` to use Docker MySQL ports:
```env
# For Sakila demo database (recommended for testing)
DATABASE_URL="mysql://queryuser:querypass@localhost:3310/sakila"
SETTINGS_DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"

# Or for query_builder database
# DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"

PORT=3001
NODE_ENV=development
SANDBOX_MODE=false

# Your Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Step 3: Start backend**
```bash
cd packages/backend
npm install  # if not done already
npm run dev
```

Backend runs on: http://localhost:3001

**Step 4: Start frontend**
```bash
cd packages/frontend
npm install  # if not done already
npm run dev
```

Frontend runs on: http://localhost:5173

**Step 5: Open browser**
```
http://localhost:5173
```

---

### Option 2: Use Full Docker (Easiest)

If you don't want to manage separate terminals:

```bash
# Start everything with Docker
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

Access at: http://localhost (proxied through nginx)

---

## Port Reference

| Service | Local Dev Port | Docker Internal |
|---------|---------------|-----------------|
| Frontend | 5173 | 80 (nginx) |
| Backend | 3001 | 3001 |
| MySQL (query_builder) | 3306 | 3306 |
| MySQL (sakila) | 3310 | 3306 |

---

## Common Issues

### "Backend: Database:" error in UI

**Cause**: Backend can't connect to MySQL

**Fix**:
1. Make sure MySQL is running:
   ```bash
   docker ps | grep mysql
   ```

2. Check if ports are accessible:
   ```bash
   mysql -h 127.0.0.1 -P 3310 -u queryuser -p
   # Password: querypass
   ```

3. Verify DATABASE_URL in backend/.env

### CORS errors

Already fixed! The frontend automatically uses:
- `http://localhost:3001` in dev mode
- Relative paths in production (Docker)

### Frontend can't reach backend

Make sure backend is running:
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{"status":"healthy","timestamp":"..."}
```

---

## Development Workflow

### Making Backend Changes
1. Backend auto-reloads with nodemon
2. Changes appear immediately
3. Check logs in terminal

### Making Frontend Changes
1. Frontend auto-reloads with Vite HMR
2. Changes appear in ~50ms
3. Check browser console for errors

### Database Changes
1. Migrations run automatically on backend startup
2. To re-run migrations, restart backend
3. To reset DB:
   ```bash
   docker-compose down -v  # destroys volumes
   docker-compose up -d mysql mysql-sakila
   ```

---

## Stopping Services

**Local dev (Option 1)**:
```bash
# Stop backend/frontend: Ctrl+C in terminals
# Stop MySQL:
docker-compose down
```

**Full Docker (Option 2)**:
```bash
docker-compose down
```

---

## Environment Variables

**Backend (.env)**
```env
DATABASE_URL="mysql://queryuser:querypass@localhost:3310/sakila"
SETTINGS_DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...
```

**Frontend**
No .env needed! It automatically detects dev vs production.

---

## Troubleshooting

### Check Backend Health
```bash
curl http://localhost:3001/api/health
```

### Check MySQL Connection
```bash
docker exec -it query-builder-mysql mysql -u queryuser -pquerypass -e "SHOW DATABASES;"
```

### View Logs
```bash
# Backend (if running with npm)
# Check terminal output

# MySQL (if running with Docker)
docker-compose logs mysql
docker-compose logs mysql-sakila
```

### Reset Everything
```bash
# Stop everything
docker-compose down -v

# Remove node_modules
rm -rf node_modules packages/*/node_modules

# Reinstall
npm install

# Start fresh
docker-compose up -d mysql mysql-sakila
cd packages/backend && npm run dev
cd packages/frontend && npm run dev
```

# 🎮 Sandbox Mode - Quick Start Guide

## Overview
Sandbox mode provides a complete demo environment with the **Sakila** sample database pre-configured and ready to use immediately.

## What's Included

### 🎬 Sakila Database
- **Port**: 3310 (MySQL)
- **Pre-configured**: Yes, automatically set as the default database
- **Contains**: Movies, actors, customers, rentals, and more
- **Perfect for**: Testing queries, demonstrations, and learning

### 📊 Sample Queries You Can Try

Once the sandbox is running, try these natural language queries:

1. **"Show all films"** - Lists all movies in the database
2. **"Action films"** - Finds all action movies
3. **"Films rated PG"** - Shows PG-rated movies
4. **"List all actors"** - Displays all actors
5. **"Comedy movies"** - Finds all comedy films
6. **"Show all customers"** - Lists all customers
7. **"Top 10 rented films"** - Most popular rentals

## Quick Start

### Option 1: Using docker-start.sh (Recommended)
```bash
./docker-start.sh
# Select option 3 (Sandbox mode)
```

### Option 2: Direct Docker Compose
```bash
docker-compose -f docker-compose.sandbox.yml up -d
```

## Access Points

Once running, access the application at:
- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3001
- **Sakila Database**: localhost:3310 (MySQL)
- **Settings Database**: localhost:3306 (MySQL)

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (Port 80)                             │
│  http://localhost                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Backend API (Port 3001)                        │
│  SANDBOX_MODE=true                              │
└────────┬───────────────────────┬────────────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────────────┐
│  Settings DB     │   │  Sakila Demo DB          │
│  Port 3306       │   │  Port 3310               │
│  (query_builder) │   │  (sakila) ✅ DEFAULT     │
└──────────────────┘   └──────────────────────────┘
```

## Database Schema

The Sakila database includes these main tables:

### Core Tables
- **film** - Movie catalog with titles, descriptions, ratings
- **actor** - Actor information
- **category** - Film categories/genres
- **customer** - Customer records
- **rental** - Rental transactions
- **inventory** - Available film copies
- **store** - Store locations

### Relationship Tables
- **film_actor** - Links films to actors
- **film_category** - Links films to categories

## Pre-configured Settings

The sandbox mode automatically:
✅ Sets Sakila as the default database  
✅ Enables read-only mode for safety  
✅ Configures optimal connection settings  
✅ Loads demo data and relationships  

## Environment Variables

Required (add to `.env` file):
```bash
# At least one AI provider key is required
ANTHROPIC_API_KEY=your_anthropic_key_here
# OR
OPENAI_API_KEY=your_openai_key_here
```

Optional:
```bash
SANDBOX_MODE=true  # Automatically set in sandbox mode
NODE_ENV=production
```

## Stopping the Sandbox

```bash
docker-compose -f docker-compose.sandbox.yml down
```

To remove all data and start fresh:
```bash
docker-compose -f docker-compose.sandbox.yml down -v
```

## Troubleshooting

### Can't connect to database
```bash
# Check if services are running
docker-compose -f docker-compose.sandbox.yml ps

# Check logs
docker-compose -f docker-compose.sandbox.yml logs backend
docker-compose -f docker-compose.sandbox.yml logs mysql-sakila
```

### Sakila database not showing up
1. Wait 30-60 seconds for database initialization
2. Check the backend logs: `docker-compose -f docker-compose.sandbox.yml logs backend`
3. Refresh the frontend page
4. Go to Settings → Database and verify "Sakila Demo Database" is listed

### Reset everything
```bash
# Stop and remove all containers and volumes
docker-compose -f docker-compose.sandbox.yml down -v

# Start fresh
./docker-start.sh
# Select option 3
```

## Features in Sandbox Mode

### ✅ Enabled
- AI-powered query generation
- Natural language to SQL conversion
- Query validation and preview
- Database schema visualization
- ERD diagrams
- All read operations (SELECT queries)

### ❌ Disabled (for safety)
- Database modifications (INSERT, UPDATE, DELETE)
- Schema changes (CREATE, ALTER, DROP)
- User management
- Database configuration changes

## Next Steps

1. **Try the Quick Examples** - Click any example on the right sidebar
2. **Explore the Schema** - Check the Database Schema panel
3. **View the ERD** - Click the "Diagram" tab to see relationships
4. **Test AI Generation** - Type natural language queries
5. **Validate Queries** - See results before execution

## Production Deployment

When ready to move to production:
1. Use `docker-compose.yml` for production mode
2. Configure your own database connection
3. Set proper security credentials
4. Review the `DOCKER.md` for full deployment guide

## Support

- **Documentation**: See `/docs` folder
- **Issues**: Check the GitHub repository
- **Logs**: `docker-compose -f docker-compose.sandbox.yml logs -f`

---

**Happy Querying! 🎉**

Try asking: *"Show me all action films with their actors"*

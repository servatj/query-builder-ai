# Query Builder Infrastructure

This directory contains the infrastructure setup for the AI-Powered Query Builder application, including MySQL database configurations for both sandbox (Sakila) and application settings storage.

## Architecture Overview

The application uses two separate MySQL databases:

1. **Sakila Database** - Sample movie rental database for sandbox/demo queries
2. **QueryBuilder Database** - Application settings storage (except rules.json)

## Database Structure

### 1. Sakila Database (`sakila`)
- **Purpose**: Sandbox environment for testing natural language queries
- **Content**: Movie rental business data (films, actors, customers, rentals, etc.)
- **Source**: Official MySQL Sakila sample database
- **Usage**: Default target for AI-generated queries and user experimentation

### 2. QueryBuilder Database (`query_builder`)
- **Purpose**: Application configuration and settings storage
- **Tables**:
  - `database_settings` - Database connection configurations
  - `ai_settings` - AI/OpenAI model configurations  
  - `app_settings` - General application settings
  - `query_logs` - Query execution logging (optional)

**Note**: `rules.json` (schema definitions and query patterns) remains file-based as requested.

## Quick Start

### 1. Start Infrastructure
```bash
# From project root
docker-compose -f docker-compose.infra.yml up -d
```

### 2. Verify Setup
- **MySQL**: `localhost:3306`
  - Root password: `rootpassword`
  - Application user: `queryuser` / `querypass`
- **phpMyAdmin**: `localhost:8080` (optional database management)

### 3. Check Databases
```sql
SHOW DATABASES;
-- Should show: sakila, query_builder

USE sakila;
SHOW TABLES;
-- Should show: actor, film, customer, rental, etc. (17 tables)

USE query_builder; 
SHOW TABLES;
-- Should show: database_settings, ai_settings, app_settings, query_logs
```

## Database Details

### Database Settings (`database_settings`)
Stores multiple database connection configurations:
- **Sakila Sandbox** (default) - Points to local Sakila database
- **Custom Connections** - User-defined database connections

### AI Settings (`ai_settings`)
Stores AI model configurations:
- OpenAI API keys (encrypted in production)
- Model selection (GPT-4, GPT-3.5, etc.)
- Temperature and token limits
- Enable/disable AI features

### App Settings (`app_settings`)
General application configuration:
- Query result limits
- Logging preferences
- Timeout settings
- Feature flags

## Environment Variables

### Backend Configuration
```bash
# Main application database (for validation/queries)
DATABASE_URL=mysql://queryuser:querypass@localhost:3306/sakila

# Settings storage database
SETTINGS_DATABASE_URL=mysql://queryuser:querypass@localhost:3306/query_builder

# OpenAI (optional - can be configured via UI)
OPENAI_API_KEY=sk-your-api-key-here
```

## File Structure

```
infra/
├── INFRASTRUCTURE.md                  # This file
├── mysql/
│   └── init/                          # Database initialization scripts
│       ├── 00-create-databases.sql    # Creates sakila and query_builder databases
│       ├── 02-query-builder-schema.sql # QueryBuilder app tables and default data
│       ├── 03-sakila-setup.sql        # Loads Sakila sample database
│       └── sakila-db/                 # Sakila database files
│           ├── sakila-schema.sql      # Sakila table structure
│           └── sakila-data.sql        # Sakila sample data
└── docker-compose.infra.yml           # Docker infrastructure setup
```

## Data Flow

1. **Rules/Schema Management**: File-based (`rules.json`) ✓
2. **Database Connections**: Database-stored (`database_settings`) ✓
3. **AI Configuration**: Database-stored (`ai_settings`) ✓
4. **App Settings**: Database-stored (`app_settings`) ✓
5. **Query Execution**: Uses configured database connections ✓
6. **Query Logging**: Optional database logging (`query_logs`) ✓

## Security Considerations

### Development Environment
- Uses simple passwords for ease of setup
- No encryption for stored credentials
- All ports exposed for development access

### Production Recommendations
- Use environment variables for sensitive data
- Encrypt API keys and passwords in database
- Use proper SSL/TLS for database connections
- Restrict network access and use proper firewall rules
- Regular backup of both databases
- Consider separate infrastructure for production

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if MySQL is running
   docker-compose -f docker-compose.infra.yml ps
   
   # Check logs
   docker-compose -f docker-compose.infra.yml logs mysql
   ```

2. **Sakila Data Missing**
   ```bash
   # Restart infrastructure to re-run init scripts
   docker-compose -f docker-compose.infra.yml down
   docker-compose -f docker-compose.infra.yml up -d
   ```

3. **Settings Not Persisting**
   - Verify `query_builder` database exists
   - Check backend logs for database connection errors
   - Ensure `SETTINGS_DATABASE_URL` points to correct database

### Reset Everything
```bash
# Warning: This will delete all data!
docker-compose -f docker-compose.infra.yml down -v
docker-compose -f docker-compose.infra.yml up -d
```

## Monitoring

### Health Checks
- MySQL container includes health checks
- Backend `/api/health` endpoint shows database connectivity
- phpMyAdmin provides database administration interface

### Logs
```bash
# View MySQL logs
docker-compose -f docker-compose.infra.yml logs -f mysql

# View all infrastructure logs
docker-compose -f docker-compose.infra.yml logs -f
```
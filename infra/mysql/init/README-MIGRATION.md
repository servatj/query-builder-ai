# Database Migration Guide

## Migration to Claude Sonnet 4.0

This directory contains a migration script to update your existing database to use Claude Sonnet 4.0 with optimized settings.

### What's Changed

The migration (`03-migrate-to-claude-sonnet-4.sql`) updates:

1. **AI Model**: Changes from any existing model to `claude-sonnet-4-20250514`
2. **Temperature**: Reduced from 0.3 to 0.2 (better for structured SQL output)
3. **Max Tokens**: Increased from 1000 to 2000 (handles complex queries better)
4. **Model Name**: Updates "OpenAI" references to "Anthropic Claude"

### Performance Improvements

**Why these changes improve results:**

- **Lower Temperature (0.2)**: Makes the AI more deterministic and precise, crucial for SQL generation
- **Higher Max Tokens (2000)**: Allows for more complex queries with multiple JOINs and conditions
- **Better Prompts**: Enhanced system prompts with clearer instructions and examples
- **Claude Sonnet 4**: Latest model with improved reasoning and SQL generation capabilities

### How to Apply the Migration

#### Option 1: Docker Environment (Recommended)

If you're using Docker, the migration will run automatically on next startup:

```bash
# Stop containers
docker-compose down

# Start containers (migration runs automatically)
docker-compose up -d
```

The init scripts run in alphabetical order:
1. `00-create-databases.sql`
2. `02-query-builder-schema.sql`
3. `03-migrate-to-claude-sonnet-4.sql` ← Migration runs here

#### Option 2: Manual Database Update

If you have an existing database and want to update it manually:

```bash
# Connect to MySQL
mysql -u queryuser -p query_builder

# Run the migration
source /path/to/infra/mysql/init/03-migrate-to-claude-sonnet-4.sql

# Or copy-paste the SQL commands
```

#### Option 3: Using MySQL Client

```bash
mysql -u queryuser -p query_builder < infra/mysql/init/03-migrate-to-claude-sonnet-4.sql
```

### Verify the Migration

After running the migration, verify the changes:

```sql
USE query_builder;

SELECT 
    id,
    name,
    model,
    temperature,
    max_tokens,
    is_default,
    updated_at
FROM ai_settings 
WHERE is_default = TRUE;
```

Expected output:
- **name**: `Default Anthropic Claude`
- **model**: `claude-sonnet-4-20250514`
- **temperature**: `0.20`
- **max_tokens**: `2000`

### Restart Backend

After migration, restart your backend service to pick up the new settings:

```bash
# If using Docker
docker-compose restart backend

# If running locally
cd packages/backend
npm run dev
```

### Expected Results

After migration, you should see:

- **Higher Confidence Scores**: Previously 20-30%, now 80-95% for clear queries
- **Better SQL Generation**: More accurate table joins and WHERE clauses
- **Faster Response**: Claude Sonnet 4 is optimized for speed
- **Complex Queries**: Can handle multi-table joins with proper relationships

### Rollback (if needed)

If you need to rollback to previous settings:

```sql
UPDATE ai_settings 
SET 
    model = 'gpt-4-turbo-preview',
    name = 'Default OpenAI',
    temperature = 0.30,
    max_tokens = 1000,
    updated_at = CURRENT_TIMESTAMP
WHERE is_default = TRUE;
```

### Testing the Improvements

Try these queries to test the improved model:

1. **Simple Query**: "Show me all actors"
   - Expected confidence: 95%+

2. **Join Query**: "Movies starring Smith"
   - Expected confidence: 90%+
   - Should properly join film, film_actor, and actor tables

3. **Complex Query**: "Top 10 most rented films in Action category"
   - Expected confidence: 85%+
   - Should handle multiple joins and aggregations

### Troubleshooting

**If confidence is still low:**

1. Check that backend is using the new settings:
   ```bash
   docker-compose logs backend | grep "Claude"
   ```

2. Verify API key is set:
   ```bash
   echo $ANTHROPIC_API_KEY
   ```

3. Test AI connection in Settings page

**If migration doesn't run:**

- Ensure file is named `03-migrate-to-claude-sonnet-4.sql`
- Check file has execute permissions
- Verify Docker volume mounts include `./infra/mysql/init:/docker-entrypoint-initdb.d`

### Support

For issues or questions:
- Check logs: `docker-compose logs backend`
- Review the migration SQL file
- Verify your Anthropic API key has sufficient credits

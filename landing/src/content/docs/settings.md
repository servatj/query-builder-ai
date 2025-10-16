# Settings & Configuration

This guide covers all configuration options and settings available in the AI Query Builder.

## Settings Panel Overview

The Settings panel provides access to:
- Database connection configuration
- Query pattern management
- Schema editor
- Performance tuning
- Security settings

![Settings Panel](/screenshots/settings-panel.png)

## Database Configuration

### Connection Settings

Configure your database connection through the Settings panel:

**MySQL Configuration:**
```json
{
  "host": "localhost",
  "port": 3306,
  "database": "query_builder",
  "user": "queryuser",
  "password": "querypass",
  "ssl": false,
  "connectionLimit": 10
}
```

**Connection Pool Settings:**
- **Connection Limit**: Maximum number of concurrent connections (default: 10)
- **Idle Timeout**: Time to keep idle connections (default: 30 seconds)
- **Acquire Timeout**: Maximum time to wait for a connection (default: 60 seconds)

### Multiple Database Support

You can configure multiple database connections:

```json
{
  "databases": {
    "production": {
      "host": "prod-db.company.com",
      "database": "query_builder",
      "user": "prod_user"
    },
    "sandbox": {
      "host": "localhost",
      "database": "query_builder_sbox",
      "user": "queryuser"
    },
    "demo": {
      "host": "localhost",
      "port": 3310,
      "database": "sakila",
      "user": "queryuser"
    }
  },
  "activeDatabase": "sandbox"
}
```

### Connection Testing

Use the "Test Connection" button to verify:
- Database accessibility
- Credential validity
- Network connectivity
- SSL configuration

## Schema Management

### Schema Editor

The schema editor allows you to:
- Define table structures
- Specify column types and descriptions
- Set up relationships between tables
- Configure data validation rules

![Schema Editor](/screenshots/schema-editor.png)

### Schema Configuration Format

```json
{
  "schema": {
    "users": {
      "columns": ["id", "name", "email", "signup_date", "state"],
      "description": "User account information",
      "primaryKey": "id",
      "relationships": {
        "orders": {
          "type": "one-to-many",
          "foreignKey": "user_id"
        }
      }
    },
    "products": {
      "columns": ["id", "name", "price", "category", "created_at"],
      "description": "Product catalog",
      "primaryKey": "id",
      "indexes": ["category", "created_at"]
    },
    "orders": {
      "columns": ["id", "user_id", "product_id", "quantity", "order_date"],
      "description": "Customer orders",
      "primaryKey": "id",
      "foreignKeys": {
        "user_id": "users.id",
        "product_id": "products.id"
      }
    }
  }
}
```

### Auto-Discovery

Enable schema auto-discovery to automatically detect:
- Available tables
- Column names and types
- Primary and foreign keys
- Indexes and constraints

```json
{
  "schemaDiscovery": {
    "enabled": true,
    "updateInterval": "24h",
    "excludeTables": ["system_logs", "temp_*"],
    "includeViews": false
  }
}
```

## Query Pattern Configuration

### Pattern Management

Manage query patterns through the settings interface:

![Pattern Management](/screenshots/pattern-management.png)

### Adding New Patterns

```json
{
  "query_patterns": [
    {
      "intent": "show_recent_orders",
      "template": "SELECT * FROM orders WHERE order_date >= DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY order_date DESC LIMIT 100",
      "description": "Show recent orders within specified days",
      "keywords": ["recent", "orders", "last", "days"],
      "examples": [
        "Show recent orders",
        "Orders from last 7 days",
        "Recent customer orders"
      ],
      "parameters": [
        {
          "name": "days",
          "type": "integer",
          "default": 7,
          "validation": {
            "min": 1,
            "max": 365
          }
        }
      ]
    }
  ]
}
```

### Pattern Validation

Each pattern undergoes validation:
- **SQL Syntax**: Template must be valid SQL
- **Parameter Binding**: Placeholders must match parameters
- **Safety Check**: No dangerous operations (DROP, DELETE, etc.)
- **Performance**: Queries must include appropriate limits

### Pattern Testing

Test patterns directly in the settings:
1. Enter a sample prompt
2. See which pattern matches
3. Review generated SQL
4. Validate parameter extraction

## Performance Settings

### Query Optimization

Configure query performance settings:

```json
{
  "performance": {
    "defaultLimit": 100,
    "maxLimit": 1000,
    "queryTimeout": 30000,
    "enableQueryCache": true,
    "cacheExpiration": 300
  }
}
```

**Settings Explained:**
- **Default Limit**: Automatic LIMIT clause for safety
- **Max Limit**: Maximum allowed LIMIT value
- **Query Timeout**: Maximum query execution time (ms)
- **Query Cache**: Cache frequently used query results
- **Cache Expiration**: Cache TTL in seconds

### Connection Pooling

Optimize database connections:

```json
{
  "connectionPool": {
    "min": 2,
    "max": 10,
    "idleTimeoutMillis": 30000,
    "acquireTimeoutMillis": 60000,
    "createTimeoutMillis": 30000,
    "destroyTimeoutMillis": 5000,
    "reapIntervalMillis": 1000
  }
}
```

## Security Settings

### Access Control

Configure security and access controls:

```json
{
  "security": {
    "enableRateLimit": true,
    "rateLimitWindow": 900000,
    "rateLimitMax": 100,
    "allowedOperations": ["SELECT"],
    "blockedKeywords": ["DROP", "DELETE", "UPDATE", "INSERT"],
    "requireHttps": true,
    "corsOrigins": ["http://localhost:5173"]
  }
}
```

### Query Safety

Safety features to prevent dangerous operations:

- **Operation Whitelist**: Only allow SELECT statements
- **Keyword Blacklist**: Block dangerous SQL keywords  
- **Automatic Limits**: Add LIMIT clauses to prevent large result sets
- **Timeout Protection**: Kill long-running queries
- **Input Sanitization**: Clean user input

### Audit Logging

Enable audit logging for compliance:

```json
{
  "audit": {
    "enabled": true,
    "logQueries": true,
    "logResults": false,
    "logLevel": "info",
    "retentionDays": 90,
    "destinations": ["file", "database"]
  }
}
```

## API Configuration

### Rate Limiting

Configure API rate limiting:

```json
{
  "rateLimit": {
    "windowMs": 900000,
    "max": 100,
    "message": "Too many requests, please try again later",
    "standardHeaders": true,
    "legacyHeaders": false
  }
}
```

### CORS Settings

Cross-Origin Resource Sharing configuration:

```json
{
  "cors": {
    "origin": ["http://localhost:5173", "https://your-domain.com"],
    "methods": ["GET", "POST"],
    "allowedHeaders": ["Content-Type", "Authorization"],
    "credentials": false
  }
}
```

## Logging Configuration

### Log Levels

Configure logging detail level:

- **error**: Only errors
- **warn**: Warnings and errors
- **info**: General information (default)
- **debug**: Detailed debugging information
- **trace**: Very detailed tracing

### Log Destinations

```json
{
  "logging": {
    "level": "info",
    "destinations": {
      "console": {
        "enabled": true,
        "colorize": true
      },
      "file": {
        "enabled": true,
        "filename": "query-builder.log",
        "maxSize": "10m",
        "maxFiles": 5
      },
      "database": {
        "enabled": false,
        "table": "application_logs"
      }
    }
  }
}
```

## Environment-Specific Settings

### Development Configuration

```json
{
  "environment": "development",
  "debug": true,
  "cors": {
    "origin": "*"
  },
  "logging": {
    "level": "debug"
  },
  "performance": {
    "enableQueryCache": false
  }
}
```

### Production Configuration

```json
{
  "environment": "production",
  "debug": false,
  "security": {
    "requireHttps": true,
    "enableRateLimit": true
  },
  "logging": {
    "level": "warn"
  },
  "performance": {
    "enableQueryCache": true,
    "cacheExpiration": 600
  }
}
```

## Configuration Management

### Environment Variables

Override settings with environment variables:

```bash
# Database settings
DATABASE_URL="mysql://user:pass@host:port/db"
DATABASE_CONNECTION_LIMIT=20

# Security settings
CORS_ORIGIN="https://your-domain.com"
RATE_LIMIT_MAX=200

# Performance settings
QUERY_DEFAULT_LIMIT=50
QUERY_TIMEOUT=60000

# Logging settings
LOG_LEVEL=info
LOG_TO_FILE=true
```

### Configuration Files

Settings can be loaded from:
- `config/default.json` - Default settings
- `config/development.json` - Development overrides
- `config/production.json` - Production overrides
- Environment variables - Runtime overrides

### Settings Validation

All settings undergo validation:
- **Type checking**: Ensure correct data types
- **Range validation**: Check numeric ranges
- **Format validation**: Validate URLs, connection strings
- **Dependency checking**: Ensure required settings are present

## Backup and Export

### Settings Export

Export your configuration:

```bash
# Export current settings
curl http://localhost:3001/api/settings > settings-backup.json

# Export schema only
curl http://localhost:3001/api/settings/schema > schema-backup.json
```

### Settings Import

Import previously exported settings:

```bash
# Import full settings
curl -X PUT http://localhost:3001/api/settings \
  -H "Content-Type: application/json" \
  -d @settings-backup.json

# Import schema only
curl -X PUT http://localhost:3001/api/settings/schema \
  -H "Content-Type: application/json" \
  -d @schema-backup.json
```

## Troubleshooting Settings

### Common Configuration Issues

**Database Connection Fails:**
- Check host and port accessibility
- Verify username and password
- Ensure database exists
- Check SSL requirements

**Pattern Matching Issues:**
- Verify pattern syntax
- Check keyword spelling
- Test with example prompts
- Review parameter extraction

**Performance Problems:**
- Increase connection pool size
- Enable query caching
- Optimize query patterns
- Add appropriate indexes

### Settings Validation Errors

When settings fail validation, check:
- Required fields are present
- Data types are correct
- Values are within allowed ranges
- Dependencies are satisfied

### Reset to Defaults

Reset settings to defaults:

```bash
# Reset all settings
curl -X POST http://localhost:3001/api/settings/reset

# Reset specific section
curl -X POST http://localhost:3001/api/settings/reset/database
```

This comprehensive settings guide helps you configure the AI Query Builder for your specific needs and environment.

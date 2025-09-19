# API Reference

This document provides comprehensive documentation for the AI Query Builder's REST API endpoints.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Response Format

All API responses follow a consistent JSON format:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2023-12-19T10:30:00.000Z"
}
```

For errors:
```json
{
  "success": false,
  "data": null,
  "error": "Error message",
  "suggestion": "Optional suggestion for fixing the error",
  "timestamp": "2023-12-19T10:30:00.000Z"
}
```

## Endpoints

### Health Check

Check the health status of the API and database connection.

```http
GET /api/health
```

#### Response

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2023-12-19T10:30:00.000Z",
  "version": "1.0.0"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | API status: `healthy`, `degraded`, or `unhealthy` |
| `database` | string | Database status: `connected`, `disconnected`, or `error` |
| `timestamp` | string | ISO timestamp of the health check |
| `version` | string | API version number |

---

### Generate Query

Convert natural language input into SQL query.

```http
POST /api/generate-query
```

#### Request Body

```json
{
  "prompt": "Show me all users from California"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Natural language description of the desired query |

#### Response

```json
{
  "sql": "SELECT id, name, email FROM users WHERE state = 'California' ORDER BY name LIMIT 100",
  "confidence": 0.85,
  "matchedPattern": {
    "intent": "show_users_by_state",
    "description": "Show users filtered by state",
    "keywords": ["users", "from", "state"]
  },
  "extractedValues": ["California"],
  "metadata": {
    "processingTime": "45ms",
    "patternMatches": 3
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `sql` | string | Generated SQL query |
| `confidence` | number | Confidence score (0.0 to 1.0) |
| `matchedPattern` | object | Information about the matched pattern |
| `extractedValues` | array | Values extracted from the input |
| `metadata` | object | Additional processing information |

#### Error Responses

**400 Bad Request** - Invalid or missing prompt
```json
{
  "error": "Prompt is required and cannot be empty",
  "suggestion": "Please provide a descriptive prompt like 'Show all users'"
}
```

**404 Not Found** - No matching pattern found
```json
{
  "error": "No matching pattern found for the given prompt",
  "suggestion": "Try rephrasing your query or use one of the example patterns",
  "availablePatterns": [
    {
      "intent": "show_all_users",
      "examples": ["Show all users", "Get all user records"]
    }
  ]
}
```

---

### Validate Query

Validate SQL syntax and execute query safely to preview results.

```http
POST /api/validate-query
```

#### Request Body

```json
{
  "query": "SELECT * FROM users WHERE state = 'California'"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | SQL query to validate and execute |

#### Response

```json
{
  "isValid": true,
  "data": [
    {
      "id": 1,
      "name": "John Smith",
      "email": "john@example.com",
      "state": "California"
    },
    {
      "id": 2,
      "name": "Sarah Johnson", 
      "email": "sarah@example.com",
      "state": "California"
    }
  ],
  "rowCount": 47,
  "executionTime": "12ms",
  "limited": true,
  "metadata": {
    "originalQuery": "SELECT * FROM users WHERE state = 'California'",
    "executedQuery": "SELECT * FROM users WHERE state = 'California' LIMIT 20"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `isValid` | boolean | Whether the query is syntactically valid |
| `data` | array | Query results (limited to first 20 rows) |
| `rowCount` | number | Total number of rows that would be returned |
| `executionTime` | string | Query execution time |
| `limited` | boolean | Whether results were limited for safety |
| `metadata` | object | Additional execution information |

#### Error Responses

**400 Bad Request** - Invalid SQL syntax
```json
{
  "isValid": false,
  "error": "You have an error in your SQL syntax near 'SELCT' at line 1",
  "suggestion": "Check your SQL syntax. Did you mean 'SELECT'?"
}
```

**403 Forbidden** - Unsafe query operation
```json
{
  "isValid": false,
  "error": "DROP statements are not allowed",
  "suggestion": "Only SELECT statements are permitted for safety"
}
```

---

### Get Patterns

Retrieve available query patterns and database schema.

```http
GET /api/patterns
```

#### Response

```json
{
  "patterns": [
    {
      "intent": "show_all_users",
      "description": "Show all users in the system",
      "keywords": ["users", "all", "show"],
      "examples": [
        "Show all users",
        "Get all user records",
        "List all users"
      ]
    },
    {
      "intent": "show_users_by_state",
      "description": "Show users filtered by state",
      "keywords": ["users", "from", "state"],
      "examples": [
        "Show users from California",
        "Users in Texas",
        "Get users from New York"
      ]
    }
  ],
  "schema": {
    "users": {
      "columns": ["id", "name", "email", "signup_date", "state"],
      "description": "User account information"
    },
    "products": {
      "columns": ["id", "name", "price", "category", "created_at"],
      "description": "Product catalog"
    },
    "orders": {
      "columns": ["id", "user_id", "product_id", "quantity", "order_date"],
      "description": "Customer orders"
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `patterns` | array | Available query patterns |
| `schema` | object | Database schema information |

---

### Database Management

#### Get Database Status

```http
GET /api/database/status
```

#### Response

```json
{
  "connected": true,
  "database": "query_builder",
  "host": "localhost",
  "port": 3306,
  "tables": ["users", "products", "orders"],
  "connectionPool": {
    "active": 2,
    "idle": 8,
    "total": 10
  }
}
```

#### Test Database Connection

```http
POST /api/database/test
```

#### Response

```json
{
  "success": true,
  "latency": "5ms",
  "timestamp": "2023-12-19T10:30:00.000Z"
}
```

---

### Settings Management

#### Get Current Settings

```http
GET /api/settings
```

#### Response

```json
{
  "database": {
    "host": "localhost",
    "port": 3306,
    "database": "query_builder"
  },
  "query": {
    "defaultLimit": 100,
    "maxLimit": 1000,
    "timeoutMs": 5000
  },
  "features": {
    "aiIntegration": false,
    "queryHistory": true,
    "resultExport": true
  }
}
```

#### Update Settings

```http
PUT /api/settings
```

#### Request Body

```json
{
  "query": {
    "defaultLimit": 50,
    "maxLimit": 500
  }
}
```

---

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Request body is invalid or missing required fields |
| 404 | `NOT_FOUND` | Resource not found |
| 422 | `VALIDATION_ERROR` | Request validation failed |
| 500 | `INTERNAL_ERROR` | Internal server error |
| 503 | `SERVICE_UNAVAILABLE` | Database or external service unavailable |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Per IP**: 100 requests per minute
- **Per Endpoint**: Specific limits per endpoint type
- **Burst Allowance**: Short bursts of higher traffic allowed

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640781000
```

## CORS Configuration

The API supports Cross-Origin Resource Sharing (CORS) with the following configuration:

- **Allowed Origins**: `http://localhost:5173` (development)
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `Content-Type, Authorization`
- **Credentials**: Not supported

## Request/Response Examples

### Complete Query Generation Flow

#### 1. Generate Query

```bash
curl -X POST http://localhost:3001/api/generate-query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Show me all users from California"}'
```

#### 2. Validate and Preview

```bash
curl -X POST http://localhost:3001/api/validate-query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users WHERE state = '\''California'\'' LIMIT 100"}'
```

### Error Handling Example

```bash
curl -X POST http://localhost:3001/api/generate-query \
  -H "Content-Type: application/json" \
  -d '{"prompt": ""}'

# Response:
{
  "error": "Prompt is required and cannot be empty",
  "suggestion": "Please provide a descriptive prompt like 'Show all users'",
  "timestamp": "2023-12-19T10:30:00.000Z"
}
```

## SDKs and Client Libraries

### JavaScript/TypeScript Client

```typescript
import axios from 'axios';

class QueryBuilderClient {
  private baseURL = 'http://localhost:3001/api';

  async generateQuery(prompt: string) {
    const response = await axios.post(`${this.baseURL}/generate-query`, {
      prompt
    });
    return response.data;
  }

  async validateQuery(query: string) {
    const response = await axios.post(`${this.baseURL}/validate-query`, {
      query
    });
    return response.data;
  }

  async getPatterns() {
    const response = await axios.get(`${this.baseURL}/patterns`);
    return response.data;
  }
}
```

### Python Client

```python
import requests

class QueryBuilderClient:
    def __init__(self, base_url="http://localhost:3001/api"):
        self.base_url = base_url
    
    def generate_query(self, prompt):
        response = requests.post(
            f"{self.base_url}/generate-query",
            json={"prompt": prompt}
        )
        return response.json()
    
    def validate_query(self, query):
        response = requests.post(
            f"{self.base_url}/validate-query", 
            json={"query": query}
        )
        return response.json()
```

## Webhooks (Future Feature)

The API will support webhooks for real-time notifications:

```http
POST /api/webhooks
```

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["query.generated", "query.validated"],
  "secret": "your-secret-key"
}
```

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
GET /api/docs/openapi.json
```

Interactive API documentation is available at:

```
http://localhost:3001/api/docs
```

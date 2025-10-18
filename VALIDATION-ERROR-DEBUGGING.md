# Validation Error Debugging Guide

## Improved Error Logging

The validation middleware now provides detailed error messages to help debug issues in production/sandbox environments.

## What Changed

### Before (Unhelpful):
```
validateSql error [...]
Response: { error: "Required" }
```

### After (Detailed):
```
validateSql - Request body: {"sql":"SELECT * FROM film"}
✅ validateSql passed: {"sql":"SELECT * FROM film"}
```

Or if it fails:
```
validateSql - Request body: {"query":"SELECT * FROM film"}
❌ validateSql validation failed: {
  errors: [
    { field: 'sql', message: 'Required', received: 'undefined' }
  ],
  receivedBody: { query: 'SELECT * FROM film' }
}
Response: { 
  error: "Validation failed: sql - Required (received: undefined)",
  details: [...]
}
```

## Common Validation Issues

### 1. Wrong Field Name
**Problem:** Frontend sends `{ query: "..." }` but backend expects `{ sql: "..." }`

**Solution:** Check frontend code - should send:
```typescript
axios.post('/api/validate-query', { sql: sqlQuery })
```

### 2. Missing API_BASE_URL in Production
**Problem:** Frontend uses relative paths (`/api/...`) in Docker but needs full URL in some deployments

**Solution:** Ensure `API_BASE_URL` is set correctly:
```typescript
// In App.tsx
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';
```

For sandbox/production with different URLs:
```typescript
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:3001' 
  : (import.meta.env.VITE_API_URL || '');
```

### 3. Empty Request Body
**Problem:** Request body is `{}` or `null`

**Logs will show:**
```
validateSql - Request body: {}
❌ validateSql validation failed: {
  errors: [{ field: 'sql', message: 'Required', received: 'undefined' }]
}
```

**Common causes:**
- CORS issues blocking request
- Nginx not proxying POST body correctly
- Frontend not sending body at all

### 4. Type Mismatch
**Problem:** Sending wrong data type

**Logs will show:**
```
validateGenerateQuery - Request body: {"prompt":123}
❌ validateGenerateQuery validation failed: {
  errors: [{ 
    field: 'prompt', 
    message: 'Expected string, received number',
    received: 'number'
  }]
}
```

## How to Debug in Production

### 1. Check Backend Logs
```bash
# Docker
docker-compose logs -f backend | grep -E "validate|❌|✅"

# Or just backend
docker logs -f query-builder-backend
```

### 2. Check Browser Console
Look for the detailed error response:
```javascript
{
  error: "Validation failed: sql - Required (received: undefined)",
  details: [{ field: 'sql', message: 'Required', received: 'undefined' }]
}
```

### 3. Check Network Tab
- Look at the request payload in "Payload" or "Request" tab
- Verify Content-Type is `application/json`
- Check if body is actually being sent

### 4. Common Fixes

**If logs show empty body `{}`:**
```bash
# Check nginx config for POST body proxying
# In nginx.conf, ensure:
proxy_pass http://backend:3001;
proxy_set_header Content-Type application/json;
```

**If logs show wrong field names:**
```bash
# Update frontend to match backend schema
# Backend expects: { sql: "...", execute: true }
# Check all axios.post calls
```

**If logs aren't showing up:**
```bash
# Ensure logging middleware is before route handlers
# In index.ts:
app.use(express.json());  // Must be before routes
app.use('/api', validationRoutes);
```

## Expected Schemas

### Generate Query Request
```typescript
{
  prompt: string,      // Required, 1-500 chars
  useAI?: boolean      // Optional, defaults to true
}
```

### Validate Query Request
```typescript
{
  sql: string,         // Required, min 1 char
  execute?: boolean    // Optional, defaults to false
}
```

## Testing Locally

To test the same request that's failing in production:

```bash
# Generate query
curl -X POST http://localhost:3001/api/generate-query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"show all films"}'

# Validate query
curl -X POST http://localhost:3001/api/validate-query \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM film LIMIT 10"}'
```

## Deployment Checklist

Before deploying, verify:

- [ ] Backend logs show detailed validation info
- [ ] Frontend uses correct field names (`sql` not `query`)
- [ ] API_BASE_URL is configured correctly for environment
- [ ] Nginx proxies POST bodies correctly
- [ ] CORS allows requests from frontend domain
- [ ] Content-Type headers are preserved through proxy

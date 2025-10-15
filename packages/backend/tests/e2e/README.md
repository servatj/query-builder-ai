# E2E Tests for Query Builder Backend

## Overview

Comprehensive end-to-end tests for the Query Builder API backend.

## Test Suites

### 1. API E2E Tests (`api.e2e.test.ts`)
- Health check endpoint
- Root endpoint information
- Patterns and schema discovery
- Query generation
- Query validation and execution
- Database management
- Settings management
- Error handling
- CORS functionality

### 2. Database Integration Tests (`database.e2e.test.ts`)
- Sakila database queries (actors, films, customers)
- JOIN operations
- Aggregate queries (COUNT, SUM, AVG)
- GROUP BY and ORDER BY
- WHERE conditions
- Schema discovery
- Foreign key relationships
- Query generation with real data
- Performance tests

### 3. AI Integration Tests (`ai.e2e.test.ts`)
- AI query generation
- Natural language understanding
- Pattern matching
- AI provider configuration
- Confidence scoring
- Complex query generation
- Error handling

### 4. Security Tests (`security.e2e.test.ts`)
- SQL injection prevention
- DML operation blocking
- Input validation
- XSS prevention
- Rate limiting
- CORS security
- Authentication/Authorization
- Sensitive data exposure
- Query timeout protection

## Prerequisites

1. **Backend server running**:
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Database infrastructure**:
   ```bash
   # macOS
   docker-compose -f docker-compose.infra.mac.yml up -d
   
   # Linux
   docker-compose -f docker-compose.infra.linux.yml up -d
   ```

3. **Environment variables** (optional):
   ```bash
   export API_BASE_URL=http://localhost:3001
   export ANTHROPIC_API_KEY=your_key_here
   ```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run specific test suite
```bash
# API tests only
npm run test:e2e -- api.e2e.test.ts

# Database tests only
npm run test:e2e -- database.e2e.test.ts

# AI tests only
npm run test:e2e -- ai.e2e.test.ts

# Security tests only
npm run test:e2e -- security.e2e.test.ts
```

### Run with coverage
```bash
npm run test:e2e:coverage
```

### Watch mode
```bash
npm run test:e2e:watch
```

### Run in CI/CD
```bash
npm run test:e2e:ci
```

## Test Configuration

Tests can be configured via environment variables:

```bash
# API endpoint (default: http://localhost:3001)
API_BASE_URL=http://localhost:3001

# Test timeout (default: 30000ms)
VITEST_TEST_TIMEOUT=30000

# AI provider API keys (optional, for AI tests)
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```

## Test Structure

```
tests/e2e/
├── setup.ts              # Global test setup
├── api.e2e.test.ts       # API endpoint tests
├── database.e2e.test.ts  # Database integration tests
├── ai.e2e.test.ts        # AI integration tests
└── security.e2e.test.ts  # Security tests
```

## Writing New Tests

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('My Feature E2E', () => {
  it('should test feature', async () => {
    const response = await request(API_BASE_URL)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:9.4
        env:
          MYSQL_ROOT_PASSWORD: rootpassword
          MYSQL_DATABASE: sakila
        ports:
          - 3310:3306
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start backend
        run: npm run dev &
        working-directory: packages/backend
      
      - name: Wait for backend
        run: npx wait-on http://localhost:3001/api/health
      
      - name: Run E2E tests
        run: npm run test:e2e:ci
        working-directory: packages/backend
```

## Debugging Tests

### Enable verbose logging
```bash
DEBUG=* npm run test:e2e
```

### Run single test
```bash
npm run test:e2e -- -t "should return healthy status"
```

### Run with console output
```bash
npm run test:e2e -- --reporter=verbose
```

## Common Issues

### Backend not accessible
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Start backend if needed
npm run dev
```

### Database connection issues
```bash
# Check database containers
docker ps | grep mysql

# Restart databases
docker-compose -f docker-compose.infra.mac.yml restart
```

### Tests timeout
```bash
# Increase timeout in vitest.e2e.config.ts
testTimeout: 60000  # 60 seconds
```

## Test Coverage

View coverage report after running tests:

```bash
npm run test:e2e:coverage
open coverage/index.html
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up test data after tests
3. **Assertions**: Use specific assertions
4. **Timeouts**: Set appropriate timeouts for async operations
5. **Error handling**: Test both success and failure cases
6. **Documentation**: Document complex test scenarios

## Performance Benchmarks

Expected test execution times:
- API tests: ~10-15 seconds
- Database tests: ~20-30 seconds
- AI tests: ~15-25 seconds (depending on AI provider)
- Security tests: ~15-20 seconds
- **Total**: ~60-90 seconds

## Contributing

When adding new endpoints or features:

1. Add corresponding E2E tests
2. Ensure tests pass locally
3. Update this README if needed
4. Check test coverage remains >80%

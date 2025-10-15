# Backend E2E Testing Guide

## 📋 Overview

Comprehensive end-to-end test suite for the Query Builder backend API with over 100+ test cases covering:

✅ API endpoints functionality  
✅ Database integration & queries  
✅ AI-powered query generation  
✅ Security & validation  
✅ Performance & scalability  

## 🚀 Quick Start

### Run all E2E tests
```bash
# From project root
bash scripts/run-e2e-tests.sh

# Or from backend directory
cd packages/backend
npm run test:e2e
```

### Run specific test suite
```bash
bash scripts/run-e2e-tests.sh api        # API tests only
bash scripts/run-e2e-tests.sh database   # Database tests
bash scripts/run-e2e-tests.sh ai         # AI tests
bash scripts/run-e2e-tests.sh security   # Security tests
bash scripts/run-e2e-tests.sh coverage   # With coverage report
```

## 📦 Test Suites

### 1. API E2E Tests (30+ tests)
**File**: `tests/e2e/api.e2e.test.ts`

Tests all core API endpoints:
- ✅ Health check & status monitoring
- ✅ Root endpoint information
- ✅ Pattern matching & schema discovery
- ✅ Query generation from natural language
- ✅ Query validation & execution
- ✅ Database management & switching
- ✅ Settings management
- ✅ Error handling & edge cases
- ✅ CORS functionality

### 2. Database Integration Tests (25+ tests)
**File**: `tests/e2e/database.e2e.test.ts`

Real database operations with Sakila:
- ✅ SELECT queries (actors, films, customers)
- ✅ JOIN operations (multiple tables)
- ✅ Aggregate functions (COUNT, SUM, AVG)
- ✅ GROUP BY & ORDER BY
- ✅ WHERE conditions & filtering
- ✅ Schema discovery & introspection
- ✅ Foreign key relationship detection
- ✅ Query generation with real data
- ✅ Performance benchmarks

### 3. AI Integration Tests (20+ tests)
**File**: `tests/e2e/ai.e2e.test.ts`

AI-powered features:
- ✅ Natural language to SQL generation
- ✅ Pattern matching & intent recognition
- ✅ Confidence scoring
- ✅ AI provider configuration
- ✅ Complex query generation
- ✅ Multiple AI providers (Anthropic, OpenAI)
- ✅ Fallback when AI disabled
- ✅ Error handling

### 4. Security Tests (30+ tests)
**File**: `tests/e2e/security.e2e.test.ts`

Comprehensive security validation:
- ✅ SQL injection prevention
- ✅ DML operation blocking (INSERT, UPDATE, DELETE)
- ✅ DDL operation blocking (DROP, CREATE, ALTER)
- ✅ Input validation & sanitization
- ✅ XSS prevention
- ✅ CORS security
- ✅ Sensitive data protection
- ✅ Query timeout protection
- ✅ Rate limiting
- ✅ Error disclosure prevention

## 🛠️ Prerequisites

### 1. Database Infrastructure
Start MySQL containers:

**macOS:**
```bash
docker-compose -f docker-compose.infra.mac.yml up -d
```

**Linux:**
```bash
docker-compose -f docker-compose.infra.linux.yml up -d
```

Verify databases are running:
```bash
docker ps | grep -E "mysql|sakila"
```

### 2. Backend Server
Start the backend:

```bash
cd packages/backend
npm run dev
```

Verify backend is accessible:
```bash
curl http://localhost:3001/api/health
```

### 3. Environment Variables (Optional)
```bash
# API endpoint (default: http://localhost:3001)
export API_BASE_URL=http://localhost:3001

# AI provider keys (for AI tests)
export ANTHROPIC_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here
```

## 📊 Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Suite
```bash
npm run test:e2e -- api.e2e.test.ts
npm run test:e2e -- database.e2e.test.ts
npm run test:e2e -- ai.e2e.test.ts
npm run test:e2e -- security.e2e.test.ts
```

### With Coverage
```bash
npm run test:e2e:coverage

# View coverage report
open coverage/index.html
```

### Watch Mode (for development)
```bash
npm run test:e2e:watch
```

### CI/CD Mode
```bash
npm run test:e2e:ci
```

### Run All Tests (Unit + E2E)
```bash
npm run test:all
```

## 🎯 Test Examples

### Simple API Test
```typescript
it('should return healthy status', async () => {
  const response = await request(API_BASE_URL)
    .get('/api/health')
    .expect(200);

  expect(response.body).toHaveProperty('status', 'healthy');
  expect(response.body.database).toBe('connected');
});
```

### Database Query Test
```typescript
it('should query actors table', async () => {
  const response = await request(API_BASE_URL)
    .post('/api/validate-query')
    .send({
      sql: 'SELECT * FROM actor LIMIT 5',
      execute: true
    })
    .expect(200);

  expect(response.body.isValid).toBe(true);
  expect(response.body.results.length).toBeLessThanOrEqual(5);
});
```

### Security Test
```typescript
it('should block DROP TABLE', async () => {
  const response = await request(API_BASE_URL)
    .post('/api/validate-query')
    .send({
      sql: 'DROP TABLE actor',
      execute: true
    })
    .expect(400);

  expect(response.body.error).toMatch(/not allowed/i);
});
```

## 📈 Expected Results

### Test Coverage
- **Target**: > 80% code coverage
- **Current**: Check `coverage/index.html` after running tests

### Execution Time
- API tests: ~10-15 seconds
- Database tests: ~20-30 seconds
- AI tests: ~15-25 seconds
- Security tests: ~15-20 seconds
- **Total**: ~60-90 seconds

### Pass Rate
- **Expected**: 100% passing
- If tests fail, check:
  1. Backend is running
  2. Databases are accessible
  3. Environment variables are set

## 🔧 Troubleshooting

### Backend not accessible
```bash
# Check if running
curl http://localhost:3001/api/health

# Start backend
cd packages/backend && npm run dev
```

### Database connection errors
```bash
# Check containers
docker ps | grep mysql

# Restart databases
docker-compose -f docker-compose.infra.mac.yml restart

# Fix database config
bash scripts/fix-local-db-config.sh
```

### Tests timeout
Increase timeout in `vitest.e2e.config.ts`:
```typescript
testTimeout: 60000  // 60 seconds
```

### AI tests skipped
AI tests are skipped if:
- No API keys are configured
- AI provider is disabled

To enable:
```bash
export ANTHROPIC_API_KEY=your_key
# or
export OPENAI_API_KEY=your_key
```

### Port already in use
```bash
# Find process using port
lsof -i :3001

# Kill process or change port in .env
PORT=3002
```

## 🎨 Test Organization

```
packages/backend/tests/e2e/
├── README.md              # Detailed test documentation
├── setup.ts               # Global test setup/teardown
├── api.e2e.test.ts        # API endpoint tests
├── database.e2e.test.ts   # Database integration tests
├── ai.e2e.test.ts         # AI integration tests
└── security.e2e.test.ts   # Security validation tests
```

## 🚦 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:9.4
        env:
          MYSQL_ROOT_PASSWORD: rootpassword
        ports:
          - 3306:3306
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
        run: |
          cd packages/backend
          npm run dev &
          npx wait-on http://localhost:3001/api/health
      
      - name: Run E2E tests
        run: npm run test:e2e:ci
        working-directory: packages/backend
```

## 📝 Writing New Tests

1. **Create test file** in `tests/e2e/`
2. **Import dependencies**:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import request from 'supertest';
   ```
3. **Write tests**:
   ```typescript
   describe('My Feature', () => {
     it('should work', async () => {
       const response = await request(API_BASE_URL)
         .get('/api/my-endpoint')
         .expect(200);
       
       expect(response.body).toHaveProperty('data');
     });
   });
   ```

## 🏆 Best Practices

1. ✅ **Isolation**: Each test should be independent
2. ✅ **Cleanup**: Clean up test data after tests
3. ✅ **Assertions**: Use specific, meaningful assertions
4. ✅ **Timeouts**: Set appropriate timeouts
5. ✅ **Error cases**: Test both success and failure
6. ✅ **Documentation**: Document complex scenarios
7. ✅ **Performance**: Keep tests fast (<1s per test)
8. ✅ **Maintainability**: DRY principle, use helpers

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [E2E Testing Guide](https://martinfowler.com/articles/practical-test-pyramid.html)

## 🤝 Contributing

When adding new features:

1. Add corresponding E2E tests
2. Ensure all tests pass locally
3. Maintain >80% code coverage
4. Update documentation
5. Follow existing patterns

## 📄 License

MIT

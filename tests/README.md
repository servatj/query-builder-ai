# Testing Documentation

This directory contains comprehensive tests for the AI Query Builder project, following the standards defined in `CLAUDE.md`.

## 🏗️ Test Structure

```
tests/
├── CLAUDE.md                    # Testing rules and standards
├── README.md                    # This file
├── unit/                        # Unit tests (80% of our tests)
│   ├── backend/                 # Backend unit tests
│   │   ├── services/            # Service layer tests
│   │   ├── utils/               # Utility function tests
│   │   └── api/                 # API endpoint tests
│   └── frontend/                # Frontend unit tests
│       ├── components/          # React component tests
│       ├── hooks/               # Custom hook tests
│       └── utils/               # Frontend utility tests
├── integration/                 # Integration tests (20% of our tests)
│   ├── api/                     # API integration tests
│   └── database/                # Database integration tests
├── fixtures/                    # Test data and mocks
│   ├── users.fixture.ts         # User test data
│   ├── queries.fixture.ts       # Query test data
│   └── products.fixture.ts      # Product test data
├── helpers/                     # Test helper functions
│   └── test-utils.ts           # Utilities for testing
└── setup/                       # Test configuration
    └── jest.setup.ts           # Global test setup
```

## 🚀 Quick Start

### Run All Tests
```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with detailed output
npm test -- --verbose
```

### Run Specific Test Suites
```bash
# Run only backend tests
npm test -- --selectProjects backend

# Run only frontend tests  
npm test -- --selectProjects frontend

# Run specific test file
npm test QueryService.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should generate query"
```

### Debug Tests
```bash
# Run tests with debugging output
npm test -- --no-coverage --verbose

# Run a single test file with full output
npm test QueryBuilder.test.tsx -- --no-coverage --verbose

# Generate coverage report
npm test -- --coverage --coverageDirectory=coverage
```

## 📊 Coverage Reports

Test coverage reports are generated in the `coverage/` directory:

- **HTML Report**: Open `coverage/index.html` in your browser
- **LCOV Report**: For CI/CD integration (`coverage/lcov.info`)
- **Console Output**: Summary displayed after test runs

### Coverage Thresholds
- **Minimum**: 70% for all metrics (lines, branches, functions, statements)
- **Target**: 80%+ for critical paths (query generation, validation)
- **Goal**: 90%+ for service layer and core business logic

## 🧪 Test Categories

### Unit Tests (Isolated)
Focus on testing individual functions and components in isolation:

- **Backend Services**: Query generation, validation, OpenAI integration
- **Frontend Components**: User interactions, state management, API calls
- **Utilities**: Helper functions, validation, formatting
- **Fast Execution**: < 100ms per test

### Integration Tests (Connected) 
Test interactions between components:

- **API Endpoints**: Full HTTP request/response cycles
- **Database Operations**: Real database queries (with test data)
- **Service Integration**: Multiple services working together
- **Moderate Execution**: < 5 seconds per test

## 🔧 Available Test Utilities

### Backend Testing
```typescript
import { mockDbQuery, mockApiResponse } from '../helpers/test-utils'
import { userFixtures, queryFixtures } from '../fixtures'

// Mock database responses
const mockQuery = mockDbQuery(userFixtures.userList)

// Mock API responses
const response = mockApiResponse({ sql: 'SELECT * FROM users' })
```

### Frontend Testing
```typescript
import { render, screen, waitFor } from '../helpers/test-utils'
import userEvent from '@testing-library/user-event'

// Render components with providers
render(<QueryBuilder onSubmit={mockFn} />)

// Simulate user interactions
const user = userEvent.setup()
await user.type(screen.getByLabelText(/query/i), 'test input')
```

### Test Fixtures
```typescript
import { userFixtures, queryFixtures } from '../fixtures'

// Use pre-built test data
const testUser = userFixtures.validUser
const testQuery = queryFixtures.validPrompts.simple

// Create custom test data
const customUser = createMockUser({ name: 'Custom Name' })
```

## 🎯 Writing Good Tests

### Follow AAA Pattern
```typescript
it('should generate SQL for valid prompts', () => {
  // Arrange
  const prompt = 'Show me users from California'
  const expectedSQL = "SELECT * FROM users WHERE state = 'California'"

  // Act
  const result = generateQuery(prompt)

  // Assert
  expect(result.sql).toBe(expectedSQL)
  expect(result.confidence).toBeGreaterThan(0.5)
})
```

### Test Names Should Be Descriptive
```typescript
// ✅ Good - Describes behavior and conditions
it('should return high confidence when exact keywords match')
it('should throw validation error when prompt is empty')
it('should fallback to pattern matching when OpenAI fails')

// ❌ Bad - Vague or implementation-focused  
it('should work correctly')
it('test query generation')
it('validates the prompt variable')
```

### Test Behavior, Not Implementation
```typescript
// ✅ Good - Tests what the user experiences
expect(screen.getByText('Query is valid')).toBeInTheDocument()

// ❌ Bad - Tests internal implementation
expect(component.state.isValid).toBe(true)
```

## 🐛 Common Test Issues

### Async Operations
Always await async operations and use proper timeout handling:

```typescript
// ✅ Good
await waitFor(() => {
  expect(screen.getByText('Loading...')).not.toBeInTheDocument()
})

// ❌ Bad - Race condition possible
expect(screen.getByText('Data loaded')).toBeInTheDocument()
```

### Mock Management
Clean up mocks between tests:

```typescript
beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})
```

### Test Data Isolation
Use fresh test data for each test:

```typescript
// ✅ Good - Fresh data each time
const testUser = createMockUser({ id: 1 })

// ❌ Bad - Shared mutable state
const sharedUser = { id: 1, name: 'Test' }
```

## 📈 Performance Guidelines

### Test Execution Speed
- **Unit tests**: < 100ms each
- **Integration tests**: < 5s each
- **Total test suite**: < 30s

### Memory Usage
- Clean up resources in `afterEach`/`afterAll`
- Avoid memory leaks in long-running test suites
- Use `--detectOpenHandles` to find resource leaks

## 🔄 Continuous Integration

### Pre-commit Hooks
Tests run automatically before commits:
1. Linting and type checking
2. Unit tests
3. Coverage threshold check

### CI Pipeline
1. **Fast feedback**: Unit tests run first
2. **Integration tests**: Run on successful unit tests  
3. **Coverage reporting**: Automatic coverage updates
4. **Failure notifications**: Immediate feedback on broken tests

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest for API Testing](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🆘 Getting Help

If you encounter testing issues:

1. **Check the console output** for specific error messages
2. **Review CLAUDE.md** for testing standards and patterns
3. **Look at existing tests** for examples and patterns
4. **Run tests in isolation** to identify specific failures
5. **Check mock configurations** for proper setup

Remember: Good tests are documentation for your code's intended behavior! 📝
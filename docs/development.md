# Development Guide

This guide covers everything you need to know to contribute to the AI Query Builder project.

## Development Environment Setup

### Prerequisites

- **Node.js** v18+ and npm v8+
- **MySQL** 8.0+ (or Docker for containerized setup)
- **Git** for version control
- **VS Code** (recommended) with suggested extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Initial Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd query-builder
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Backend environment
   cd packages/backend
   cp .env.example .env
   
   # Edit .env with your database credentials
   DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"
   PORT=3001
   NODE_ENV=development
   LOG_LEVEL=debug
   ```

3. **Database Setup**
   ```bash
   # Using Docker (recommended)
   ./infra-manager.sh start
   
   # Or manually create databases
   mysql -u root -p -e "CREATE DATABASE query_builder;"
   mysql -u root -p -e "CREATE DATABASE query_builder_sbox;"
   ```

## Project Structure

### Monorepo Organization

```
query-builder/
├── packages/
│   ├── frontend/        # React application
│   └── backend/         # Node.js API server
├── infra/              # Infrastructure and database setup
├── docs/               # Documentation (this GitBook)
├── package.json        # Root workspace configuration
└── README.md          # Project overview
```

### Frontend Structure

```
packages/frontend/
├── src/
│   ├── components/     # React components
│   │   ├── ui/         # Reusable UI components (shadcn/ui)
│   │   ├── SchemaEditor.tsx
│   │   └── Settings.tsx
│   ├── lib/           # Utility functions
│   ├── App.tsx        # Main application
│   └── main.tsx       # Entry point
├── public/            # Static assets
├── tests/             # Test files
└── package.json       # Frontend dependencies
```

### Backend Structure

```
packages/backend/
├── src/
│   ├── controllers/   # Request handlers
│   ├── middleware/    # Express middleware
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── utils/         # Utility functions
│   ├── rules.json     # Query patterns
│   └── index.ts       # Server entry point
├── tests/             # Test files
└── package.json       # Backend dependencies
```

## Development Workflow

### Running the Development Environment

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:frontend  # http://localhost:5173
npm run dev:backend   # http://localhost:3001
```

### Development Scripts

```bash
# Root level scripts
npm run dev            # Start both services
npm run build          # Build both services
npm run test           # Run all tests
npm run lint           # Lint frontend code
npm run clean          # Clean all build artifacts

# Frontend specific
cd packages/frontend
npm run dev            # Development server
npm run build          # Production build
npm run preview        # Preview production build
npm run test           # Run tests
npm run test:watch     # Watch mode testing
npm run lint           # ESLint

# Backend specific  
cd packages/backend
npm run dev            # Development server with nodemon
npm run build          # TypeScript compilation
npm run start          # Production server
npm run test           # Run tests
npm run test:watch     # Watch mode testing
```

## Code Standards

### TypeScript Configuration

Both frontend and backend use strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### ESLint Configuration

Frontend uses ESLint with React and TypeScript rules:

```javascript
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.recommended,
  {
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  }
];
```

### Code Formatting

- **Prettier** for consistent code formatting
- **EditorConfig** for editor consistency
- **Git hooks** for pre-commit formatting

### Naming Conventions

- **Files**: kebab-case for components, camelCase for utilities
- **Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase with descriptive names

## Testing Strategy

### Frontend Testing

**Framework**: Vitest with React Testing Library

```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

**Test Commands**:
```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

### Backend Testing

**Framework**: Vitest with Supertest for API testing

```typescript
// API test example
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('POST /api/generate-query', () => {
  it('generates SQL from natural language', async () => {
    const response = await request(app)
      .post('/api/generate-query')
      .send({ prompt: 'Show all users' })
      .expect(200);
    
    expect(response.body.sql).toContain('SELECT');
    expect(response.body.confidence).toBeGreaterThan(0);
  });
});
```

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user workflows

## Database Development

### Schema Management

Database schema is managed through SQL files in `infra/mysql/init/`:

```sql
-- 02-query-builder-schema.sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  signup_date DATE,
  state VARCHAR(50)
);
```

### Migration Strategy

For schema changes:

1. Create new migration file with timestamp
2. Update `rules.json` if needed
3. Test with both existing and new schema
4. Document breaking changes

### Development Databases

- `query_builder` - Main development database
- `query_builder_sbox` - Sandbox for testing
- `sakila` - Demo database with sample data

## Adding New Features

### Query Pattern Development

1. **Define Pattern** in `rules.json`:
   ```json
   {
     "intent": "count_products_by_category",
     "template": "SELECT COUNT(*) as count FROM products WHERE category = '?'",
     "description": "Count products in a specific category",
     "keywords": ["count", "products", "category"],
     "examples": ["Count electronics products", "How many books do we have"]
   }
   ```

2. **Test Pattern**:
   ```bash
   curl -X POST http://localhost:3001/api/generate-query \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Count electronics products"}'
   ```

3. **Add Tests**:
   ```typescript
   it('generates count query for products by category', async () => {
     const response = await request(app)
       .post('/api/generate-query')
       .send({ prompt: 'Count electronics products' });
     
     expect(response.body.sql).toContain('COUNT(*)');
     expect(response.body.sql).toContain('category = \'electronics\'');
   });
   ```

### UI Component Development

1. **Create Component** using shadcn/ui patterns:
   ```typescript
   import { Button } from '@/components/ui/button';
   
   export function NewFeature() {
     return (
       <div className="space-y-4">
         <Button onClick={handleAction}>Action</Button>
       </div>
     );
   }
   ```

2. **Add Tests**:
   ```typescript
   import { render, screen } from '@testing-library/react';
   import NewFeature from './NewFeature';
   
   it('renders new feature component', () => {
     render(<NewFeature />);
     expect(screen.getByText('Action')).toBeInTheDocument();
   });
   ```

3. **Update Documentation**

## API Development

### Adding New Endpoints

1. **Create Route**:
   ```typescript
   // routes/newFeatureRoutes.ts
   import express from 'express';
   import { newFeatureController } from '../controllers/newFeatureController';
   
   const router = express.Router();
   router.post('/new-feature', newFeatureController);
   export default router;
   ```

2. **Create Controller**:
   ```typescript
   // controllers/newFeatureController.ts
   import { Request, Response } from 'express';
   
   export const newFeatureController = async (req: Request, res: Response) => {
     try {
       // Implementation
       res.json({ success: true, data: result });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   };
   ```

3. **Add Validation**:
   ```typescript
   // middleware/validation.ts
   export const validateNewFeature = (req: Request, res: Response, next: NextFunction) => {
     // Validation logic
     next();
   };
   ```

## Debugging

### Frontend Debugging

- **React DevTools** for component inspection
- **Browser DevTools** for network and console debugging
- **VS Code Debugger** with Chrome extension

### Backend Debugging

- **VS Code Debugger** with Node.js configuration
- **Console logging** with Winston
- **Database query logging**

### Debug Configuration

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/packages/backend/src/index.ts",
      "outFiles": ["${workspaceFolder}/packages/backend/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

## Performance Optimization

### Frontend Performance

- **Bundle Analysis**: `npm run build -- --analyze`
- **Lighthouse Audits**: Regular performance testing
- **Code Splitting**: Lazy load components
- **Memoization**: React.memo for expensive components

### Backend Performance

- **Query Optimization**: Use EXPLAIN for slow queries
- **Connection Pooling**: Monitor pool usage
- **Caching**: Redis for frequently accessed data
- **Profiling**: Node.js profiler for bottlenecks

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commits:

```
feat: add user authentication
fix: resolve SQL injection vulnerability
docs: update API documentation
refactor: improve query pattern matching
test: add integration tests for validation
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes and Test**
   ```bash
   npm run test
   npm run lint
   ```

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/new-feature
   ```

5. **PR Requirements**:
   - All tests passing
   - Code review approval
   - Documentation updated
   - No linting errors

## Troubleshooting

### Common Development Issues

**Port Already in Use**:
```bash
lsof -ti:3001 | xargs kill -9  # Kill backend
lsof -ti:5173 | xargs kill -9  # Kill frontend
```

**Database Connection Issues**:
```bash
# Check MySQL status
brew services list | grep mysql

# Restart MySQL
brew services restart mysql

# Test connection
mysql -u queryuser -p query_builder
```

**Node Modules Issues**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or use the clean script
npm run clean
npm install
```

**TypeScript Compilation Errors**:
```bash
# Clean TypeScript cache
rm -rf packages/*/dist
rm -rf packages/*/tsconfig.tsbuildinfo

# Rebuild
npm run build
```

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Wiki**: Additional documentation and guides
- **Code Reviews**: Learn from PR feedback

## Contributing Guidelines

### Before Contributing

1. Read this development guide
2. Check existing issues and PRs
3. Discuss major changes in an issue first
4. Follow the code standards and testing requirements

### Contribution Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

### Code Review Checklist

- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance impact considered
- [ ] Backward compatibility maintained

# Architecture Overview

This document provides a comprehensive overview of the AI Query Builder's architecture, design decisions, and technical implementation.

## System Architecture

The AI Query Builder follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│    Frontend     │◄──►│     Backend     │◄──►│    Database     │
│   (React SPA)   │    │  (Node.js API)  │    │    (MySQL)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### High-Level Components

1. **Frontend Application** - React-based single-page application
2. **Backend API** - RESTful API server built with Node.js and Express
3. **Database Layer** - MySQL database with connection pooling
4. **Query Engine** - Pattern matching and SQL generation logic

## Frontend Architecture

### Technology Stack

- **React 19** - Modern React with hooks and concurrent features
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible UI components
- **Axios** - HTTP client for API communication

### Component Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── textarea.tsx
│   │   └── alert.tsx
│   ├── SchemaEditor.tsx # Database schema management
│   └── Settings.tsx     # Application settings
├── lib/
│   └── utils.ts         # Utility functions
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
```

### State Management

The application uses React's built-in state management:

- **useState** - Local component state
- **useEffect** - Side effects and data fetching
- **Custom hooks** - Reusable stateful logic

Key state variables:
- `naturalLanguageQuery` - User input
- `sqlQuery` - Generated SQL
- `isValid` - Query validation status
- `previewData` - Query results
- `availablePatterns` - Loaded query patterns
- `schema` - Database schema information

### API Integration

The frontend communicates with the backend through RESTful APIs:

```typescript
// API endpoints
const API_BASE_URL = 'http://localhost:3001';

// Health check
GET /api/health

// Query generation
POST /api/generate-query
Body: { prompt: string }

// Query validation
POST /api/validate-query  
Body: { query: string }

// Pattern retrieval
GET /api/patterns
```

## Backend Architecture

### Technology Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type safety and modern JavaScript features
- **MySQL2** - MySQL database driver with promise support
- **Vitest** - Testing framework
- **Winston** - Logging library

### Project Structure

```
src/
├── controllers/         # Request handlers
│   ├── databaseController.ts
│   ├── healthController.ts
│   ├── queryController.ts
│   ├── settingsController.ts
│   └── validationController.ts
├── middleware/          # Express middleware
│   ├── errorHandler.ts
│   └── validation.ts
├── routes/              # Route definitions
│   ├── databaseRoutes.ts
│   ├── healthRoutes.ts
│   ├── queryRoutes.ts
│   ├── settingsRoutes.ts
│   └── validationRoutes.ts
├── services/            # Business logic
│   ├── databaseDestinationService.ts
│   ├── databaseSystemService.ts
│   ├── openaiService.ts
│   ├── pools.ts
│   └── rulesService.ts
├── utils/               # Utility functions
│   ├── errorHandler.ts
│   ├── logger.ts
│   └── validators.ts
├── rules.json           # Query pattern definitions
└── index.ts             # Application entry point
```

### Request Flow

1. **Route Handler** - Receives HTTP request
2. **Middleware** - Validates request, handles CORS
3. **Controller** - Processes business logic
4. **Service Layer** - Handles data operations
5. **Database Layer** - Executes queries
6. **Response** - Returns JSON response

### Error Handling

The application implements comprehensive error handling:

```typescript
// Global error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

## Database Architecture

### Schema Design

The application supports flexible database schemas through configuration:

```sql
-- Example schema tables
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  email VARCHAR(255),
  signup_date DATE,
  state VARCHAR(50)
);

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  price DECIMAL(10,2),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  product_id INT,
  quantity INT,
  order_date DATE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Connection Management

- **Connection Pooling** - Efficient database connections
- **Environment-based Configuration** - Different databases for dev/prod
- **Health Monitoring** - Connection status tracking

```typescript
// Database pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

## Query Generation Engine

### Pattern Matching System

The core of the application is the pattern matching system defined in `rules.json`:

```json
{
  "schema": {
    "users": {
      "columns": ["id", "name", "email", "state"],
      "description": "User account information"
    }
  },
  "query_patterns": [
    {
      "intent": "show_users_by_state",
      "template": "SELECT * FROM users WHERE state = '?' ORDER BY name",
      "description": "Show users filtered by state",
      "keywords": ["users", "from", "state"],
      "examples": ["Show users from California", "Users in Texas"]
    }
  ]
}
```

### Generation Algorithm

1. **Input Processing** - Tokenize and normalize user input
2. **Pattern Matching** - Score patterns against input keywords
3. **Parameter Extraction** - Extract values for template placeholders
4. **SQL Generation** - Replace placeholders with extracted values
5. **Safety Checks** - Add LIMIT clauses and validate syntax

### Confidence Scoring

The system calculates confidence based on:
- Keyword match percentage
- Pattern specificity
- Parameter extraction success
- Template complexity

## Security Considerations

### SQL Injection Prevention

- **Parameterized Queries** - All user input is parameterized
- **Template System** - Pre-defined query templates
- **Input Validation** - Strict validation of user input
- **Query Limits** - Automatic LIMIT clauses for safety

### Access Control

- **CORS Configuration** - Controlled cross-origin access
- **Input Sanitization** - Clean user input
- **Error Message Sanitization** - No sensitive data in errors

### Database Security

- **Connection Encryption** - SSL/TLS for database connections
- **User Permissions** - Limited database user permissions
- **Environment Variables** - Secure credential storage

## Performance Optimizations

### Frontend Performance

- **Code Splitting** - Lazy loading of components
- **Bundle Optimization** - Tree shaking and minification
- **Caching** - Browser caching for static assets
- **Debounced Input** - Reduce API calls during typing

### Backend Performance

- **Connection Pooling** - Efficient database connections
- **Query Optimization** - Indexed database queries
- **Response Compression** - Gzip compression
- **Logging Optimization** - Structured logging with levels

### Database Performance

- **Indexing Strategy** - Proper indexes on query columns
- **Query Limits** - Automatic result limiting
- **Connection Management** - Pool size optimization

## Monitoring and Logging

### Application Logging

```typescript
// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});
```

### Health Monitoring

- **Health Endpoints** - `/api/health` for system status
- **Database Connectivity** - Connection status monitoring
- **Error Tracking** - Comprehensive error logging

## Deployment Architecture

### Development Environment

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   localhost:5173│    │ localhost:3001  │    │ localhost:3306  │
│   (Vite Dev)    │    │  (nodemon)      │    │   (Docker)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Production Environment

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Static CDN)  │    │  (PM2/Docker)   │    │  (Cloud RDS)    │
│   nginx/Apache  │    │   Load Balancer │    │   Multi-AZ      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Testing Strategy

### Frontend Testing

- **Unit Tests** - Component testing with Vitest
- **Integration Tests** - API integration testing
- **E2E Tests** - User workflow testing

### Backend Testing

- **Unit Tests** - Service and utility function tests
- **Integration Tests** - Database and API tests
- **Load Tests** - Performance testing

### Testing Coverage

The project maintains high test coverage:
- Controllers: Unit and integration tests
- Services: Business logic testing
- Utilities: Function-level testing
- API Endpoints: Request/response testing

## Future Architecture Considerations

### Scalability Improvements

- **Microservices** - Break down monolithic backend
- **Caching Layer** - Redis for query result caching
- **Queue System** - Background job processing
- **CDN Integration** - Global content delivery

### Feature Enhancements

- **AI Integration** - OpenAI API for advanced NLP
- **Multi-Database Support** - PostgreSQL, SQLite support
- **Real-time Updates** - WebSocket connections
- **Authentication** - User management system

### Infrastructure Improvements

- **Container Orchestration** - Kubernetes deployment
- **Monitoring Stack** - Prometheus, Grafana
- **CI/CD Pipeline** - Automated testing and deployment
- **Security Scanning** - Automated vulnerability assessment

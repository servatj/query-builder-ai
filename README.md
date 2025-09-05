# AI Query Builder 🚀

A modern full-stack application that converts natural language prompts into validated SQL queries. Built with React, TypeScript, Tailwind CSS, shadcn/ui, and Node.js in a monorepo structure.

## ✨ Features

- **Natural Language to SQL**: Convert plain English descriptions into SQL queries
- **Real-time Validation**: Validate SQL syntax and show immediate feedback
- **Data Preview**: Execute queries safely with automatic LIMIT clauses and preview results
- **Modern UI**: Beautiful, responsive interface built with shadcn/ui and Tailwind CSS
- **Type Safety**: Full TypeScript support across frontend and backend
- **Pattern Matching**: Intelligent query generation using configurable rules and patterns

## 📁 Monorepo Structure

```
query-builder/
├── packages/
│   ├── frontend/          # React + Vite + TypeScript + Tailwind + shadcn/ui
│   └── backend/           # Node.js + Express + TypeScript + MySQL
├── package.json           # Root workspace configuration
└── README.md
```

## 🛠 Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- shadcn/ui for beautiful UI components
- Axios for API communication

**Backend:**
- Node.js with Express
- TypeScript for type safety
- MySQL2 for database connectivity
- Jest for testing
- Configurable query patterns in JSON

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- MySQL database (local or remote)

### Installation

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd query-builder
   npm install
   ```

2. **Set up the database:**
   Create a MySQL database and note the connection details

3. **Configure environment:**
   ```bash
   # Backend configuration
   cd packages/backend
   cp .env.example .env
   # Edit .env with your database connection
   ```

4. **Start the application:**
   ```bash
   # Terminal 1 - Backend
   cd packages/backend
   npm run dev

   # Terminal 2 - Frontend  
   cd packages/frontend
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173` to use the application

## 📖 Usage Guide

### Basic Workflow

1. **Enter Natural Language**: Type your query in plain English
   - "Show me all users from California"
   - "Count products in electronics category"
   - "Get all recent orders"

2. **Generate SQL**: Click "Generate SQL Query" to convert your prompt

3. **Validate & Preview**: Click "Validate & Preview Query" to:
   - Check SQL syntax
   - Execute safely with limits
   - Preview the results

### Example Queries

The system recognizes these patterns:

```
"Show me users from Texas"
→ SELECT id, name, email FROM users WHERE state = 'Texas'

"Count products in electronics"  
→ SELECT COUNT(*) as product_count FROM products WHERE category = 'electronics'

"Get all products"
→ SELECT * FROM products ORDER BY created_at DESC LIMIT 100
```

## 🔧 Development

### Project Scripts

```bash
# Install dependencies for all packages
npm install

# Run tests
cd packages/backend && npm test

# Build for production
cd packages/frontend && npm run build
cd packages/backend && npm run build

# Lint code
cd packages/frontend && npm run lint
```

### Database Schema

The application expects these tables:

```sql
-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  email VARCHAR(255),
  signup_date DATE,
  state VARCHAR(50)
);

-- Products table
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  price DECIMAL(10,2),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table  
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

### Adding New Query Patterns

Edit `packages/backend/src/rules.json` to add new patterns:

```json
{
  "intent": "your_new_intent",
  "template": "SELECT * FROM table WHERE column = '?'",
  "description": "Description of what this does",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}
```

## 🚀 Deployment

### Backend Deployment
```bash
cd packages/backend
npm run build
npm start
```

### Frontend Deployment
```bash
cd packages/frontend
npm run build
# Deploy the dist/ folder to your static hosting service
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test them
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🔮 Future Enhancements

- [ ] OpenAI/GPT integration for better natural language processing
- [ ] Support for more SQL features (JOINs, subqueries, etc.)
- [ ] Query history and favorites
- [ ] Database schema introspection
- [ ] Export results to CSV/JSON
- [ ] Multi-database support (PostgreSQL, SQLite)
- [ ] Query performance analysis
- [ ] User authentication and query sharing

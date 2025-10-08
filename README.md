<img width="1280" height="875" alt="image" src="https://github.com/user-attachments/assets/3584ec79-2044-4557-9fb1-50c3b55bf9c0" />


A modern full-stack application that converts natural language prompts into validated SQL queries. Built with React, TypeScript, Tailwind CSS, shadcn/ui, and Node.js in a monorepo structure.

## ✨ Features

- **Natural Language to SQL**: Convert plain English descriptions into SQL queries
- **Real-time Validation**: Validate SQL syntax and show immediate feedback
- **Data Preview**: Execute queries safely with automatic LIMIT clauses and preview results
- **Sandbox Mode**: Read-only mode that disables configuration editing for secure demonstrations
- **Modern UI**: Beautiful, responsive interface built with shadcn/ui and Tailwind CSS
- **Type Safety**: Full TypeScript support across frontend and backend
- **Pattern Matching**: Intelligent query generation using configurable rules and patterns

## 📚 Documentation

**📖 [Complete Documentation](https://joseps-personal-organization.gitbook.io/query-builder-ai/)**

Visit our comprehensive GitBook documentation for:
- **[Getting Started](https://joseps-personal-organization.gitbook.io/query-builder-ai/getting-started/installation-and-setup)** - Installation and setup guide
- **[User Guide](https://joseps-personal-organization.gitbook.io/query-builder-ai/user-guide/using-the-query-builder)** - How to use the application effectively
- **[API Reference](https://joseps-personal-organization.gitbook.io/query-builder-ai/technical-documentation/api-reference)** - Backend API documentation
- **[Architecture](https://joseps-personal-organization.gitbook.io/query-builder-ai/technical-documentation/architecture-overview)** - Technical architecture and design decisions
- **[Development](https://joseps-personal-organization.gitbook.io/query-builder-ai/development/development-setup)** - Development setup and contribution guide
- **[Deployment](https://joseps-personal-organization.gitbook.io/query-builder-ai/deployment/production-deployment)** - Production deployment instructions

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
- Vitest for testing
- Configurable query patterns in JSON

## 🚀 Quick Start

### Option 1: Docker (Recommended) 🐳

The easiest way to get started! Everything runs in containers - no need to install Node.js or MySQL locally.

#### Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- At least one AI API key (Anthropic or OpenAI)

#### Interactive Setup (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd query-builder

# 2. Run the interactive startup script
./docker-start.sh
```

**The script will:**
- ✅ Check if Docker is running
- ✅ Create `.env` file if needed
- ✅ Prompt you to add your API key(s)
- ✅ Let you choose your mode:
  - **Option 1**: Production (Port 80) - Optimized build
  - **Option 2**: Development (Port 5173) - Hot reload enabled
  - **Option 3**: Sandbox (Port 80) - Pre-configured with Sakila demo database
- ✅ Build and start all services
- ✅ Show you the URLs to access

#### Quick Commands

```bash
# Start in Production mode
./docker-start.sh
# Select option 1

# Start in Sandbox mode (with Sakila demo data)
./docker-start.sh
# Select option 3

# Stop all services
docker-compose -f docker-compose.sandbox.yml down  # For sandbox
docker-compose down  # For production
```

#### Access URLs

| Mode | Frontend | Backend | Settings DB | Sakila Demo |
|------|----------|---------|-------------|-------------|
| **Production** | http://localhost | http://localhost:3001 | localhost:3306 | localhost:3310 |
| **Development** | http://localhost:5173 | http://localhost:3001 | localhost:3306 | - |
| **Sandbox** | http://localhost | http://localhost:3001 | localhost:3306 | localhost:3310 |

#### 🎮 Try the Sandbox Mode

Perfect for demos and testing! Includes:
- ✅ Pre-configured Sakila demo database (movie rental data)
- ✅ Ready-to-use example queries
- ✅ Full schema with films, actors, categories, etc.
- ✅ No configuration needed

```bash
./docker-start.sh
# Select option 3 for Sandbox
```

Then try queries like:
- "Show all films"
- "Action films"
- "Films rated PG"
- "Comedy movies"

📖 **For detailed Docker instructions, troubleshooting, and advanced configuration, see:**
- [DOCKER.md](./DOCKER.md) - Complete Docker documentation
- [SANDBOX.md](./SANDBOX.md) - Sandbox mode guide
- [QUICK-START.md](./QUICK-START.md) - Quick reference

---

### Option 2: Local Development (Manual Setup)

For development without Docker:

#### Prerequisites
- Node.js (v18 or higher)
- npm (v8 or higher)
- MySQL database (local or remote)

#### Installation

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd query-builder
   npm install
   ```

2. **Set up the database:**
   ```bash
   # Start the database infrastructure (Docker required)
   ./infra-manager.sh start
   
   # This will start two MySQL containers:
   # Port 3306: query_builder (production) + query_builder_sbox (sandbox)
   # Port 3310: sakila (demo/showcase database)
   # User: queryuser, Password: querypass
   ```

3. **Configure environment:**
   ```bash
   # Backend configuration
   cd packages/backend
   cp .env.example .env
   
   # Add this line to your .env file:
   # DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"
   
   # Optional: Enable sandbox mode for read-only demonstrations
   # SANDBOX_MODE=true
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

> **💡 For detailed setup instructions, troubleshooting, and advanced configuration, see our [Getting Started Guide](https://joseps-personal-organization.gitbook.io/query-builder-ai/getting-started/installation-and-setup).**

## 📖 Usage Guide

### 🏠 Landing Page

A professional landing page is included in the `landing/` directory.

**Start the landing page:**
```bash
cd landing
python3 -m http.server 8080
```

Then open: **http://localhost:8080**

The landing page includes:
- Beautiful hero section with call-to-action
- Feature highlights
- Links to sandbox, documentation, and GitHub
- Fully responsive design

**Customize:** Edit `landing/index.html` to update links and content.

---

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

## 🔒 Sandbox Mode

Sandbox mode provides a secure, read-only environment perfect for demonstrations, training, or restricted access scenarios. When enabled, users can build and execute queries but cannot modify system configurations.

### Features

- **Read-Only Configuration**: All settings pages become view-only
- **Disabled Editing**: Configuration forms, save buttons, and modification controls are disabled  
- **Visual Indicators**: Clear warning banner indicates sandbox mode is active
- **Query Building**: Full query building and execution functionality remains available
- **Safe Demonstrations**: Perfect for public demos, training sessions, or untrusted environments

### Enabling Sandbox Mode

1. **Edit Environment Configuration:**
   ```bash
   cd packages/backend
   # Set SANDBOX_MODE=true in your .env file
   echo "SANDBOX_MODE=true" >> .env
   ```

2. **Restart the Backend:**
   ```bash
   npm run dev  # or npm start for production
   ```

3. **Verify Activation:**
   - Navigate to the Settings page
   - Look for the amber "Sandbox Mode Active" banner
   - Confirm that all editing controls are disabled

### What's Disabled in Sandbox Mode

- ❌ Database configuration editing
- ❌ Query rules and patterns modification  
- ❌ AI settings configuration
- ❌ Database switching
- ❌ Schema updates
- ❌ Settings import/export

### What's Still Available

- ✅ Natural language query building
- ✅ SQL query generation and validation
- ✅ Data preview and execution
- ✅ Database schema viewing
- ✅ Query history and audit trail
- ✅ All read-only functionality

### Testing Sandbox Mode

Use the included test script to verify sandbox functionality:

```bash
# With backend running in sandbox mode
cd query-builder
node test-sandbox.js
```

This script tests that configuration modification endpoints properly return sandbox mode errors.

### Production Use Cases

- **Public Demonstrations**: Allow users to explore functionality without configuration risks
- **Training Environments**: Provide hands-on experience while protecting system settings
- **Shared Access**: Enable multiple users to practice query building safely
- **Customer Previews**: Let prospects explore the application without security concerns

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

### Database Configuration

The infrastructure provides three databases across two MySQL containers:

```bash
# Production database (default) - Port 3306
DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"

# Sandbox database for testing - Port 3306
DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder_sbox"

# Demo database (Sakila DVD rental store) - Port 3310
DATABASE_URL="mysql://queryuser:querypass@localhost:3310/sakila"
```

**Use Cases:**
- `query_builder` (3306) - Main application database
- `query_builder_sbox` (3306) - Safe testing environment
- `sakila` (3310) - Rich demo data for showcasing natural language queries

### rules.json format

Use this structure to define the database schema reference and the natural-language-to-SQL patterns:

```json
{
  "schema": {
    "table_name_here": {
      "columns": ["column_one", "column_two", "column_three"],
      "description": "Short description of what this table stores."
    }
  },
  "query_patterns": [
    {
      "intent": "unique_intent_key",
      "template": "SELECT col1, col2 FROM table_name_here WHERE some_field = '?'",
      "description": "What this query returns and the filter logic.",
      "keywords": ["primary", "search", "terms"],
      "examples": ["Plain-English example input 1", "Plain-English example input 2"]
    }
  ]
}
```

- **schema**: map each table to its `columns` and a short `description`.
- **query_patterns** (array of patterns):
  - **intent**: unique key for the query.
  - **template**: SQL with `?` placeholders.
    - Quote string params (`WHERE col = '?'`).
    - Use `fn_uuid2bin('?')` for UUID-binary fields.
  - **keywords**: words/phrases likely to appear in prompts.
  - **examples**: natural language prompts that should trigger this intent.

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

> **📚 For comprehensive development guidelines, testing strategies, and contribution workflows, see our [Development Guide](https://joseps-personal-organization.gitbook.io/query-builder-ai/development/development-setup).**

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

> **🚀 For production deployment guides including Docker, AWS, GCP, and Azure, see our [Deployment Guide](https://joseps-personal-organization.gitbook.io/query-builder-ai/deployment/production-deployment).**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test them
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## � Security

### API Keys Protection

- ✅ All `.env` files are properly excluded via `.gitignore`
- ✅ API keys are never committed to the repository
- ✅ Example files (`.env.example`) contain only placeholders
- ⚠️ Always verify `.env` files are not staged before pushing: `git status`

### Sandbox Mode Security

Sandbox mode provides a secure, read-only environment for:
- Public demonstrations
- Training sessions
- Untrusted environments
- Customer previews

All configuration editing is disabled while query building remains fully functional.

## 🐳 Docker Architecture

The application uses a multi-container Docker setup:

### Containers

1. **MySQL (Settings)** - Port 3306
   - Stores application configuration
   - Database settings, AI configuration, query logs
   
2. **MySQL-Sakila (Demo)** - Port 3310
   - Pre-loaded Sakila demo database
   - Movie rental data for testing and demos
   
3. **Backend API** - Port 3001
   - Node.js + Express + TypeScript
   - Connects to both MySQL containers
   - AI query generation (Anthropic/OpenAI)
   
4. **Frontend** - Port 80 (Production) / 5173 (Development)
   - React + Vite + TypeScript
   - Nginx in production mode
   - Hot reload in development mode

### Network Configuration

- All containers communicate via `query-builder-network`
- Backend uses service names: `mysql`, `mysql-sakila`
- External access via mapped ports
- Volumes persist data between restarts

### Environment Variables

Key environment variables for Docker:
- `DATABASE_URL` - Settings database connection
- `SETTINGS_DATABASE_URL` - Same as DATABASE_URL (for compatibility)
- `ANTHROPIC_API_KEY` - Anthropic AI API key
- `OPENAI_API_KEY` - OpenAI API key (alternative)
- `SANDBOX_MODE` - Enable read-only mode
- `NODE_ENV` - production/development
- `PORT` - Backend port (default: 3001)

## �📝 License

This project is licensed under the ISC License.

## 🔮 Recent Improvements & Future Enhancements

### ✅ Recently Completed

- ✅ **Sandbox mode** - Secure read-only demonstrations
- ✅ **Docker setup** - Complete containerization with 3 modes
- ✅ **Sakila demo database** - Pre-configured demo data
- ✅ **AI integration** - Anthropic Claude and OpenAI support
- ✅ **Interactive setup** - User-friendly docker-start.sh script
- ✅ **Landing page** - Professional marketing page
- ✅ **Multiple databases** - Support for multiple database connections
- ✅ **Purple theme** - Enhanced UI with purple accents

### 🚀 Planned Enhancements

- [ ] Support for more SQL features (advanced JOINs, subqueries, CTEs)
- [ ] Query performance analysis and optimization suggestions
- [ ] Database schema introspection and auto-configuration
- [ ] Export results to CSV/JSON/Excel
- [ ] Multi-database support (PostgreSQL, SQLite, SQL Server)
- [ ] Query history with favorites and bookmarks
- [ ] User authentication and query sharing
- [ ] Advanced ERD visualization with interactive diagrams
- [ ] Query templates and saved patterns
- [ ] Real-time collaboration features
- [ ] API rate limiting and caching
- [ ] Comprehensive test coverage

### 🐛 Bug Fixes & Improvements

- ✅ Fixed Docker networking issues (localhost → service names)
- ✅ Fixed port configuration for Sakila database (3310 external, 3306 internal)
- ✅ Added missing `winston` logging dependency
- ✅ Fixed TypeScript build errors (test files excluded)
- ✅ Added `SETTINGS_DATABASE_URL` environment variable
- ✅ Fixed SQL init script data type errors
- ✅ Removed obsolete Docker Compose `version` attribute
- ✅ Fixed frontend API integration (`useAI: true` parameter)
- ✅ Improved error handling and logging

# Quick Start Guide

Get the AI Query Builder running in under 5 minutes with this streamlined setup guide.

## Prerequisites

- Node.js 18+ and npm 8+
- MySQL 8.0+ (or use our Docker setup)
- 10 minutes of your time

## 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd query-builder

# Install all dependencies
npm install
```

## 2. Database Setup (Choose One)

### Option A: Docker Setup (Recommended)

```bash
# Start MySQL containers with sample data
./infra-manager.sh start

# This creates:
# - Production database (port 3306)
# - Sandbox database (port 3306) 
# - Demo database with sample data (port 3310)
```

### Option B: Existing MySQL

```bash
# Create databases
mysql -u root -p -e "CREATE DATABASE query_builder;"
mysql -u root -p -e "CREATE DATABASE query_builder_sbox;"

# Create user
mysql -u root -p -e "CREATE USER 'queryuser'@'localhost' IDENTIFIED BY 'querypass';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON query_builder.* TO 'queryuser'@'localhost';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON query_builder_sbox.* TO 'queryuser'@'localhost';"
```

## 3. Configure Environment

```bash
# Backend configuration
cd packages/backend
cp .env.example .env

# Edit .env file (or leave defaults for Docker setup)
DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"
```

## 4. Start the Application

```bash
# From the root directory - starts both frontend and backend
npm run dev
```

This will start:
- **Backend API**: http://localhost:3001
- **Frontend App**: http://localhost:5173

## 5. Test It Out

1. **Open your browser** to http://localhost:5173
2. **Try a sample query**: "Show me all users from California"
3. **Click "Generate SQL Query"** to see the magic happen
4. **Click "Validate & Preview Query"** to see the results

![Quick Start Demo](/screenshots/quick-start-demo.png)

## Sample Queries to Try

Once you have the app running, try these example queries:

### Basic Queries
```
"Show me all users"
"Get all products" 
"List all orders"
```

### Filtered Queries
```
"Show users from Texas"
"Products in electronics category"
"Orders from last week"
```

### Count Queries
```
"Count all users"
"How many products do we have"
"Count orders by user"
```

## What's Happening Behind the Scenes

1. **Natural Language Processing**: Your input is analyzed for keywords and patterns
2. **Pattern Matching**: The system finds the best matching SQL template
3. **Parameter Extraction**: Values like "California" are extracted from your input
4. **SQL Generation**: The template is filled with your parameters
5. **Validation**: The SQL is checked for syntax and safety
6. **Execution**: The query runs safely with automatic limits

## Next Steps

### Explore the Interface

- **Settings Panel**: Configure database connections and schema
- **Pattern Examples**: Click examples in the sidebar to learn
- **Query History**: See previously generated queries
- **Schema Browser**: Understand your database structure

### Customize for Your Data

1. **Update Database Schema**: Edit `packages/backend/src/rules.json`
2. **Add Query Patterns**: Define new natural language patterns
3. **Configure Database**: Point to your own database

### Learn More

- [User Guide](user-guide.md) - Comprehensive usage instructions
- [API Reference](api-reference.md) - Backend API documentation  
- [Development](development.md) - Contributing and customization
- [Architecture](architecture.md) - Technical deep dive

## Troubleshooting Quick Fixes

### Frontend Won't Load
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Restart frontend
cd packages/frontend
npm run dev
```

### Database Connection Issues
```bash
# Test MySQL connection
mysql -u queryuser -p query_builder

# Check if containers are running (Docker setup)
docker ps
```

### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

### "No matching pattern found"
This means your query doesn't match any predefined patterns. Try:
- Using keywords from the examples
- Being more specific about what you want
- Checking the database schema in the sidebar

## Success! 🎉

You now have a working AI Query Builder that can:
- Convert natural language to SQL
- Validate queries for safety
- Preview results in real-time
- Handle multiple database schemas

Ready to dive deeper? Check out the [User Guide](user-guide.md) for advanced features and usage patterns.

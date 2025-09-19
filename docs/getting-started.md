# Getting Started

This guide will help you get the AI Query Builder up and running on your local machine.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download Node.js](https://nodejs.org/)
- **npm** (v8 or higher) - Comes with Node.js
- **MySQL** database (local or remote)
- **Git** for version control

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd query-builder
```

### 2. Install Dependencies

The project uses npm workspaces to manage dependencies across the monorepo:

```bash
npm install
```

This will install dependencies for both the frontend and backend packages.

### 3. Database Setup

#### Option A: Using Docker (Recommended)

The project includes a Docker setup for easy database management:

```bash
# Start the database infrastructure
./infra-manager.sh start

# This will start two MySQL containers:
# Port 3306: query_builder (production) + query_builder_sbox (sandbox)  
# Port 3310: sakila (demo/showcase database)
# User: queryuser, Password: querypass
```

#### Option B: Using Existing MySQL

If you have an existing MySQL installation:

1. Create the required databases:
   ```sql
   CREATE DATABASE query_builder;
   CREATE DATABASE query_builder_sbox;
   ```

2. Create a user and grant permissions:
   ```sql
   CREATE USER 'queryuser'@'localhost' IDENTIFIED BY 'querypass';
   GRANT ALL PRIVILEGES ON query_builder.* TO 'queryuser'@'localhost';
   GRANT ALL PRIVILEGES ON query_builder_sbox.* TO 'queryuser'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 4. Environment Configuration

Configure the backend environment:

```bash
cd packages/backend
cp .env.example .env
```

Update the `.env` file with your database connection details:

```env
DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"
PORT=3001
NODE_ENV=development
```

### 5. Database Schema Setup

Initialize the database schema:

```bash
cd packages/backend
npm run setup-db  # If this script exists
```

Or manually run the SQL scripts found in `infra/mysql/init/`:

```bash
mysql -u queryuser -p query_builder < ../../infra/mysql/init/02-query-builder-schema.sql
```

## Running the Application

### Development Mode

Start both frontend and backend in development mode:

```bash
# From the root directory
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:5173`

### Individual Services

You can also start services individually:

```bash
# Backend only
npm run dev:backend

# Frontend only  
npm run dev:frontend
```

## Accessing the Application

Once both services are running:

1. Open your browser and navigate to `http://localhost:5173`
2. You should see the AI Query Builder interface
3. The backend API will be available at `http://localhost:3001`

## Verification

To verify everything is working correctly:

1. **Check Backend Health**: Visit `http://localhost:3001/api/health`
2. **Check Database Connection**: The health endpoint should show database status
3. **Test Query Generation**: Try entering a natural language query in the frontend

## Next Steps

- Read the [User Guide](user-guide.md) to learn how to use the application
- Check the [API Reference](api-reference.md) for backend integration
- See [Development](development.md) for contributing guidelines

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill processes on specific ports
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

**Database Connection Issues**
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure databases exist and user has permissions

**Frontend Not Loading**
- Clear browser cache
- Check browser console for errors
- Verify backend is running and accessible

**Dependencies Issues**
```bash
# Clean and reinstall
npm run clean
npm install
```

For more troubleshooting help, see the [Development](development.md) guide.

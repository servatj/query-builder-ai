# Infrastructure Setup

This directory contains the Docker Compose configuration and initialization scripts for the AI Query Builder database infrastructure.

## 🚀 Quick Start

### Prerequisites
- Docker
- Docker Compose

### Start the Database

```bash
# Option 1: Use the infrastructure manager (recommended)
./infra-manager.sh start

# Option 2: Use docker-compose directly
docker-compose -f docker-compose.infra.yml up -d
```

### Configure Your Application

Add this to your `packages/backend/.env` file:

```env
DATABASE_URL="mysql://queryuser:querypass@localhost:3306/query_builder"
```

## 📋 Services

### MySQL Database
- **Host**: localhost
- **Port**: 3306
- **Database**: query_builder
- **Username**: queryuser
- **Password**: querypass
- **Root Password**: rootpassword

### phpMyAdmin (Optional)
- **URL**: http://localhost:8080
- **Username**: queryuser
- **Password**: querypass

## 🗃️ Database Schema

The database comes pre-populated with:

### Tables
- **users**: User profiles with signup dates and locations
- **products**: Product catalog with categories and pricing
- **orders**: Order history linking users to products

### Sample Data
- 15 sample users from different states
- 20 sample products across categories (electronics, books, clothing, home, sports)
- 25+ sample orders with various statuses and dates

### Example Queries You Can Try

```sql
-- Find users from California
SELECT * FROM users WHERE state = 'California';

-- Count products by category
SELECT category, COUNT(*) as product_count FROM products GROUP BY category;

-- Get recent orders
SELECT u.name, p.name as product_name, o.quantity, o.order_date 
FROM orders o 
JOIN users u ON o.user_id = u.id 
JOIN products p ON o.product_id = p.id 
WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

## 🛠️ Management Commands

```bash
# Start infrastructure
./infra-manager.sh start

# Stop infrastructure
./infra-manager.sh stop

# View status
./infra-manager.sh status

# View logs
./infra-manager.sh logs

# Get database URL
./infra-manager.sh db-url

# Clean up (removes all data)
./infra-manager.sh clean
```

## 📁 Directory Structure

```
infra/
├── README.md                 # This file
├── mysql/
│   └── init/
│       ├── 01-schema.sql     # Database schema
│       └── 02-sample-data.sql # Sample data
docker-compose.infra.yml      # Docker Compose configuration
infra-manager.sh              # Management script
```

## 🔧 Customization

### Add Your Own Data

Create additional SQL files in `infra/mysql/init/` with names like `03-custom-data.sql`. They will be executed in alphabetical order.

### Change Database Configuration

Edit `docker-compose.infra.yml` to modify:
- Database name
- User credentials
- Port mappings
- Volume mounts

### Disable phpMyAdmin

Comment out the `phpmyadmin` service in `docker-compose.infra.yml` if you don't need the web interface.

## 🐛 Troubleshooting

### Port Already in Use
If port 3306 is already in use, change the port mapping in `docker-compose.infra.yml`:
```yaml
ports:
  - "3307:3306"  # Use port 3307 instead
```

### Connection Issues
1. Ensure Docker containers are running: `./infra-manager.sh status`
2. Check container logs: `./infra-manager.sh logs`
3. Verify the database URL in your `.env` file

### Reset Database
To start fresh with clean data:
```bash
./infra-manager.sh clean
./infra-manager.sh start
```
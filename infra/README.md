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

### MySQL Databases

**Main Container (Port 3306):**
- **Host**: localhost:3306
- **Username**: queryuser
- **Password**: querypass
- **Databases**: 
  - `query_builder` - Production database
  - `query_builder_sbox` - Sandbox database for testing

**Sakila Container (Port 3310):**
- **Host**: localhost:3310
- **Username**: queryuser  
- **Password**: querypass
- **Database**: `sakila` - Demo database (DVD rental store)

## 🗃️ Database Schema

### Production Database (`query_builder`)
Contains the main application tables:
- **users**: User profiles with signup dates and locations
- **products**: Product catalog with categories and pricing
- **orders**: Order history linking users to products

**Sample Data:**
- 15 sample users from different states
- 20 sample products across categories (electronics, books, clothing, home, sports)
- 25+ sample orders with various statuses and dates

### Sandbox Database (`query_builder_sbox`)
Copy of production schema for testing and experimentation.

### Demo Database (`sakila`)
Classic DVD rental store database for showcasing the query builder capabilities:
- **actor, film, customer, rental, payment** tables
- Rich relational data perfect for demonstrating complex queries
- Ideal for testing natural language to SQL conversion

### Example Queries You Can Try

**Production Database (`query_builder`):**
```sql
-- Find users from California
SELECT * FROM users WHERE state = 'California';

-- Count products by category
SELECT category, COUNT(*) as product_count FROM products GROUP BY category;

-- Get recent orders with user details
SELECT u.name, p.name as product_name, o.quantity, o.order_date 
FROM orders o 
JOIN users u ON o.user_id = u.id 
JOIN products p ON o.product_id = p.id 
WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

**Sandbox Database (`query_builder_sbox`):**
```sql
-- Same schema as production, safe for testing
SELECT * FROM users WHERE name LIKE '%Sandbox%';

-- Test complex queries without affecting production
SELECT category, AVG(price) as avg_price, COUNT(*) as product_count 
FROM products 
GROUP BY category 
ORDER BY avg_price DESC;
```

**Demo Database (`sakila`):**
```sql
-- Find all actors in a specific film
SELECT CONCAT(a.first_name, ' ', a.last_name) as actor_name
FROM actor a
JOIN film_actor fa ON a.actor_id = fa.actor_id
JOIN film f ON fa.film_id = f.film_id
WHERE f.title = 'ACADEMY DINOSAUR';

-- Get rental statistics by customer
SELECT CONCAT(c.first_name, ' ', c.last_name) as customer_name,
       COUNT(r.rental_id) as total_rentals,
       SUM(p.amount) as total_spent
FROM customer c
LEFT JOIN rental r ON c.customer_id = r.customer_id
LEFT JOIN payment p ON r.rental_id = p.rental_id
GROUP BY c.customer_id
ORDER BY total_spent DESC
LIMIT 10;
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

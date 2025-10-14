# Infrastructure Docker Compose Files

This directory contains platform-specific infrastructure docker-compose files for running the MySQL databases independently.

## 📁 Files

- **`docker-compose.infra.mac.yml`** - For macOS (Apple Silicon M1/M2/M3)
- **`docker-compose.infra.linux.yml`** - For Linux AMD64 servers

## 🚀 Usage

### On macOS (Apple Silicon):
```bash
# Start infrastructure
docker-compose -f docker-compose.infra.mac.yml up -d

# Stop infrastructure
docker-compose -f docker-compose.infra.mac.yml down

# Stop and remove volumes
docker-compose -f docker-compose.infra.mac.yml down -v
```

### On Linux AMD64:
```bash
# Start infrastructure
docker-compose -f docker-compose.infra.linux.yml up -d

# Stop infrastructure
docker-compose -f docker-compose.infra.linux.yml down

# Stop and remove volumes
docker-compose -f docker-compose.infra.linux.yml down -v
```

## 🔌 Services

### MySQL Main Database
- **Port:** 3306
- **Root Password:** rootpassword
- **User:** queryuser
- **Password:** querypass

### MySQL Sakila Demo Database
- **Port:** 3310
- **Root Password:** rootpassword
- **User:** queryuser
- **Password:** querypass
- **Database:** sakila

## 🏗️ Architecture Differences

### macOS Version (`docker-compose.infra.mac.yml`)
- Uses `platform: linux/arm64` for Apple Silicon compatibility
- Uses official `mysql:9.4` image with ARM64 support
- Sakila database loaded from SQL files

### Linux Version (`docker-compose.infra.linux.yml`)
- Uses `platform: linux/amd64` for x86_64 compatibility
- Uses official `mysql:9.4` image with AMD64 support
- Sakila database loaded from SQL files

## 📊 Volumes

Both configurations use named volumes for data persistence:
- `mysql_data` - Main MySQL database data
- `sakila_data` - Sakila demo database data

## 🔍 Healthchecks

Both MySQL containers include healthcheck configurations:
- **Interval:** Every 10 seconds
- **Timeout:** 20 seconds
- **Retries:** 10-15 attempts
- **Start Period:** 60-90 seconds

The longer start period (60-90s) allows MySQL to fully initialize, especially when loading the Sakila database for the first time.

## 🌐 Network

All services run on the `query-builder-network` bridge network.

## 💡 Tips

### First-time setup
The first time you run these containers, MySQL will initialize the databases. This can take 1-2 minutes, especially for Sakila. Monitor the logs:

```bash
# macOS
docker-compose -f docker-compose.infra.mac.yml logs -f mysql-sakila

# Linux
docker-compose -f docker-compose.infra.linux.yml logs -f mysql-sakila
```

Wait for the message: `[Server] /usr/sbin/mysqld: ready for connections`

### Verify Sakila database loaded
```bash
docker exec sakila mysql -uroot -prootpassword -e "USE sakila; SELECT COUNT(*) FROM actor;"
```

Should return 200 actors.

### Connect from your application
Update your application's database connection strings:
- **Main DB:** `mysql://queryuser:querypass@localhost:3306/query_builder`
- **Sakila DB:** `mysql://queryuser:querypass@localhost:3310/sakila`

### Reset databases
To completely reset and reinitialize:
```bash
# Stop and remove volumes
docker-compose -f docker-compose.infra.mac.yml down -v  # or .linux.yml

# Start fresh
docker-compose -f docker-compose.infra.mac.yml up -d
```

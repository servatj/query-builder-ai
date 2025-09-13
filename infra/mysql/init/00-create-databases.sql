-- Create databases for Query Builder application
-- This script runs first to create the necessary databases

-- Create Sakila database for sandbox/demo purposes
CREATE DATABASE IF NOT EXISTS sakila CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create QueryBuilder database for application settings
CREATE DATABASE IF NOT EXISTS query_builder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant permissions to queryuser for both databases
GRANT ALL PRIVILEGES ON sakila.* TO 'queryuser'@'%';
GRANT ALL PRIVILEGES ON query_builder.* TO 'queryuser'@'%';

-- Also grant to localhost for local connections
GRANT ALL PRIVILEGES ON sakila.* TO 'queryuser'@'localhost';
GRANT ALL PRIVILEGES ON query_builder.* TO 'queryuser'@'localhost';

FLUSH PRIVILEGES;

-- Show created databases
SHOW DATABASES;
-- Create databases for Query Builder application
-- This script runs first to create the necessary databases

-- Create production database for the application
CREATE DATABASE IF NOT EXISTS query_builder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create sandbox database for testing/experimentation
CREATE DATABASE IF NOT EXISTS query_builder_sbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Sakila database for demo purposes
CREATE DATABASE IF NOT EXISTS sakila CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant permissions to queryuser for all databases
GRANT ALL PRIVILEGES ON query_builder.* TO 'queryuser'@'%';
GRANT ALL PRIVILEGES ON query_builder_sbox.* TO 'queryuser'@'%';
GRANT ALL PRIVILEGES ON sakila.* TO 'queryuser'@'%';

-- Also grant to localhost for local connections
GRANT ALL PRIVILEGES ON query_builder.* TO 'queryuser'@'localhost';
GRANT ALL PRIVILEGES ON query_builder_sbox.* TO 'queryuser'@'localhost';
GRANT ALL PRIVILEGES ON sakila.* TO 'queryuser'@'localhost';

FLUSH PRIVILEGES;

-- Show created databases
SHOW DATABASES;

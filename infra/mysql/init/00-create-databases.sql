-- Create databases for Query Builder application
-- This script runs first to create the necessary databases
-- Note: Sakila runs in a separate container on port 3310

-- Create production database for the application
CREATE DATABASE IF NOT EXISTS query_builder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create sandbox database for testing/experimentation
CREATE DATABASE IF NOT EXISTS query_builder_sbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant permissions to queryuser for both databases
GRANT ALL PRIVILEGES ON query_builder.* TO 'queryuser'@'%';
GRANT ALL PRIVILEGES ON query_builder_sbox.* TO 'queryuser'@'%';

FLUSH PRIVILEGES;

-- Show created databases
SHOW DATABASES;

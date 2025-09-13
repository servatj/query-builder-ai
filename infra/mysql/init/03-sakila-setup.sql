-- Sakila Database Setup
-- This script loads the Sakila sample database for demo/sandbox purposes

USE sakila;

-- Load Sakila schema (tables, views, procedures, etc.)
SOURCE /docker-entrypoint-initdb.d/sakila-db/sakila-schema.sql;

-- Load Sakila sample data
SOURCE /docker-entrypoint-initdb.d/sakila-db/sakila-data.sql;
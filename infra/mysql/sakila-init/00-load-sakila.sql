-- Load Sakila schema and data in this container
SOURCE /docker-entrypoint-initdb.d/sakila/schema.sql;
SOURCE /docker-entrypoint-initdb.d/sakila/data.sql;

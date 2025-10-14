#!/bin/bash
# Quick fix script to update database configuration for local development

echo "🔧 Fixing database configuration for local development..."
echo ""

# Update the database settings to use localhost:3310 for Sakila
echo "Updating database settings..."
docker exec query-builder-mysql mysql -uroot -prootpassword query_builder -e "
UPDATE database_settings 
SET host = 'localhost', port = 3310 
WHERE name = 'Sakila Demo Database';

SELECT * FROM database_settings;
"

echo ""
echo "✅ Database configuration updated!"
echo ""
echo "📊 Current configuration:"
docker exec query-builder-mysql mysql -uroot -prootpassword query_builder -e "
SELECT id, name, host, port, database_name, is_active, is_default 
FROM database_settings;
"

echo ""
echo "🎯 Now restart your backend with: npm run dev"

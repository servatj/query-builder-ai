#!/bin/bash
# Script to download Sakila sample database SQL files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAKILA_VERSION="sakila-db"
SAKILA_URL="https://downloads.mysql.com/docs/sakila-db.zip"

echo "📥 Downloading Sakila database..."

# Check if files already exist
if [ -f "$SCRIPT_DIR/sakila-schema.sql" ] && [ -f "$SCRIPT_DIR/sakila-data.sql" ]; then
    echo "✅ Sakila SQL files already exist"
    exit 0
fi

# Download Sakila
cd "$SCRIPT_DIR"
curl -L -o sakila-db.zip "$SAKILA_URL"

# Extract
unzip -q sakila-db.zip

# Move SQL files
mv sakila-db/sakila-schema.sql .
mv sakila-db/sakila-data.sql .

# Cleanup
rm -rf sakila-db sakila-db.zip

echo "✅ Sakila database SQL files downloaded successfully!"
echo "   - sakila-schema.sql"
echo "   - sakila-data.sql"

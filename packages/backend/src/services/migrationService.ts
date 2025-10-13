import mysql from 'mysql2/promise';
import crypto from 'crypto';

type Migration = {
  name: string;
  sql: string;
};

// Centralized list of idempotent migrations that should be applied on backend start
const migrations: Migration[] = [
  {
    name: '2025-10-13-claude-sonnet-4-upgrade',
    sql: `
USE query_builder;

-- Ensure ai_settings table exists (noop if already created by init scripts)
CREATE TABLE IF NOT EXISTS ai_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT FALSE,
  api_key VARCHAR(255),
  model VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.20,
  max_tokens INT NOT NULL DEFAULT 2000,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Update default settings to Claude Sonnet 4 with improved params
UPDATE ai_settings 
SET 
  model = 'claude-sonnet-4-20250514',
  name = 'Default Anthropic Claude',
  temperature = 0.20,
  max_tokens = 2000,
  updated_at = CURRENT_TIMESTAMP
WHERE is_default = TRUE;

-- Convert any OpenAI-named configs to Anthropic defaults
UPDATE ai_settings 
SET 
  name = REPLACE(name, 'OpenAI', 'Anthropic Claude'),
  model = 'claude-sonnet-4-20250514',
  updated_at = CURRENT_TIMESTAMP
WHERE name LIKE '%OpenAI%' OR model LIKE 'gpt-%';

-- Log migration in app_settings as well for visibility
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type ENUM('string','number','boolean','json') DEFAULT 'string',
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_system)
VALUES ('ai_model_migration', 'claude-sonnet-4-20250514', 'string', 'Migrated to Claude Sonnet 4.0 via backend startup migrations', TRUE)
ON DUPLICATE KEY UPDATE setting_value = 'claude-sonnet-4-20250514', updated_at = CURRENT_TIMESTAMP;
    `.trim(),
  },
];

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function runStartupMigrations(databaseUrl?: string): Promise<void> {
  if (!databaseUrl) return; // No DB configured

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    // We will run statements one-by-one; multiStatements not required
  } as any);

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    for (const m of migrations) {
      const [rows] = await connection.query('SELECT name, checksum FROM app_migrations WHERE name = ?', [m.name]);
      const already = Array.isArray(rows) && rows.length > 0 ? (rows as any)[0] : null;
      const currentChecksum = sha256(m.sql);
      if (already && already.checksum === currentChecksum) {
        continue; // Already applied
      }

      // Apply migration inside a transaction; split statements by semicolon
      await connection.beginTransaction();
      try {
        const statements = m.sql
          .split(/;\s*\n|;\s*$/gm)
          .map((s) => s.trim())
          .filter(Boolean);

        for (const stmt of statements) {
          await connection.query(stmt);
        }

        await connection.query(
          'INSERT INTO app_migrations (name, checksum) VALUES (?, ?) ON DUPLICATE KEY UPDATE checksum = VALUES(checksum), applied_at = CURRENT_TIMESTAMP',
          [m.name, currentChecksum]
        );

        await connection.commit();
        console.log(`✅ Applied migration: ${m.name}`);
      } catch (err) {
        await connection.rollback();
        console.warn(`⚠️  Migration failed: ${m.name}`, err);
        // Do not throw: allow server to continue starting
      }
    }
  } finally {
    await connection.end();
  }
}

export default { runStartupMigrations };

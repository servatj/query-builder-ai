-- Sandbox Environment Setup - Update Database Configurations for Docker
-- This script runs after the main schema setup to configure Docker-specific settings

USE query_builder;

-- Update database configurations for Docker networking
-- In Docker, we use service names instead of localhost

UPDATE database_settings 
SET host = 'mysql-sakila',
    port = 3306,
    is_active = TRUE,
    is_default = TRUE
WHERE name = 'Sakila Demo Database';

-- Deactivate other databases in sandbox mode
UPDATE database_settings 
SET is_active = FALSE,
    is_default = FALSE
WHERE name != 'Sakila Demo Database';

-- Ensure Sakila is the default active database
UPDATE database_settings 
SET is_default = TRUE
WHERE name = 'Sakila Demo Database';

-- Log the configuration
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_system) 
VALUES 
('sandbox_mode', 'true', 'boolean', 'Running in sandbox mode with Sakila demo', TRUE),
('sandbox_configured_at', NOW(), 'string', 'Timestamp when sandbox was configured', TRUE)
ON DUPLICATE KEY UPDATE 
    setting_value = 'true',
    updated_at = NOW();

-- Verify configuration
SELECT 
    name,
    host,
    port,
    database_name,
    is_active,
    is_default
FROM database_settings 
ORDER BY is_default DESC, is_active DESC;

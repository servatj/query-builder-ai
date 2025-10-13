-- Migration: Update AI Settings to Claude Sonnet 4.0
-- This migration updates existing ai_settings to use Claude Sonnet 4
-- Run Date: 2025-10-13

USE query_builder;

-- Update existing AI settings to Claude Sonnet 4
UPDATE ai_settings 
SET 
    model = 'claude-sonnet-4-20250514',
    name = 'Default Anthropic Claude',
    updated_at = CURRENT_TIMESTAMP
WHERE is_default = TRUE;

-- For any OpenAI named configurations, update to Anthropic
UPDATE ai_settings 
SET 
    name = REPLACE(name, 'OpenAI', 'Anthropic Claude'),
    model = 'claude-sonnet-4-20250514',
    updated_at = CURRENT_TIMESTAMP
WHERE name LIKE '%OpenAI%' OR model LIKE 'gpt-%';

-- Ensure temperature is optimal for SQL generation (0.2 is better than 0.3 for structured output)
UPDATE ai_settings 
SET 
    temperature = 0.20,
    max_tokens = 2000,  -- Increase for better complex queries
    updated_at = CURRENT_TIMESTAMP
WHERE is_default = TRUE;

-- Log the migration
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_system) 
VALUES 
('ai_model_migration', 'claude-sonnet-4-20250514', 'string', 'Migrated to Claude Sonnet 4.0 on 2025-10-13', TRUE),
('ai_migration_date', NOW(), 'string', 'Timestamp when AI model was migrated to Claude Sonnet 4', TRUE)
ON DUPLICATE KEY UPDATE 
    setting_value = 'claude-sonnet-4-20250514',
    updated_at = NOW();

-- Verify the update
SELECT 
    id,
    name,
    model,
    temperature,
    max_tokens,
    is_active,
    is_default,
    updated_at
FROM ai_settings 
ORDER BY is_default DESC, is_active DESC;

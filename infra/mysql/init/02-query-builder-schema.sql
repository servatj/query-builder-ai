-- Query Builder Database Schema
-- This contains tables for storing application settings (except rules.json)

USE query_builder;

-- Database configuration settings table
CREATE TABLE database_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL DEFAULT 3306,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255), -- Encrypted/hashed in production
    ssl_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- AI/OpenAI configuration settings table
CREATE TABLE ai_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    api_key VARCHAR(255), -- Encrypted in production
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4-turbo-preview',
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.30 CHECK (temperature >= 0.0 AND temperature <= 1.0),
    max_tokens INT NOT NULL DEFAULT 1000 CHECK (max_tokens > 0 AND max_tokens <= 4000),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Application configuration settings (general settings)
CREATE TABLE app_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE, -- System settings vs user settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Query execution logs (optional - for analytics)
CREATE TABLE query_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    natural_language_query TEXT NOT NULL,
    generated_sql TEXT,
    execution_status ENUM('success', 'validation_error', 'execution_error') NOT NULL,
    confidence_score DECIMAL(3,2),
    execution_time_ms INT,
    error_message TEXT,
    user_session VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_database_settings_active ON database_settings(is_active);
CREATE INDEX idx_database_settings_default ON database_settings(is_default);
CREATE INDEX idx_ai_settings_active ON ai_settings(is_active);
CREATE INDEX idx_ai_settings_default ON ai_settings(is_default);
CREATE INDEX idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX idx_app_settings_type ON app_settings(setting_type);
CREATE INDEX idx_query_logs_status ON query_logs(execution_status);
CREATE INDEX idx_query_logs_created ON query_logs(created_at);

-- Insert default database configuration (Sakila sandbox)
INSERT INTO database_settings (name, host, port, database_name, username, password, ssl_enabled, is_active, is_default) 
VALUES 
('Sakila Sandbox', 'localhost', 3306, 'sakila', 'queryuser', 'querypass', FALSE, TRUE, TRUE),
('Local Development', 'localhost', 3306, 'query_builder', 'queryuser', 'querypass', FALSE, TRUE, FALSE);

-- Insert default AI configuration
INSERT INTO ai_settings (name, enabled, model, temperature, max_tokens, is_active, is_default) 
VALUES 
('Default OpenAI', FALSE, 'gpt-4-turbo-preview', 0.30, 1000, TRUE, TRUE);

-- Insert default application settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_system) 
VALUES 
('app_name', 'AI-Powered Query Builder', 'string', 'Application display name', TRUE),
('version', '1.0.0', 'string', 'Application version', TRUE),
('max_query_results', '50', 'number', 'Maximum number of query results to return', FALSE),
('enable_query_logging', 'true', 'boolean', 'Enable logging of query executions', FALSE),
('default_query_timeout', '30000', 'number', 'Default query timeout in milliseconds', FALSE);
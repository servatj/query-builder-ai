import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SchemaEditor from '@/components/SchemaEditor';

const API_BASE_URL = 'http://localhost:3001';

interface QueryPattern {
  intent: string;
  template: string;
  description: string;
  keywords: string[];
  examples?: string[];
}

interface DatabaseSettings {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

interface AISettings {
  enabled: boolean;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface Settings {
  schema: Record<string, { columns: string[]; description: string; }>;
  query_patterns: QueryPattern[];
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [databaseSettings, setDatabaseSettings] = useState<DatabaseSettings>({
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
    ssl: false
  });
  const [aiSettings, setAiSettings] = useState<AISettings>({
    enabled: false,
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    temperature: 0.3,
    maxTokens: 1000
  });
  const [settingsJson, setSettingsJson] = useState('');
  const [dbSettingsJson, setDbSettingsJson] = useState('');
  const [aiSettingsJson, setAiSettingsJson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'schema' | 'database' | 'ai'>('rules');
  const [schemaEditMode, setSchemaEditMode] = useState<'visual' | 'json'>('visual');

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings`);
      setSettings(response.data.rules);
      setDatabaseSettings(response.data.database || databaseSettings);
      setAiSettings(response.data.ai || aiSettings);
      setSettingsJson(JSON.stringify(response.data.rules, null, 2));
      setDbSettingsJson(JSON.stringify(response.data.database || databaseSettings, null, 2));
      setAiSettingsJson(JSON.stringify(response.data.ai || aiSettings, null, 2));
    } catch (err: any) {
      console.warn('Could not load current settings:', err);
      // Try to load just the patterns for backward compatibility
      try {
        const patternsResponse = await axios.get(`${API_BASE_URL}/api/patterns`);
        const fallbackSettings = {
          schema: patternsResponse.data.schema || {},
          query_patterns: patternsResponse.data.patterns || []
        };
        setSettings(fallbackSettings);
        setSettingsJson(JSON.stringify(fallbackSettings, null, 2));
        setDbSettingsJson(JSON.stringify(databaseSettings, null, 2));
        setAiSettingsJson(JSON.stringify(aiSettings, null, 2));
      } catch (fallbackErr) {
        setError('Could not load current settings. Backend may be down.');
      }
    }
  };

  const handleSaveRules = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedSettings = JSON.parse(settingsJson);
      
      // Validate the structure
      if (!parsedSettings.schema || !parsedSettings.query_patterns) {
        throw new Error('Invalid settings format. Must contain "schema" and "query_patterns" properties.');
      }

      await axios.post(`${API_BASE_URL}/api/settings/rules`, parsedSettings);
      setSettings(parsedSettings);
      setSuccess('Rules configuration saved successfully!');
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your syntax.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to save rules configuration');
      }
    }
    setIsLoading(false);
  };

  const handleSaveDatabase = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedDbSettings = JSON.parse(dbSettingsJson);
      
      // Validate required fields
      const required = ['host', 'port', 'database', 'username'];
      for (const field of required) {
        if (!parsedDbSettings[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      await axios.post(`${API_BASE_URL}/api/settings/database`, parsedDbSettings);
      setDatabaseSettings(parsedDbSettings);
      setSuccess('Database settings saved successfully!');
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your syntax.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to save database settings');
      }
    }
    setIsLoading(false);
  };

  const handleSaveAI = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedAiSettings = JSON.parse(aiSettingsJson);
      
      // Validate required fields
      if (parsedAiSettings.enabled && !parsedAiSettings.apiKey) {
        throw new Error('API Key is required when AI is enabled');
      }

      await axios.post(`${API_BASE_URL}/api/settings/ai`, parsedAiSettings);
      setAiSettings(parsedAiSettings);
      setSuccess('AI settings saved successfully!');
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your syntax.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to save AI settings');
      }
    }
    setIsLoading(false);
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings/database/test`, JSON.parse(dbSettingsJson));
      if (response.data.success) {
        setSuccess('Database connection test successful!');
      } else {
        setError('Database connection test failed: ' + response.data.error);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Connection test failed');
    }
    setIsLoading(false);
  };

  const handleTestAI = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings/ai/test`, JSON.parse(aiSettingsJson));
      if (response.data.success) {
        setSuccess('AI connection test successful!');
      } else {
        setError('AI connection test failed: ' + response.data.error);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'AI connection test failed');
    }
    setIsLoading(false);
  };

  const handleSaveSchema = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedSettings = JSON.parse(settingsJson);
      
      // Validate the structure
      if (!parsedSettings.schema || !parsedSettings.query_patterns) {
        throw new Error('Invalid settings format. Must contain "schema" and "query_patterns" properties.');
      }

      await axios.post(`${API_BASE_URL}/api/settings/rules`, parsedSettings);
      setSettings(parsedSettings);
      setSuccess('Schema updated successfully!');
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your syntax.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to save schema');
      }
    }
    setIsLoading(false);
  };

  const handleSchemaChange = (newSchema: Record<string, { columns: string[]; description: string; }>) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      schema: newSchema
    };
    
    setSettings(updatedSettings);
    setSettingsJson(JSON.stringify(updatedSettings, null, 2));
  };

  const handleSaveVisualSchema = async () => {
    if (!settings) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post(`${API_BASE_URL}/api/settings/rules`, settings);
      setSuccess('Schema updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save schema');
    }
    setIsLoading(false);
  };

  const resetToDefaults = () => {
    if (activeTab === 'rules' && settings) {
      setSettingsJson(JSON.stringify(settings, null, 2));
    } else if (activeTab === 'schema' && settings) {
      setSettingsJson(JSON.stringify(settings, null, 2));
    } else if (activeTab === 'database') {
      setDbSettingsJson(JSON.stringify(databaseSettings, null, 2));
    } else if (activeTab === 'ai') {
      setAiSettingsJson(JSON.stringify(aiSettings, null, 2));
    }
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure query rules and database connections</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'rules' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Query Rules
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'schema' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Schema
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'database' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Database
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'ai' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          AI Settings
        </button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="border-green-500">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Rules Configuration Tab */}
      {activeTab === 'rules' && (
        <Card>
          <CardHeader>
            <CardTitle>Query Rules Configuration</CardTitle>
            <CardDescription>
              Define the schema and query patterns for natural language processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="rules-json" className="font-medium">
                Rules Configuration (JSON)
              </label>
              <Textarea
                id="rules-json"
                value={settingsJson}
                onChange={(e) => setSettingsJson(e.target.value)}
                placeholder="Enter your rules configuration as JSON..."
                className="font-mono text-sm"
                rows={20}
                disabled={isLoading}
              />
              <div className="text-xs text-muted-foreground">
                The configuration should include "schema" (table definitions) and "query_patterns" (templates for natural language processing).
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSaveRules} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Rules'}
              </Button>
              <Button variant="outline" onClick={resetToDefaults} disabled={isLoading}>
                Reset to Current
              </Button>
            </div>

            {/* Preview current patterns */}
            {settings && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Current Configuration Summary</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Schema tables: {Object.keys(settings.schema || {}).length}</div>
                  <div>Query patterns: {settings.query_patterns?.length || 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schema Configuration Tab */}
      {activeTab === 'schema' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Database Schema Configuration</CardTitle>
                <CardDescription>
                  Define your database tables, columns, and their descriptions for AI-powered query generation
                </CardDescription>
              </div>
              
              {/* Editor Mode Toggle */}
              <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setSchemaEditMode('visual')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    schemaEditMode === 'visual' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Visual
                </button>
                <button
                  onClick={() => setSchemaEditMode('json')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    schemaEditMode === 'json' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {schemaEditMode === 'visual' ? (
              // Visual Schema Editor
              <div className="space-y-4">
                {settings && (
                  <SchemaEditor
                    schema={settings.schema || {}}
                    onSchemaChange={handleSchemaChange}
                  />
                )}
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveVisualSchema} disabled={isLoading || !settings}>
                    {isLoading ? 'Saving...' : 'Save Schema'}
                  </Button>
                  <Button variant="outline" onClick={resetToDefaults} disabled={isLoading}>
                    Reset to Current
                  </Button>
                </div>
              </div>
            ) : (
              // JSON Schema Editor
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="schema-json" className="font-medium">
                    Database Schema (JSON)
                  </label>
                  <Textarea
                    id="schema-json"
                    value={settingsJson}
                    onChange={(e) => setSettingsJson(e.target.value)}
                    placeholder="Enter your database schema configuration..."
                    className="font-mono text-sm"
                    rows={25}
                    disabled={isLoading}
                  />
                  <div className="text-xs text-muted-foreground">
                    Define tables with their columns and descriptions. This helps the AI understand your database structure.
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveSchema} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Schema'}
                  </Button>
                  <Button variant="outline" onClick={resetToDefaults} disabled={isLoading}>
                    Reset to Current
                  </Button>
                </div>

                {/* Schema preview and current tables */}
                {settings && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-2">Current Schema Summary</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Total tables: {Object.keys(settings.schema || {}).length}</div>
                        <div>Query patterns: {settings.query_patterns?.length || 0}</div>
                      </div>
                      
                      <h4 className="font-medium mt-3 mb-1">Tables</h4>
                      <div className="text-xs text-muted-foreground max-h-40 overflow-y-auto space-y-1">
                        {Object.entries(settings.schema || {}).map(([table, info]) => (
                          <div key={table} className="border-l-2 border-gray-300 pl-2">
                            <div className="font-medium text-foreground">{table}</div>
                            <div className="text-xs">{info.description}</div>
                            <div className="text-xs opacity-75">{info.columns.length} columns</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-2">Schema Template</h3>
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "schema": {
    "users": {
      "columns": ["id", "name", "email"],
      "description": "User accounts table"
    },
    "orders": {
      "columns": ["id", "user_id", "total"],
      "description": "Customer orders"
    }
  },
  "query_patterns": [...]
}`}
                      </pre>
                      
                      <h4 className="font-medium mt-3 mb-1">Best Practices</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>• Use clear, descriptive table names</div>
                        <div>• Include all relevant columns</div>
                        <div>• Write meaningful descriptions</div>
                        <div>• Follow consistent naming conventions</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Database Settings Tab */}
      {activeTab === 'database' && (
        <Card>
          <CardHeader>
            <CardTitle>Database Configuration</CardTitle>
            <CardDescription>
              Configure the database connection settings for query validation and execution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="db-settings-json" className="font-medium">
                Database Settings (JSON)
              </label>
              <Textarea
                id="db-settings-json"
                value={dbSettingsJson}
                onChange={(e) => setDbSettingsJson(e.target.value)}
                placeholder="Enter your database configuration as JSON..."
                className="font-mono text-sm"
                rows={15}
                disabled={isLoading}
              />
              <div className="text-xs text-muted-foreground">
                Required fields: host, port, database, username. Optional: password, ssl
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSaveDatabase} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Database Settings'}
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={isLoading}>
                {isLoading ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button variant="outline" onClick={resetToDefaults} disabled={isLoading}>
                Reset to Current
              </Button>
            </div>

            {/* Database settings template */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Configuration Template</h3>
              <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "host": "localhost",
  "port": 3306,
  "database": "your_database",
  "username": "your_username",
  "password": "your_password",
  "ssl": false
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Settings Tab */}
      {activeTab === 'ai' && (
        <Card>
          <CardHeader>
            <CardTitle>AI Model Configuration</CardTitle>
            <CardDescription>
              Configure OpenAI settings for AI-powered query generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="ai-settings-json" className="font-medium">
                AI Settings (JSON)
              </label>
              <Textarea
                id="ai-settings-json"
                value={aiSettingsJson}
                onChange={(e) => setAiSettingsJson(e.target.value)}
                placeholder="Enter your AI configuration as JSON..."
                className="font-mono text-sm"
                rows={15}
                disabled={isLoading}
              />
              <div className="text-xs text-muted-foreground">
                Configure AI model, temperature, tokens, and API key settings
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSaveAI} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save AI Settings'}
              </Button>
              <Button variant="outline" onClick={handleTestAI} disabled={isLoading}>
                {isLoading ? 'Testing...' : 'Test AI Connection'}
              </Button>
              <Button variant="outline" onClick={resetToDefaults} disabled={isLoading}>
                Reset to Current
              </Button>
            </div>

            {/* AI settings template and model options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Configuration Template</h3>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "enabled": true,
  "apiKey": "sk-your-openai-api-key",
  "model": "gpt-4-turbo-preview",
  "temperature": 0.3,
  "maxTokens": 1000
}`}
                </pre>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Available Models</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div><code>gpt-4-turbo-preview</code> - Latest GPT-4 Turbo (Recommended)</div>
                  <div><code>gpt-4</code> - Standard GPT-4</div>
                  <div><code>gpt-3.5-turbo</code> - Faster, lower cost</div>
                  <div><code>gpt-4o</code> - GPT-4 Omni</div>
                  <div><code>gpt-4o-mini</code> - Smaller GPT-4 Omni</div>
                </div>
                
                <h4 className="font-medium mt-3 mb-1">Parameters</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div><strong>temperature:</strong> 0.0-1.0 (creativity level)</div>
                  <div><strong>maxTokens:</strong> Max response length</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
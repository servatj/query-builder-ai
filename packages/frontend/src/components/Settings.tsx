import React, { useState, useEffect } from 'react';
import { axios, API_BASE_URL } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DatabaseForm from '@/components/DatabaseForm';
import AIProviderSelector from '@/components/AIProviderSelector';

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
  database_name: string;
  username: string;
  password: string;
  ssl_enabled?: boolean;
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
  sandboxMode?: boolean;
  configEditingEnabled?: boolean;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [databaseSettings, setDatabaseSettings] = useState<DatabaseSettings>({
    host: 'localhost',
    port: 3306,
    database_name: '',
    username: '',
    password: '',
    ssl_enabled: false
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
  const [activeTab, setActiveTab] = useState<'rules' | 'database' | 'ai'>('rules');
  const [availableDatabases, setAvailableDatabases] = useState<any[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [currentAIProvider, setCurrentAIProvider] = useState<'anthropic' | 'openai'>('anthropic');

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
      setIsSandboxMode(response.data.sandboxMode || false);
      
      // Load available databases
      const dbResponse = await axios.get(`${API_BASE_URL}/api/databases`);
      setAvailableDatabases(dbResponse.data || []);
      
      // Set the current default database
      const defaultDb = (dbResponse.data || []).find((db: any) => db.is_default);
      if (defaultDb) {
        setSelectedDatabaseId(defaultDb.id);
      }

      // Load current AI provider from settings
      if (response.data.ai?.provider) {
        setCurrentAIProvider(response.data.ai.provider);
      }
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
      const required = ['host', 'port', 'database_name', 'username'];
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
      const parsed = JSON.parse(dbSettingsJson);
      const payload = {
        host: parsed.host,
        port: parsed.port,
        database: parsed.database || parsed.database_name,
        username: parsed.username,
        password: parsed.password,
        ssl: parsed.ssl ?? parsed.ssl_enabled
      };
      const response = await axios.post(`${API_BASE_URL}/api/settings/database/test`, payload);
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

  const handleSwitchDatabase = async () => {
    if (!selectedDatabaseId) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings/databases/${selectedDatabaseId}/switch`);
      if (response.data.success) {
        setSuccess('Database switched successfully! Rules, schema, and database settings updated.');
        
        // Reload all settings to get the new default database configuration
        await loadCurrentSettings();
        
        // Trigger a refresh of the schema in the parent component
        // by dispatching a custom event
        window.dispatchEvent(new CustomEvent('databaseSwitched', { 
          detail: { databaseName: response.data.database?.name } 
        }));
      } else {
        setError('Failed to switch database: ' + response.data.error);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to switch database');
    }
    setIsLoading(false);
  };

  const handleCreateDatabase = async (formData: any) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings/database/create`, formData);
      if (response.data.success) {
        setSuccess('Database configuration created successfully!');
        setShowCreateForm(false);
        // Reload the available databases list
        await loadCurrentSettings();
      } else {
        setError('Failed to create database configuration: ' + response.data.error);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create database configuration');
    }
    setIsLoading(false);
  };


  const resetToDefaults = () => {
    if (activeTab === 'rules' && settings) {
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

      {/* Sandbox Mode Banner */}
      {isSandboxMode && (
        <Alert className="border-amber-500 bg-amber-50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.94-.833-2.71 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <AlertTitle className="text-amber-800">Sandbox Mode Active</AlertTitle>
              <AlertDescription className="text-amber-700">
                Configuration editing is disabled. This application is running in read-only mode.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Database Selection - Always Visible at Top */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>
                Configure database connections and settings
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? "outline" : "default"}
              disabled={isLoading || isSandboxMode}
              size="sm"
            >
              {showCreateForm ? 'Cancel' : 'Add New Database'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create New Database Form */}
          {showCreateForm && !isSandboxMode && (
            <DatabaseForm
              onSubmit={handleCreateDatabase}
              onCancel={() => setShowCreateForm(false)}
              isLoading={isLoading}
            />
          )}
          
          {/* Database Selection */}
          <div className="space-y-3">
            <label className="font-medium text-sm">Active Database</label>
            <div className="space-y-2">
              <select
                value={selectedDatabaseId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setSelectedDatabaseId(id);
                  if (id) {
                    const selected = availableDatabases.find((db) => db.id === id);
                    if (selected) {
                      setDatabaseSettings(selected);
                      setDbSettingsJson(JSON.stringify(selected, null, 2));
                      // Clear any previous messages
                      setError(null);
                      setSuccess(null);
                    }
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md bg-background"
                disabled={isLoading || isSandboxMode}
              >
                <option value="">Select a database...</option>
                {availableDatabases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.name} ({db.host}:{db.port}/{db.database_name})
                    {!!db.is_default && ' - Default'}
                  </option>
                ))}
              </select>
              <Button 
                onClick={handleSwitchDatabase} 
                disabled={isLoading || !selectedDatabaseId || isSandboxMode}
                size="sm"
              >
                {isLoading ? 'Switching...' : 'Switch Database'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                disabled={isLoading || isSandboxMode}
              />
              <div className="text-xs text-muted-foreground">
                The configuration should include "schema" (table definitions) and "query_patterns" (templates for natural language processing).
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSaveRules} disabled={isLoading || isSandboxMode}>
                {isLoading ? 'Saving...' : 'Save Rules'}
              </Button>
              <Button variant="outline" onClick={resetToDefaults} disabled={isLoading || isSandboxMode}>
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


      {/* Database Settings Tab */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Create New Database Form */}
          {showCreateForm && !isSandboxMode && (
            <DatabaseForm
              onSubmit={handleCreateDatabase}
              onCancel={() => setShowCreateForm(false)}
              isLoading={isLoading}
            />
          )}
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Database Configuration</CardTitle>
                  <CardDescription>
                    Configure database connections and settings
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  variant={showCreateForm ? "outline" : "default"}
                  disabled={isLoading || isSandboxMode}
                >
                  {showCreateForm ? 'Cancel' : 'Add New Database'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
            {/* Database Settings JSON Editor */}
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
                rows={12}
                disabled={isLoading || isSandboxMode}
              />
              <div className="text-xs text-muted-foreground">
                Required fields: host, port, database_name, username. Optional: password, ssl_enabled
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSaveDatabase} disabled={isLoading || isSandboxMode}>
                {isLoading ? 'Saving...' : 'Save Database Settings'}
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={isLoading || isSandboxMode}>
                {isLoading ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button variant="outline" onClick={resetToDefaults} disabled={isLoading || isSandboxMode}>
                Reset to Current
              </Button>
            </div>

            {/* Database settings template */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Configuration Template</h3>
              <pre className="text-xs text-muted-foreground overflow-x-auto">
                    {`{
                      "name": "My Database",
                      "host": "localhost",
                      "port": 3306,
                      "database_name": "your_database",
                      "username": "your_username", 
                      "password": "your_password",
                      "ssl_enabled": false,
                      "is_active": true,
                      "is_default": false
                    }`}
              </pre>
            </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Settings Tab */}
      {activeTab === 'ai' && (
        <>
          {/* AI Provider Selector */}
          <AIProviderSelector onProviderChange={(provider) => {
            setCurrentAIProvider(provider);
            loadCurrentSettings();
          }} />
          
          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>AI Model Configuration</CardTitle>
              <CardDescription>
                Configure API keys and model settings for the selected AI provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">\n              <div className="space-y-2">
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
                  disabled={isLoading || isSandboxMode}
                />
                <div className="text-xs text-muted-foreground">
                  Configure AI model, temperature, tokens, and API key settings
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSaveAI} disabled={isLoading || isSandboxMode}>
                  {isLoading ? 'Saving...' : 'Save AI Settings'}
                </Button>
                <Button variant="outline" onClick={handleTestAI} disabled={isLoading || isSandboxMode}>
                  {isLoading ? 'Testing...' : 'Test AI Connection'}
              </Button>
              <Button variant="outline" onClick={resetToDefaults} disabled={isLoading || isSandboxMode}>
                Reset to Current
              </Button>
            </div>

            {/* AI settings template and model options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Configuration Template</h3>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
{currentAIProvider === 'anthropic' ? `{
  "enabled": true,
  "apiKey": "sk-ant-your-anthropic-api-key",
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.2,
  "maxTokens": 2000
}` : `{
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
                  {currentAIProvider === 'anthropic' ? (
                    <>
                      <div><code>claude-sonnet-4-20250514</code> - Claude Sonnet 4.0 ⭐ (Recommended - Latest & Most Capable)</div>
                      <div><code>claude-3-5-sonnet-20241022</code> - Claude 3.5 Sonnet</div>
                      <div><code>claude-3-5-haiku-20241022</code> - Claude 3.5 Haiku - Fast & affordable</div>
                      <div><code>claude-3-opus-20240229</code> - Claude 3 Opus</div>
                      <div><code>claude-3-sonnet-20240229</code> - Claude 3 Sonnet</div>
                      <div><code>claude-3-haiku-20240307</code> - Claude 3 Haiku</div>
                    </>
                  ) : (
                    <>
                      <div><code>gpt-4-turbo-preview</code> - Latest GPT-4 Turbo (Recommended)</div>
                      <div><code>gpt-4</code> - Standard GPT-4</div>
                      <div><code>gpt-3.5-turbo</code> - Faster, lower cost</div>
                      <div><code>gpt-4o</code> - GPT-4 Omni</div>
                      <div><code>gpt-4o-mini</code> - Smaller GPT-4 Omni</div>
                    </>
                  )}
                </div>
                
                <h4 className="font-medium mt-3 mb-1">Parameters</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div><strong>temperature:</strong> 0.0-1.0 (Recommended: 0.2 for structured SQL output)</div>
                  <div><strong>maxTokens:</strong> Max response length (Recommended: 2000 for complex queries)</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
};

export default Settings;

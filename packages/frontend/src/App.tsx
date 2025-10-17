import { useState, useEffect } from 'react';
import { axios, API_BASE_URL } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Settings from '@/components/Settings';
import ThemeToggle from '@/components/ThemeToggle';
import SqlEditor from '@/components/SqlEditor';
import ERDViewer from '@/components/ERDViewer';
import DiagramVisualizer from '@/components/DiagramVisualizer';
import DatabaseSwitcher from '@/components/DatabaseSwitcher';
import { format } from 'sql-formatter';

interface QueryPattern {
  intent: string;
  description: string;
  keywords: string[];
  examples: string[];
}

interface HealthStatus {
  status: string;
  database: string;
  database_host?: string;
  database_name?: string;
  timestamp: string;
}

interface GeneratedQuery {
  sql: string;
  confidence: number;
  matchedPattern: {
    intent: string;
    description: string;
    keywords: string[];
  };
  extractedValues: string[];
}

interface AuditEntry {
  id: string;
  timestamp: string;
  naturalLanguageQuery: string;
  sqlQuery: string;
  isValid: boolean;
  error?: string;
  rowCount?: number;
  executionTime?: string;
}

// New: backend schema types
type SchemaTable = { columns: string[]; description: string };
type BackendSchema = Record<string, SchemaTable>;

function App() {
  const [currentPage, setCurrentPage] = useState<'query-builder' | 'settings' | 'schema' | 'diagram'>('query-builder');
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePatterns, setAvailablePatterns] = useState<QueryPattern[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [queryMetadata, setQueryMetadata] = useState<GeneratedQuery | null>(null);
  const [showPatterns, setShowPatterns] = useState(false);
  const [executionInfo, setExecutionInfo] = useState<{
    rowCount?: number;
    executionTime?: string;
    limited?: boolean;
  } | null>(null);
  // New: store schema from backend
  const [schema, setSchema] = useState<BackendSchema | null>(null);
  // Audit trail for last 5 executions
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  // Sandbox mode status
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // Function to load patterns and schema
  const loadPatternsAndSchema = async () => {
    try {
      // Load available patterns (also includes schema)
      const patternsResponse = await axios.get(`${API_BASE_URL}/api/patterns`);
      console.log('Loaded patterns:', patternsResponse.data.patterns);
      setAvailablePatterns(patternsResponse.data.patterns || []);
      if (patternsResponse.data.schema) {
        setSchema(patternsResponse.data.schema as BackendSchema);
      }

      // Check health status
      const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
      setHealthStatus(healthResponse.data);
      
      // Check sandbox mode status
      const settingsResponse = await axios.get(`${API_BASE_URL}/api/settings`);
      console.log('Sandbox mode:', settingsResponse.data.sandboxMode);
      setIsSandboxMode(settingsResponse.data.sandboxMode || false);
    } catch (err) {
      console.warn('Failed to load initial data:', err);
      // Set a default health status if we can't reach the backend
      setHealthStatus({
        status: 'unreachable',
        database: 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Load available patterns and health status on component mount
  useEffect(() => {
    loadPatternsAndSchema();
  }, []);

  // Listen for database switch events to refresh schema
  useEffect(() => {
    const handleDatabaseSwitch = (event: CustomEvent) => {
      console.log('Database switched to:', event.detail.databaseName);
      // Refresh patterns and schema when database is switched
      loadPatternsAndSchema();
    };

    window.addEventListener('databaseSwitched', handleDatabaseSwitch as EventListener);
    
    return () => {
      window.removeEventListener('databaseSwitched', handleDatabaseSwitch as EventListener);
    };
  }, []);

  // Function to add entry to audit trail (keep only last 5)
  const addToAuditTrail = (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    setAuditTrail(prev => {
      const updated = [newEntry, ...prev];
      return updated.slice(0, 5); // Keep only last 5 entries
    });
  };

  const handleGenerateQuery = async () => {
    setIsLoading(true);
    setError(null);
    setIsValid(null);
    setPreviewData(null);
    setQueryMetadata(null);
    setExecutionInfo(null);
    
    try {
      const response = await axios.post(`/api/generate-query`, 
        { prompt: naturalLanguageQuery, useAI: true }
      );
      
      // Auto-format the generated SQL
      let formattedSql = response.data.sql;
      try {
        formattedSql = format(response.data.sql, {
          language: 'sql',
          keywordCase: 'upper',
          indentStyle: 'standard',
          logicalOperatorNewline: 'before',
          expressionWidth: 50,
          linesBetweenQueries: 2
        });
      } catch (formatError) {
        console.warn('Failed to format generated SQL, using original:', formatError);
        // Use original SQL if formatting fails
      }
      
      setSqlQuery(formattedSql);
      setQueryMetadata(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to generate query. Please check the backend.';
      const suggestion = err.response?.data?.suggestion;
      const availablePatterns = err.response?.data?.availablePatterns;
      
      setError(`${errorMessage}${suggestion ? `\n\nSuggestion: ${suggestion}` : ''}`);
      
      if (availablePatterns && availablePatterns.length > 0) {
        console.log('Available patterns:', availablePatterns);
      }
      console.error('Generate query error:', err);
    }
    setIsLoading(false);
  };

  const handleValidateAndPreview = async () => {
    setIsLoading(true);
    setError(null);
    setIsValid(null);
    setPreviewData(null);
    setExecutionInfo(null);
    
    try {
      const response = await axios.post(`/api/validate-query`, 
        { query: sqlQuery }
      );
      setIsValid(response.data.isValid);
      
      if (response.data.isValid) {  
        setPreviewData(response.data.data || []);
        setExecutionInfo({
          rowCount: response.data.rowCount,
          executionTime: response.data.executionTime,
          limited: response.data.limited
        });
        
        // Add successful execution to audit trail
        addToAuditTrail({
          naturalLanguageQuery,
          sqlQuery,
          isValid: true,
          rowCount: response.data.rowCount,
          executionTime: response.data.executionTime
        });
      } else {
        // Add failed validation to audit trail
        addToAuditTrail({
          naturalLanguageQuery,
          sqlQuery,
          isValid: false,
          error: 'Validation failed'
        });
      }
    } catch (err: any) {
      setIsValid(false);
      const errorData = err.response?.data;
      const errorMessage = errorData?.error || 'An unexpected error occurred.';
      setError(errorMessage);
      
      // Add error to audit trail
      addToAuditTrail({
        naturalLanguageQuery,
        sqlQuery,
        isValid: false,
        error: errorMessage
      });
      
      // Show additional error information if available
      if (errorData?.suggestion) {
        setError(prev => `${prev}\n\nSuggestion: ${errorData.suggestion}`);
      }
      
      console.error('Validation error:', err);
    }
    setIsLoading(false);
  };

  const handleUseExample = (example: string) => {
    setNaturalLanguageQuery(example);
    setError(null);
    setIsValid(null);
    setPreviewData(null);
    setSqlQuery('');
    setQueryMetadata(null);
    setExecutionInfo(null);
  };

  const handleCopyQuery = async () => {
    try {
      // Check if the Clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }
      
      if (sqlQuery.trim()) {
        await navigator.clipboard.writeText(sqlQuery);
        // You could add a toast notification here if desired
        console.log('Query copied to clipboard');
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback: show an alert to manually copy
      alert('Unable to copy to clipboard. Please manually copy the query using Ctrl+C (or Cmd+C on Mac)');
    }
  };

  const getHealthStatusColor = () => {
    if (!healthStatus) return 'text-gray-500';
    switch (healthStatus.status) {
      case 'healthy': return 'text-green-500';
      case 'unreachable': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header with distinct background and full-width separator */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center space-x-4 md:space-x-6">
              <svg className="h-16 w-16 md:h-20 md:w-20 flex-shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="10" fill="url(#gradient1)"/>
                <ellipse cx="24" cy="16" rx="10" ry="4" fill="white" opacity="0.9"/>
                <path d="M14 16 L14 28 C14 30.2 18.5 32 24 32 C29.5 32 34 30.2 34 28 L34 16" stroke="white" strokeWidth="2" fill="none"/>
                <ellipse cx="24" cy="28" rx="10" ry="4" fill="white" opacity="0.9"/>
                <path d="M14 22 C14 24.2 18.5 26 24 26 C29.5 26 34 24.2 34 22" stroke="white" strokeWidth="2" fill="none"/>
                <defs>
                  <linearGradient id="gradient1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9333ea"/>
                    <stop offset="1" stopColor="#6b21a8"/>
                  </linearGradient>
                </defs>
              </svg>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">AI-Powered Query Builder</h1>
                <p className="text-sm md:text-base text-muted-foreground">Convert natural language to SQL queries with real-time validation</p>
              </div>
              
            </div>
            
            <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full md:w-auto justify-end">
              <DatabaseSwitcher onDatabaseChange={loadPatternsAndSchema} disabled={isSandboxMode} />
              <ThemeToggle />
              {healthStatus && (
                <div className="text-right w-full md:w-auto">
                  <div className={`text-sm font-medium ${getHealthStatusColor()}`}>
                    Backend: {healthStatus.status}
                  </div>
                  <div className={`text-xs ${healthStatus.database === 'connected' ? 'text-green-500' : 'text-yellow-500'}`}>
                    Database: {healthStatus.database}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto p-4 w-full space-y-6">

        {/* Navigation below logo */}
        <div className="flex justify-start">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setCurrentPage('query-builder')}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentPage === 'query-builder' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-purple-600'
              }`}
            >
              Query Builder
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                currentPage === 'settings' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-purple-600'
              }`}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              <span>Settings</span>
            </button>
            <button
              onClick={() => setCurrentPage('schema')}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                currentPage === 'schema' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-purple-600'
              }`}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" 
                />
              </svg>
              <span>Schema</span>
            </button>
            <button
              onClick={() => setCurrentPage('diagram')}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                currentPage === 'diagram' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-purple-600'
              }`}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" 
                />
              </svg>
              <span>Diagram</span>
            </button>
          </div>
        </div>

        {/* Conditional Page Rendering */}
        {currentPage === 'settings' ? (
          <Settings />
        ) : currentPage === 'schema' ? (
          <ERDViewer schema={schema} />
        ) : currentPage === 'diagram' ? (
          <DiagramVisualizer schema={schema} />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Query Builder */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Query Builder</CardTitle>
                <CardDescription>
                  Enter your request in plain English and we'll generate the SQL for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Natural Language Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="natural-language" className="font-medium">
                      1. Describe what you want to query
                    </label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPatterns(!showPatterns)}
                    >
                      {showPatterns ? 'Hide' : 'Show'} Examples
                    </Button>
                  </div>
                  
                  <Textarea
                    id="natural-language"
                    placeholder="e.g., 'Show me all users from California who signed up this week'"
                    value={naturalLanguageQuery}
                    onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleGenerateQuery} 
                      disabled={isLoading || !naturalLanguageQuery.trim()}
                      className="flex-1"
                    >
                      {isLoading ? 'Generating...' : 'Generate SQL Query'}
                    </Button>
                  </div>
                </div>

                {/* Query Generation Results */}
                {error && !isLoading && (
                  <Alert variant="destructive">
                    <AlertTitle>Generation Error</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Generated SQL Query */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="sql-query" className="font-medium">2. Generated SQL Query</label>
                    <div className="flex items-center gap-2">
                      {queryMetadata && (
                        <div className="text-sm">
                          <span className={`font-medium ${getConfidenceColor(queryMetadata.confidence)}`}>
                            Confidence: {Math.round(queryMetadata.confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`transition-colors ${
                    isValid === true ? 'ring-2 ring-green-500' : 
                    isValid === false ? 'ring-2 ring-red-500' : 
                    ''
                  }`}>
                    <SqlEditor
                      value={sqlQuery}
                      onChange={setSqlQuery}
                      height="200px"
                      placeholder="Your generated SQL query will appear here..."
                      readOnly={isLoading}
                      onCopy={handleCopyQuery}
                    />
                  </div>

                  {/* Query Metadata */}
                  {queryMetadata && !error && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <div><strong>Matched Pattern:</strong> {queryMetadata.matchedPattern.description}</div>
                      <div><strong>Keywords:</strong> {queryMetadata.matchedPattern.keywords.join(', ')}</div>
                      {queryMetadata.extractedValues.length > 0 && (
                        <div><strong>Extracted Values:</strong> {queryMetadata.extractedValues.join(', ')}</div>
                      )}
                    </div>
                  )}

                  {/* Validation Results */}
                  {isValid === false && error && (
                    <Alert variant="destructive">
                      <AlertTitle>Validation Failed</AlertTitle>
                      <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  {isValid === true && (
                    <Alert variant="default" className="border-green-500">
                      <AlertTitle>✅ Validation Successful</AlertTitle>
                      <AlertDescription>
                        The query is valid and ready to execute.
                        {executionInfo && (
                          <div className="mt-2 text-xs">
                            <div>Rows returned: {executionInfo.rowCount}</div>
                            {executionInfo.limited && <div className="text-yellow-600">⚠️ Results limited for safety</div>}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Data Preview */}
                {previewData && previewData.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium">3. Data Preview</h3>
                    <div className="rounded-md border-2 border-border max-h-80 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            {Object.keys(previewData[0]).map(key => (
                              <th key={key} className="p-2 text-left font-semibold border-b-2 border-border">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className="border-b border-border hover:bg-muted/50">
                              {Object.values(row).map((val: any, j) => (
                                <td key={j} className="p-2 truncate max-w-xs" title={String(val)}>
                                  {val === null ? (
                                    <span className="text-muted-foreground italic">null</span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {executionInfo && executionInfo.rowCount && executionInfo.rowCount > 20 && (
                      <div className="text-xs text-muted-foreground">
                        Showing first {Math.min(20, executionInfo.rowCount)} of {executionInfo.rowCount} rows
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleValidateAndPreview} 
                  disabled={isLoading || !sqlQuery.trim()} 
                  className="ml-auto"
                >
                  {isLoading ? 'Validating...' : 'Validate & Preview Query'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar with patterns and examples */}
          <div className="space-y-6">
            {/* Quick Examples */}
            {showPatterns && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Examples</CardTitle>
                  <CardDescription>Click any example to try it</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-auto bg-black rounded-md p-3 scrollbar-hide">
                    {availablePatterns.slice(0, 5).map((pattern, index) => (
                      <div key={index} className="space-y-1">
                        <div className="text-sm font-medium text-purple-400">{pattern.description}</div>
                        {pattern.examples?.slice(0, 2).map((example, exIndex) => (
                          <button
                            key={exIndex}
                            onClick={() => handleUseExample(example)}
                            className="block w-full text-left text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 p-2 rounded border border-transparent hover:border-purple-500 transition-colors"
                          >
                            "{example}"
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Database Schema Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Database Schema</CardTitle>
                <CardDescription>
                  Available tables and columns
                  {healthStatus?.database_name && (
                    <div className="text-xs mt-1 text-blue-600 font-medium">
                      Active DB: {healthStatus.database_name}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Render dynamic schema from backend if available */}
                {schema ? (
                  <div className="space-y-3 max-h-80 overflow-auto pr-1 bg-black rounded-md p-3 scrollbar-hide">
                    {Object.entries(schema).map(([table, info]) => (
                      <div key={table} className="hover:bg-purple-900/20 p-2 rounded transition-colors cursor-pointer group">
                        <div className="font-medium text-sm text-purple-400 group-hover:text-purple-300">{table}</div>
                        <div className="text-xs text-purple-400/70 group-hover:text-purple-300/80 truncate" title={info.columns.join(', ')}>
                          {info.columns.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Fallback: brief guidance when schema not loaded
                  <div className="text-xs text-muted-foreground">
                    Schema not loaded. Ensure the backend is running and exposes /api/patterns.
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Audit Trail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Audit Trail</CardTitle>
                <CardDescription>
                  Last 5 query executions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditTrail.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-auto pr-1">
                    {auditTrail.map((entry) => (
                      <div key={entry.id} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        <div className="text-sm font-medium truncate" title={entry.naturalLanguageQuery}>
                          "{entry.naturalLanguageQuery}"
                        </div>
                        <div className="text-xs font-mono bg-muted p-2 rounded truncate" title={entry.sqlQuery}>
                          {entry.sqlQuery}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-medium ${entry.isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.isValid ? '✅ Success' : '❌ Failed'}
                          </span>
                          {entry.isValid && entry.rowCount !== undefined && (
                            <span className="text-muted-foreground">
                              {entry.rowCount} rows
                              {entry.executionTime && ` • ${entry.executionTime}`}
                            </span>
                          )}
                        </div>
                        {entry.error && (
                          <div className="text-xs text-red-600 truncate" title={entry.error}>
                            Error: {entry.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No queries executed yet. Run a query to see execution history.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default App;

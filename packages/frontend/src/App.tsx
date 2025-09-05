import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_BASE_URL = 'http://localhost:3001';

interface QueryPattern {
  intent: string;
  description: string;
  keywords: string[];
  examples: string[];
}

interface HealthStatus {
  status: string;
  database: string;
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

function App() {
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

  // Load available patterns and health status on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load available patterns
        const patternsResponse = await axios.get(`${API_BASE_URL}/api/patterns`);
        setAvailablePatterns(patternsResponse.data.patterns || []);

        // Check health status
        const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
        setHealthStatus(healthResponse.data);
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

    loadInitialData();
  }, []);

  const handleGenerateQuery = async () => {
    setIsLoading(true);
    setError(null);
    setIsValid(null);
    setPreviewData(null);
    setQueryMetadata(null);
    setExecutionInfo(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-query`, { prompt: naturalLanguageQuery });
      setSqlQuery(response.data.sql);
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
      const response = await axios.post(`${API_BASE_URL}/api/validate-query`, { query: sqlQuery });
      setIsValid(response.data.isValid);
      
      if (response.data.isValid) {
        setPreviewData(response.data.data || []);
        setExecutionInfo({
          rowCount: response.data.rowCount,
          executionTime: response.data.executionTime,
          limited: response.data.limited
        });
      }
    } catch (err: any) {
      setIsValid(false);
      const errorData = err.response?.data;
      setError(errorData?.error || 'An unexpected error occurred.');
      
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
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with health status */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI-Powered Query Builder</h1>
            <p className="text-muted-foreground">Convert natural language to SQL queries with real-time validation</p>
          </div>
          {healthStatus && (
            <div className="text-right">
              <div className={`text-sm font-medium ${getHealthStatusColor()}`}>
                Backend: {healthStatus.status}
              </div>
              <div className={`text-xs ${healthStatus.database === 'connected' ? 'text-green-500' : 'text-yellow-500'}`}>
                Database: {healthStatus.database}
              </div>
            </div>
          )}
        </div>

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
                    {queryMetadata && (
                      <div className="text-sm space-x-2">
                        <span className={`font-medium ${getConfidenceColor(queryMetadata.confidence)}`}>
                          Confidence: {Math.round(queryMetadata.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className={`rounded-md border p-2 transition-colors ${
                    isValid === true ? 'border-green-500' : 
                    isValid === false ? 'border-red-500' : 
                    'border-input'
                  }`}>
                    <Textarea
                      id="sql-query"
                      placeholder="Your generated SQL query will appear here..."
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      className="resize-none border-0 focus:ring-0 font-mono text-sm"
                      rows={6}
                      disabled={isLoading}
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
                    <div className="rounded-md border max-h-80 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            {Object.keys(previewData[0]).map(key => (
                              <th key={key} className="p-2 text-left font-semibold border-b">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className="border-b hover:bg-muted/50">
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
                  <div className="space-y-2">
                    {availablePatterns.slice(0, 5).map((pattern, index) => (
                      <div key={index} className="space-y-1">
                        <div className="text-sm font-medium">{pattern.description}</div>
                        {pattern.examples?.slice(0, 2).map((example, exIndex) => (
                          <button
                            key={exIndex}
                            onClick={() => handleUseExample(example)}
                            className="block w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded border border-transparent hover:border-border transition-colors"
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
                <CardDescription>Available tables and columns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="font-medium text-sm">users</div>
                    <div className="text-xs text-muted-foreground">id, name, email, signup_date, state, age, phone</div>
                  </div>
                  <div>
                    <div className="font-medium text-sm">products</div>
                    <div className="text-xs text-muted-foreground">id, name, price, category, created_at, stock_quantity</div>
                  </div>
                  <div>
                    <div className="font-medium text-sm">orders</div>
                    <div className="text-xs text-muted-foreground">id, user_id, product_id, quantity, order_date, total_amount</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
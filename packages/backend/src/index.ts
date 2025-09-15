import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { initPools, getSystemPool, getDestinationPool, getSystemService } from './config/database';
import { loadRulesFromFile, saveRulesToFile, Rules, QueryPattern } from './config/rules';
import openaiService, { AIConfig } from './services/openaiService';
import DatabaseSystemService from './services/databaseSystemService';
import DatabaseDestinationService from './services/databaseDestinationService';
import { DatabaseConfig, AISettingsDB } from './services/databaseSystemService';
import mysql from 'mysql2/promise';

dotenv.config();

let systemService: DatabaseSystemService | null = null;
let destinationService: DatabaseDestinationService | null = null;
let currentSettings: Rules | null = null;

const app: Express = express();
const port = process.env.PORT || 3001;

const bootStrap = async () => {
  await initPools();
  systemService = getSystemService();
  if (getDestinationPool()) {
    destinationService = new DatabaseDestinationService(getDestinationPool()!);
  }
};

bootStrap().then(() => {
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}).catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong' 
  });
});

// Helper functions
const sanitizeInput = (input: string): string => {
  return input.trim().toLowerCase().replace(/[^\w\s]/g, '');
};

const validatePrompt = (prompt: string): { isValid: boolean; error?: string } => {
  if (!prompt || typeof prompt !== 'string') {
    return { isValid: false, error: 'Prompt is required and must be a string' };
  }
  
  if (prompt.trim().length === 0) {
    return { isValid: false, error: 'Prompt cannot be empty' };
  }
  
  if (prompt.length > 500) {
    return { isValid: false, error: 'Prompt is too long (max 500 characters)' };
  }
  
  return { isValid: true };
};

const validateSqlQuery = (query: string): { isValid: boolean; error?: string } => {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Query is required and must be a string' };
  }

  // Strip comments
  const noBlockComments = query.replace(/\/\*[\s\S]*?\*\//g, '');
  const noLineComments = noBlockComments.replace(/--.*$/gm, '').replace(/#.*/g, '');

  const trimmedQuery = noLineComments.trim();
  if (trimmedQuery.length === 0) {
    return { isValid: false, error: 'Query cannot be empty' };
  }

  // Enforce single SELECT statement only
  const lower = trimmedQuery.toLowerCase();
  if (!lower.startsWith('select')) {
    return { isValid: false, error: 'Only SELECT queries are allowed' };
  }

  // Disallow multiple statements via semicolons (except an optional trailing one)
  const semicolonIndex = trimmedQuery.indexOf(';');
  if (semicolonIndex !== -1 && semicolonIndex < trimmedQuery.length - 1) {
    return { isValid: false, error: 'Multiple statements are not allowed' };
  }

  // Block common injection/dangerous patterns
  const dangerousPatterns = [
    /\b(drop|delete|truncate|alter|create|grant|revoke|insert|update|call|exec|execute)\b/i,
    /union\s+all?\s+select/i,
    /into\s+outfile/i,
    /load_file\s*\(/i,
    /sleep\s*\(/i,
    /benchmark\s*\(/i,
    /information_schema\./i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedQuery)) {
      return { isValid: false, error: 'Query contains potentially dangerous operations' };
    }
  }

  return { isValid: true };
};

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Query Builder Backend is running!',
    version: '1.0.0',
    endpoints: [
      'POST /api/generate-query',
      'POST /api/validate-query',
      'GET /api/health',
      'GET /api/patterns',
      'GET /api/settings',
      'POST /api/settings/rules',
      'POST /api/settings/database',
      'POST /api/settings/database/test',
      'POST /api/settings/ai',
      'POST /api/settings/ai/test',
      'GET /api/databases',
      'POST /api/databases/:id/switch'
    ],
    database: getSystemPool() ? 'connected' : 'not configured'
  });
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      openai: openaiService.enabled ? 'enabled' : 'disabled',
      services: {
        database: 'disconnected',
        openai: 'unknown'
      }
    };

    // Check database
    if (getSystemPool()) {
      try {
        const connection = await getSystemPool()!.getConnection();
        await connection.ping();
        connection.release();
        health.database = 'connected';
        health.services.database = 'connected';
      } catch (dbError) {
        health.database = 'error';
        health.services.database = 'error';
        console.error('Database health check failed:', dbError);
      }
    }

    // Check OpenAI (quick test - don't use up tokens)
    if (openaiService.enabled) {
      health.services.openai = 'enabled';
    } else {
      health.services.openai = 'disabled';
    }

    res.json(health);
  } catch (error: unknown) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'unhealthy', error: 'Health check failed' });
  }
});

// Get available query patterns
app.get('/api/patterns', async (req: Request, res: Response) => {
  try {
    const rules = currentSettings || await loadRulesFromFile();

    const patterns = rules.query_patterns.map(pattern => ({
      intent: pattern.intent,
      description: pattern.description,
      keywords: pattern.keywords,
      examples: pattern.examples || []
    }));

    res.json({ 
      patterns, 
      schema: rules.schema,
      total: patterns.length 
    });
  } catch (error: unknown) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ error: 'Failed to fetch query patterns' });
  }
});

// Get current settings
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const rules = currentSettings || await loadRulesFromFile();
    
    // Get database and AI settings from database
    const defaultDbConfig = await systemService!.getDefaultDatabaseConfig();
    const defaultAiConfig = await systemService!.getDefaultAISettings();
    
    res.json({
      rules,
      database: defaultDbConfig || {
        name: 'Default',
        host: 'localhost',
        port: 3306,
        database_name: 'sakila',
        username: 'queryuser',
        password: 'querypass',
        ssl_enabled: false,
        is_active: true,
        is_default: true
      },
      ai: defaultAiConfig || {
        name: 'Default',
        enabled: false,
        apiKey: '',
        model: 'gpt-4-turbo-preview',
        temperature: 0.3,
        maxTokens: 1000,
        is_active: true,
        is_default: true
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update rules configuration
app.post('/api/settings/rules', async (req: Request, res: Response) => {
  try {
    const { schema, query_patterns } = req.body;
    
    // Validate required fields
    if (!schema || !query_patterns) {
      return res.status(400).json({ error: 'Both schema and query_patterns are required' });
    }
    
    if (!Array.isArray(query_patterns)) {
      return res.status(400).json({ error: 'query_patterns must be an array' });
    }

    const newRules: Rules = { schema, query_patterns };
    
    // Save to file and update in-memory cache
    await saveRulesToFile(newRules);
    currentSettings = newRules;
    
    res.json({ 
      success: true, 
      message: 'Rules configuration updated successfully',
      patterns: query_patterns.length,
      tables: Object.keys(schema).length
    });
  } catch (error: unknown) {
    console.error('Error updating rules:', error);
    res.status(500).json({ error: 'Failed to update rules configuration' });
  }
});

// Update database configuration
app.post('/api/settings/database', async (req: Request, res: Response) => {
  try {
    const { name, host, port, database_name, username, password, ssl_enabled } = req.body;
    
    // Validate required fields
    if (!host || !port || !database_name || !username) {
      return res.status(400).json({ 
        error: 'Missing required fields: host, port, database_name, username are required' 
      });
    }
    
    const dbConfig: Omit<DatabaseConfig, 'id'> = {
      name: name || 'Custom Configuration',
      host,
      port: parseInt(port),
      database_name,
      username,
      password: password || '',
      ssl_enabled: ssl_enabled || false,
      is_active: true,
      is_default: true // Make this the new default
    };
    
    await systemService!.saveDatabaseConfig(dbConfig);
    
    res.json({ 
      success: true, 
      message: 'Database configuration updated successfully'
    });
  } catch (error: unknown) {
    console.error('Error updating database config:', error);
    res.status(500).json({ error: 'Failed to update database configuration' });
  }
});

// Test database connection
app.post('/api/settings/database/test', async (req: Request, res: Response) => {
  try {
    const { host, port, database, username, password, ssl } = req.body;
    
    // Create connection string for testing
    const connectionUrl = `mysql://${username}:${password || ''}@${host}:${port}/${database}${ssl ? '?ssl=true' : ''}`;
    
    let testPool: mysql.Pool | null = null;
    try {
      testPool = mysql.createPool(connectionUrl);
      const connection = await testPool.getConnection();
      await connection.ping();
      connection.release();
      
      res.json({ 
        success: true, 
        message: 'Database connection successful'
      });
    } catch (dbError: any) {
      res.json({ 
        success: false, 
        error: `Connection failed: ${dbError.message}`
      });
    } finally {
      if (testPool) {
        await testPool.end();
      }
    }
  } catch (error: unknown) {
    console.error('Error testing database connection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test database connection' 
    });
  }
});

// Update AI configuration
app.post('/api/settings/ai', async (req: Request, res: Response) => {
  try {
    const { name, enabled, apiKey, model, temperature, maxTokens } = req.body;
    
    // Validate required fields when enabled
    if (enabled && !apiKey) {
      return res.status(400).json({ 
        error: 'API Key is required when AI is enabled' 
      });
    }
    
    // Validate model and parameters
    if (enabled) {
      if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: 'Model is required and must be a string' });
      }
      
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 1) {
        return res.status(400).json({ error: 'Temperature must be a number between 0 and 1' });
      }
      
      if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 4000) {
        return res.status(400).json({ error: 'Max tokens must be a number between 1 and 4000' });
      }
    }
    
    const aiSettings: Omit<AISettingsDB, 'id'> = {
      name: name || 'Custom Configuration',
      enabled,
      apiKey,
      model,
      temperature,
      maxTokens,
      is_active: true,
      is_default: true // Make this the new default
    };
    
    await systemService!.saveAISettings(aiSettings);
    
    // Update the OpenAI service with new settings
    if (enabled && apiKey) {
      try {
        const aiConfig: AIConfig = { enabled, apiKey, model, temperature, maxTokens };
        openaiService.updateConfig(aiConfig);
      } catch (error) {
        console.warn('Failed to update OpenAI service config:', error);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'AI configuration updated successfully'
    });
  } catch (error: unknown) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// Test AI connection
app.post('/api/settings/ai/test', async (req: Request, res: Response) => {
  try {
    const { enabled, apiKey, model } = req.body;
    
    if (!enabled) {
      return res.json({ 
        success: false, 
        error: 'AI is disabled in configuration'
      });
    }
    
    if (!apiKey) {
      return res.json({ 
        success: false, 
        error: 'API Key is required for testing'
      });
    }
    
    // Test with temporary OpenAI instance
    try {
      const { OpenAI } = await import('openai');
      const testClient = new OpenAI({ apiKey });
      
      await testClient.chat.completions.create({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      });
      
      res.json({ 
        success: true, 
        message: 'AI connection successful'
      });
    } catch (aiError: any) {
      res.json({ 
        success: false, 
        error: `AI connection failed: ${aiError.message}`
      });
    }
  } catch (error: unknown) {
    console.error('Error testing AI connection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test AI connection' 
    });
  }
});

// Get all database configurations
app.get('/api/databases', async (req: Request, res: Response) => {
  try {
    const databases = await systemService!.getDatabaseConfigs();
    res.json(databases);
  } catch (error: unknown) {
    console.error('Error fetching database configs:', error);
    res.status(500).json({ error: 'Failed to fetch database configurations' });
  }
});

// Switch to a different database (make it the new default)
app.post('/api/databases/:id/switch', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const databaseId = parseInt(id);
    
    if (isNaN(databaseId)) {
      return res.status(400).json({ error: 'Invalid database ID' });
    }
    
    // Get all databases and find the target one
    const databases = await systemService!.getDatabaseConfigs();
    const targetDb = databases.find((db: DatabaseConfig) => db.id === databaseId);
    
    if (!targetDb) {
      return res.status(404).json({ error: 'Database configuration not found' });
    }
    
    // Update the target database to be the default
    const updatedConfig: Omit<DatabaseConfig, 'id'> = {
      ...targetDb,
      is_default: true
    };
    
    await systemService!.saveDatabaseConfig(updatedConfig);
    
    res.json({ 
      success: true, 
      message: `Switched to database: ${targetDb.name}`,
      database: updatedConfig
    });
  } catch (error: unknown) {
    console.error('Error switching database:', error);
    res.status(500).json({ error: 'Failed to switch database' });
  }
});

// Generate query endpoint with OpenAI and fallback pattern matching
app.post('/api/generate-query', async (req: Request, res: Response) => {
  try {
    const { prompt, useAI = true } = req.body;

    // Validate input
    const validation = validatePrompt(prompt);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Load rules
    const rules = currentSettings || await loadRulesFromFile();
    if (!currentSettings) {
      currentSettings = rules; // Cache for next time
    }

    // Try OpenAI first if enabled and requested
    if (useAI && openaiService.enabled) {
      try {
        const aiResult = await openaiService.generateQuery({
          prompt,
          schema: rules.schema
        });

        if (aiResult) {
          return res.json({
            sql: aiResult.sql,
            confidence: aiResult.confidence,
            source: 'openai',
            reasoning: aiResult.reasoning,
            tables_used: aiResult.tables_used,
            matchedPattern: {
              intent: 'ai_generated',
              description: aiResult.reasoning,
              keywords: []
            },
            extractedValues: []
          });
        }
      } catch (aiError) {
        console.warn('OpenAI query generation failed, falling back to pattern matching:', aiError);
        // Continue to pattern matching fallback
      }
    }

    // Fallback to pattern matching
    const sanitizedPrompt = sanitizeInput(prompt);
    const promptWords: string[] = sanitizedPrompt.match(/\w+/g) || [];

    let bestMatch = { 
      score: 0, 
      pattern: null as QueryPattern | null,
      extractedValues: [] as string[]
    };

    for (const pattern of rules.query_patterns) {
      let score = 0;
      const extractedValues: string[] = [];

      // Score based on keyword matches
      for (const keyword of pattern.keywords) {
        const keywordIndex = promptWords.indexOf(keyword);
        if (keywordIndex !== -1) {
          score++;
          // Try to extract value near the keyword
          const nextWord = promptWords[keywordIndex + 1];
          const prevWord = promptWords[keywordIndex - 1];
          
          if (nextWord && !pattern.keywords.includes(nextWord)) {
            extractedValues.push(nextWord);
          } else if (prevWord && !pattern.keywords.includes(prevWord)) {
            extractedValues.push(prevWord);
          }
        }
      }

      // Bonus points for higher keyword density
      const keywordDensity = score / pattern.keywords.length;
      const adjustedScore = score + (keywordDensity * 0.5);

      if (adjustedScore > bestMatch.score) {
        bestMatch = { score: adjustedScore, pattern, extractedValues };
      }
    }

    if (!bestMatch.pattern || bestMatch.score === 0) {
      return res.status(404).json({ 
        error: 'Could not find a matching query pattern for the prompt.',
        suggestion: 'Try rephrasing your query or use keywords like: ' + 
          rules.query_patterns.flatMap(p => p.keywords).slice(0, 5).join(', '),
        availablePatterns: rules.query_patterns.map(p => ({
          description: p.description,
          keywords: p.keywords.slice(0, 3)
        })).slice(0, 3),
        aiEnabled: openaiService.enabled
      });
    }

    // Extract value for template replacement
    let finalSql = bestMatch.pattern.template;
    const templatePlaceholders = (bestMatch.pattern.template.match(/\?/g) || []).length;
    
    if (templatePlaceholders > 0) {
      // Find values that aren't keywords
      const matchedKeywords = new Set(bestMatch.pattern.keywords);
      const availableValues = promptWords.filter(word => 
        !matchedKeywords.has(word) && 
        word.length > 1 && 
        !['the', 'and', 'or', 'in', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
      );

      if (availableValues.length === 0) {
        return res.status(400).json({ 
          error: 'Could not extract a value from the prompt to complete the query.',
          template: bestMatch.pattern.template,
          keywords: bestMatch.pattern.keywords,
          suggestion: 'Try including specific values like state names, categories, or IDs in your query.',
          aiEnabled: openaiService.enabled
        });
      }

      // Replace placeholders with extracted values
      let valueIndex = 0;
      finalSql = finalSql.replace(/\?/g, () => {
        return availableValues[valueIndex % availableValues.length] || 'unknown';
      });
    }

    res.json({ 
      sql: finalSql,
      confidence: Math.min(bestMatch.score / bestMatch.pattern.keywords.length, 1),
      source: 'pattern_matching',
      matchedPattern: {
        intent: bestMatch.pattern.intent,
        description: bestMatch.pattern.description,
        keywords: bestMatch.pattern.keywords
      },
      extractedValues: bestMatch.extractedValues,
      aiEnabled: openaiService.enabled
    });

  } catch (error: any) {
    console.error('Error processing generate-query:', error);
    res.status(500).json({ 
      error: 'Internal server error while generating query',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Validate and execute query endpoint
app.post('/api/validate-query', async (req: Request, res: Response) => {
    try {
        const { query } = req.body;

        // Validate input
        const validation = validateSqlQuery(query);
        if (!validation.isValid) {
            return res.status(400).json({ 
                isValid: false, 
                error: validation.error 
            });
        }

        // Check if database is available
        if (!getDestinationPool()) {
            return res.status(503).json({ 
                isValid: false, 
                error: 'Database not configured. Please set DATABASE_URL environment variable.',
                syntaxValid: true  // We can't check syntax without DB, but assume it's fine
            });
        }

        let connection: mysql.PoolConnection | undefined;
        try {
            connection = await getDestinationPool()!.getConnection();

            // 1. First validate syntax with EXPLAIN (dry run)
            const explainQuery = `EXPLAIN ${query.trim()}`;
            const explainResult = await connection.query(explainQuery);
            console.log('explainResult', explainResult);

            // 2. If syntax validation passes, run the actual query with safety measures
            let safeQuery = query.trim();
            
            // Ensure query has a reasonable LIMIT
            if (!safeQuery.toLowerCase().includes('limit')) {
                safeQuery = `${safeQuery} LIMIT 50`;
            }

            // Add timeout for long-running queries
            const queryPromise = getDestinationPool()!.execute(safeQuery);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Query timeout (30s)')), 30000);
            });

            const [rows] = await Promise.race([queryPromise, timeoutPromise]) as any;
            
            // Process results
            const data = Array.isArray(rows) ? rows : [rows];
            const rowCount = data.length;

            res.json({ 
                isValid: true, 
                syntaxValid: true,
                data: data,
                rowCount,
                executionTime: new Date().toISOString(),
                limited: !query.toLowerCase().includes('limit')
            });

        } catch (error: any) {
            console.error('Query validation/execution error:', error);
            
            // Distinguish between syntax errors and execution errors
            const isSyntaxError = error.code === 'ER_PARSE_ERROR' || 
                                  error.message.includes('syntax') ||
                                  error.message.includes('SQL syntax');
            
            res.status(400).json({ 
                isValid: false,
                syntaxValid: !isSyntaxError,
                error: error.message,
                errorCode: error.code,
                sqlState: error.sqlState,
                suggestion: isSyntaxError ? 
                    'Check your SQL syntax for typos or missing keywords' :
                    'The query is syntactically correct but failed to execute. Check table/column names.'
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }

    } catch (error: any) {
        console.error('Validation endpoint error:', error);
        res.status(500).json({ 
            isValid: false,
            error: 'Internal server error during validation',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default app;

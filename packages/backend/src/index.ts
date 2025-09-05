import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import openaiService from './services/openaiService';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Create a MySQL connection pool with error handling
const createPool = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not configured. Query validation will not work.');
    return null;
  }

  try {
    return mysql.createPool(databaseUrl);
  } catch (error: unknown) {
    console.error('Failed to create database pool:', error);
    return null;
  }
};

const pool = createPool();

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

// Define types for our rules file
interface QueryPattern {
  intent: string;
  template: string;
  description: string;
  keywords: string[];
  examples?: string[];
}

interface Rules {
  schema: Record<string, { columns: string[]; description: string; }>;
  query_patterns: QueryPattern[];
}

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
  
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return { isValid: false, error: 'Query cannot be empty' };
  }
  
  // Basic SQL injection prevention - check for dangerous keywords
  const dangerousPatterns = [
    /\b(drop|delete|truncate|alter|create|grant|revoke)\b/i,
    /;\s*drop\b/i,
    /;\s*delete\b/i,
    /union.*select/i,
    /'.*;\s*--/i
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
      'GET /api/patterns'
    ],
    database: pool ? 'connected' : 'not configured'
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
    if (pool) {
      try {
        const connection = await pool.getConnection();
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
    const rulesPath = path.join(__dirname, 'rules.json');
    const rulesFile = await fs.readFile(rulesPath, 'utf-8');
    const rules: Rules = JSON.parse(rulesFile);

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
    const rulesPath = path.join(__dirname, 'rules.json');
    const rulesFile = await fs.readFile(rulesPath, 'utf-8');
    const rules: Rules = JSON.parse(rulesFile);

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
        if (!pool) {
            return res.status(503).json({ 
                isValid: false, 
                error: 'Database not configured. Please set DATABASE_URL environment variable.',
                syntaxValid: true  // We can't check syntax without DB, but assume it's fine
            });
        }

        let connection: mysql.PoolConnection | undefined;
        try {
            connection = await pool.getConnection();

            // 1. First validate syntax with EXPLAIN (dry run)
            const explainQuery = `EXPLAIN ${query.trim()}`;
            await connection.query(explainQuery);

            // 2. If syntax validation passes, run the actual query with safety measures
            let safeQuery = query.trim();
            
            // Ensure query has a reasonable LIMIT
            if (!safeQuery.toLowerCase().includes('limit')) {
                safeQuery = `${safeQuery} LIMIT 50`;
            }

            // Add timeout for long-running queries
            const queryPromise = connection.query(safeQuery);
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

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

export default app;

import { Request, Response } from 'express';
import openaiService from '../services/openaiService';
import { getCachedRules, loadRulesFromFile, QueryPattern } from '../services/rulesService';
import { sanitizeInput } from '../utils/validators';
import { databaseService } from '../services/databaseSystemService';
import { queryLogService } from '../services/queryLogService';

export const getPatterns = async (_req: Request, res: Response) => {
  try {
    const rules = await getCachedRules();
    const patterns = rules.query_patterns.map((pattern) => ({
      intent: pattern.intent,
      description: pattern.description,
      keywords: pattern.keywords,
      examples: pattern.examples || []
    }));
    
    // Get dynamic schema from the active database instead of static rules.json
    const dynamicSchema = await databaseService.getDatabaseSchema();
    
    return res.json({ 
      patterns, 
      schema: dynamicSchema, // Use dynamic schema instead of rules.schema
      total: patterns.length 
    });
  } catch (error) {
    console.error('Failed to fetch query patterns:', error);
    return res.status(500).json({ error: 'Failed to fetch query patterns' });
  }
};

export const generateQuery = async (req: Request, res: Response) => {
  const startTime = Date.now();
  let generatedSql: string | null = null;
  let confidence: number | null = null;
  
  try {
    const { prompt, useAI = true } = req.body as { prompt: string; useAI?: boolean };
    
    // Extract user session and IP for logging
    const userSession = req.headers['x-session-id'] as string || 'anonymous';
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

    // Load rules (cached)
    const rules = await getCachedRules();
    
    // Get dynamic schema from the active database
    const dynamicSchema = await databaseService.getDatabaseSchema();

    // Try OpenAI first if enabled and requested
    if (useAI && openaiService.enabled) {
      try {
        const aiResult = await openaiService.generateQuery({ prompt, schema: dynamicSchema });
        if (aiResult) {
          generatedSql = aiResult.sql;
          confidence = aiResult.confidence;
          
          // Log successful AI query generation
          await queryLogService.logQuery({
            natural_language_query: prompt,
            generated_sql: generatedSql,
            execution_status: 'success',
            confidence_score: confidence,
            execution_time_ms: Date.now() - startTime,
            user_session: userSession,
            ip_address: ipAddress
          });
          
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
      } catch {
        // fallthrough to pattern matching
      }
    }

    // Pattern matching fallback
    const sanitizedPrompt = sanitizeInput(prompt);
    const promptWords: string[] = sanitizedPrompt.match(/\w+/g) || [];

    let bestMatch = { score: 0, pattern: null as QueryPattern | null, extractedValues: [] as string[] };
    for (const pattern of rules.query_patterns) {
      let score = 0;
      const extractedValues: string[] = [];
      for (const keyword of pattern.keywords) {
        const idx = promptWords.indexOf(keyword);
        if (idx !== -1) {
          score++;
          const nextWord = promptWords[idx + 1];
          const prevWord = promptWords[idx - 1];
          if (nextWord && !pattern.keywords.includes(nextWord)) extractedValues.push(nextWord);
          else if (prevWord && !pattern.keywords.includes(prevWord)) extractedValues.push(prevWord);
        }
      }
      const keywordDensity = score / pattern.keywords.length;
      const adjustedScore = score + keywordDensity * 0.5;
      if (adjustedScore > bestMatch.score) bestMatch = { score: adjustedScore, pattern, extractedValues };
    }

    if (!bestMatch.pattern || bestMatch.score === 0) {
      // Log failed pattern matching
      await queryLogService.logQuery({
        natural_language_query: prompt,
        execution_status: 'validation_error',
        execution_time_ms: Date.now() - startTime,
        error_message: 'Could not find a matching query pattern for the prompt',
        user_session: userSession,
        ip_address: ipAddress
      });
      
      const rulesFromFile = await loadRulesFromFile();
      return res.status(404).json({
        error: 'Could not find a matching query pattern for the prompt.',
        suggestion:
          'Try rephrasing your query or use keywords like: ' + rulesFromFile.query_patterns.flatMap((p) => p.keywords).slice(0, 5).join(', '),
        availablePatterns: rulesFromFile.query_patterns
          .map((p) => ({ description: p.description, keywords: p.keywords.slice(0, 3) }))
          .slice(0, 3),
        aiEnabled: openaiService.enabled
      });
    }

    let finalSql = bestMatch.pattern.template;
    const templatePlaceholders = (bestMatch.pattern.template.match(/\?/g) || []).length;
    if (templatePlaceholders > 0) {
      const matchedKeywords = new Set(bestMatch.pattern.keywords);
      const availableValues = promptWords.filter(
        (word) => !matchedKeywords.has(word) && word.length > 1 && !['the', 'and', 'or', 'in', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
      );
      if (availableValues.length === 0) {
        // Log failed value extraction
        await queryLogService.logQuery({
          natural_language_query: prompt,
          generated_sql: bestMatch.pattern.template,
          execution_status: 'validation_error',
          execution_time_ms: Date.now() - startTime,
          error_message: 'Could not extract a value from the prompt to complete the query',
          user_session: userSession,
          ip_address: ipAddress
        });
        
        return res.status(400).json({
          error: 'Could not extract a value from the prompt to complete the query.',
          template: bestMatch.pattern.template,
          keywords: bestMatch.pattern.keywords,
          suggestion: 'Try including specific values like state names, categories, or IDs in your query.',
          aiEnabled: openaiService.enabled
        });
      }
      let valueIndex = 0;
      finalSql = finalSql.replace(/\?/g, () => availableValues[valueIndex++ % availableValues.length] || 'unknown');
    }

    generatedSql = finalSql;
    confidence = Math.min(bestMatch.score / bestMatch.pattern.keywords.length, 1);
    
    // Log successful pattern matching
    await queryLogService.logQuery({
      natural_language_query: prompt,
      generated_sql: generatedSql,
      execution_status: 'success',
      confidence_score: confidence,
      execution_time_ms: Date.now() - startTime,
      user_session: userSession,
      ip_address: ipAddress
    });

    return res.json({
      sql: finalSql,
      confidence: confidence,
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
    // Log internal server error
    const userSession = req.headers['x-session-id'] as string || 'anonymous';
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    
    await queryLogService.logQuery({
      natural_language_query: req.body?.prompt || 'unknown',
      generated_sql: generatedSql || undefined,
      execution_status: 'execution_error',
      execution_time_ms: Date.now() - startTime,
      error_message: error.message,
      user_session: userSession,
      ip_address: ipAddress
    });
    
    return res.status(500).json({ error: 'Internal server error while generating query', message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

export const getQueryLogs = async (req: Request, res: Response) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const logs = await queryLogService.getQueryLogs(
      Math.min(Number(limit), 1000), // Cap at 1000 for performance
      Number(offset)
    );
    
    return res.json({
      logs,
      total: logs.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error: any) {
    console.error('Failed to fetch query logs:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch query logs', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

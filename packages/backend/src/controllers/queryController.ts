import { Request, Response } from 'express';
import openaiService from '../services/openaiService';
import { getCachedRules, loadRulesFromFile, QueryPattern } from '../services/rulesService';
import { sanitizeInput } from '../utils/validators';
import { databaseService } from '../services/databaseSystemService';

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
  try {
    const { prompt, useAI = true } = req.body as { prompt: string; useAI?: boolean };

    // Load rules (cached)
    const rules = await getCachedRules();
    
    // Get dynamic schema from the active database
    const dynamicSchema = await databaseService.getDatabaseSchema();

    // Try OpenAI first if enabled and requested
    if (useAI && openaiService.enabled) {
      try {
        const aiResult = await openaiService.generateQuery({ prompt, schema: dynamicSchema });
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

    return res.json({
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
    return res.status(500).json({ error: 'Internal server error while generating query', message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

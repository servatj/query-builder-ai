import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

interface QueryGenerationRequest {
  prompt: string;
  schema: Record<string, { columns: string[]; description: string }>;
}

interface QueryGenerationResponse {
  sql: string;
  confidence: number;
  reasoning: string;
  tables_used: string[];
}

interface AIConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

class OpenAIService {
  private openai: OpenAI | null = null;
  private isEnabled = false;
  private config: AIConfig = {
    enabled: false,
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    temperature: 0.2,
    maxTokens: 2000
  };

  constructor() {
    // Try to initialize with environment variable first
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (apiKey && apiKey.length > 0) {
      this.config.enabled = true;
      this.config.apiKey = apiKey;
      this.initializeOpenAI();
    } else {
      console.log('ℹ️  OpenAI API key not found. AI-enhanced query generation disabled.');
      this.isEnabled = false;
    }
  }

  private initializeOpenAI() {
    try {
      this.openai = new OpenAI({ apiKey: this.config.apiKey });
      this.isEnabled = this.config.enabled;
      console.log('✅ OpenAI service initialized');
    } catch (error) {
      console.warn('⚠️  Failed to initialize OpenAI service:', error);
      this.isEnabled = false;
    }
  }

  public get enabled(): boolean {
    return this.isEnabled && this.openai !== null;
  }

  public updateConfig(newConfig: AIConfig): void {
    this.config = { ...newConfig };
    
    if (this.config.enabled && this.config.apiKey) {
      this.initializeOpenAI();
    } else {
      this.isEnabled = false;
      this.openai = null;
    }
  }

  public getConfig(): AIConfig {
    return { ...this.config };
  }

  private sanitizeJsonString(jsonStr: string): string {
    // Remove markdown code blocks if present
    let cleaned = jsonStr.replace(/```json\s*|```\s*/g, '').trim();
    
    // Replace common problematic control characters in string values
    try {
      // First try to parse as-is
      JSON.parse(cleaned);
      return cleaned;
    } catch (e) {
      // If that fails, try more aggressive cleaning
      // Replace literal newlines, tabs, and carriage returns within strings
      cleaned = cleaned.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
        return match
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
          .replace(/[\x00-\x1F\x7F]/g, ''); // Remove other control characters
      });
      return cleaned;
    }
  }

  public async generateQuery(request: QueryGenerationRequest): Promise<QueryGenerationResponse | null> {
    if (!this.enabled || !this.openai) {
      return null;
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request.schema);
      const userPrompt = this.buildUserPrompt(request.prompt);

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const sanitizedResponse = this.sanitizeJsonString(response);
      const parsed = JSON.parse(sanitizedResponse) as QueryGenerationResponse;
      
      // Validate the response has required fields
      if (!parsed.sql || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response format from OpenAI');
      }

      // Ensure confidence is between 0 and 1
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

      return parsed;
    } catch (error) {
      console.error('OpenAI query generation error:', error);
      return null;
    }
  }

  private buildSystemPrompt(schema: Record<string, { columns: string[]; description: string }>): string {
    const schemaDescription = Object.entries(schema)
      .map(([table, info]) => `Table: ${table}\nColumns: ${info.columns.join(', ')}\nDescription: ${info.description}\n`)
      .join('\n');

    return `You are an expert SQL query generator specialized in MySQL. Your task is to convert natural language requests into precise, executable SQL queries.

DATABASE SCHEMA:
${schemaDescription}

CRITICAL RULES FOR SQL GENERATION:
1. ONLY use tables and columns that EXACTLY match the schema above
2. Use proper MySQL syntax (backticks for identifiers if needed)
3. Analyze relationships between tables based on common column names (e.g., actor_id, film_id)
4. Use appropriate JOINs when multiple tables are needed
5. Always include WHERE clauses when filtering is mentioned
6. Add ORDER BY for "top", "most", "best" queries
7. Include LIMIT clauses (default LIMIT 10-20 for safety)
8. Use meaningful table aliases (e.g., 'f' for film, 'a' for actor)
9. For text searches, use LIKE with wildcards: WHERE column LIKE '%value%'
10. Handle possessive/plural forms intelligently (e.g., "films" → film table, "actors" → actor table)

CONFIDENCE SCORING (be realistic):
- 0.9-1.0: Exact match with clear schema mapping
- 0.7-0.8: Good match with minor ambiguity
- 0.5-0.6: Requires assumptions
- Below 0.5: High uncertainty

RESPONSE FORMAT (MUST BE VALID JSON):
{
  "sql": "YOUR_SQL_QUERY_HERE",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of table joins, filters, and logic",
  "tables_used": ["table1", "table2"]
}

IMPORTANT: 
- Return ONLY the JSON object, no markdown, no code blocks, no extra text
- Put the entire SQL query on one line
- Escape quotes properly in the SQL string
- Be confident when the query clearly matches the schema

EXAMPLE:
{
  "sql": "SELECT f.title, a.first_name, a.last_name FROM film f JOIN film_actor fa ON f.film_id = fa.film_id JOIN actor a ON fa.actor_id = a.actor_id WHERE CONCAT(a.first_name, ' ', a.last_name) LIKE '%Smith%' LIMIT 20",
  "confidence": 0.95,
  "reasoning": "Query finds films with actors matching 'Smith'. Joined film, film_actor, and actor tables using proper foreign keys. Used CONCAT and LIKE for name matching.",
  "tables_used": ["film", "film_actor", "actor"]
}`;
  }

  private buildUserPrompt(naturalLanguageQuery: string): string {
    return `Natural language request: "${naturalLanguageQuery}"

Analyze this request carefully:
1. Identify key entities (tables) mentioned
2. Determine required columns based on the request
3. Identify any filters, conditions, or sorting needed
4. Generate the most accurate SQL query possible

Respond with the JSON object containing sql, confidence, reasoning, and tables_used.`;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.enabled || !this.openai) {
      return false;
    }

    try {
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      });
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const openaiService = new OpenAIService();
export default openaiService;
export type { AIConfig };

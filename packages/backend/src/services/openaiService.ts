import OpenAI from 'openai';

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

class OpenAIService {
  private openai: OpenAI | null = null;
  private isEnabled = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (apiKey && apiKey.length > 0) {
      try {
        this.openai = new OpenAI({ apiKey });
        this.isEnabled = true;
        console.log('✅ OpenAI service initialized');
      } catch (error) {
        console.warn('⚠️  Failed to initialize OpenAI service:', error);
        this.isEnabled = false;
      }
    } else {
      console.log('ℹ️  OpenAI API key not found. AI-enhanced query generation disabled.');
      this.isEnabled = false;
    }
  }

  public get enabled(): boolean {
    return this.isEnabled && this.openai !== null;
  }

  public async generateQuery(request: QueryGenerationRequest): Promise<QueryGenerationResponse | null> {
    if (!this.enabled || !this.openai) {
      return null;
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request.schema);
      const userPrompt = this.buildUserPrompt(request.prompt);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(response) as QueryGenerationResponse;
      
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
      .map(([table, info]) => `${table}: ${info.columns.join(', ')} (${info.description})`)
      .join('\n');

    return `You are an expert SQL query generator. Convert natural language requests into SQL queries using the provided database schema.

Database Schema:
${schemaDescription}

Rules:
1. Only use tables and columns that exist in the schema
2. Use proper SQL syntax for MySQL
3. Include appropriate WHERE clauses, JOINs, and ORDER BY when needed
4. Add LIMIT clauses for potentially large result sets
5. Use meaningful aliases for better readability
6. Prioritize data safety - avoid destructive operations

Response Format:
Return a JSON object with:
- sql: The generated SQL query (string)
- confidence: Your confidence in the query (0.0 to 1.0)  
- reasoning: Brief explanation of your approach (string)
- tables_used: Array of table names used in the query (array)

Example:
{
  "sql": "SELECT u.name, COUNT(o.id) as order_count FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id, u.name ORDER BY order_count DESC LIMIT 10",
  "confidence": 0.9,
  "reasoning": "Generated a query to find users with the most orders by joining users and orders tables, grouping by user, and ordering by order count.",
  "tables_used": ["users", "orders"]
}`;
  }

  private buildUserPrompt(naturalLanguageQuery: string): string {
    return `Convert this natural language request into a SQL query:

"${naturalLanguageQuery}"

Please provide the response as a JSON object with the required fields.`;
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
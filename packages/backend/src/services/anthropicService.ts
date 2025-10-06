import Anthropic from '@anthropic-ai/sdk';
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

interface AnthropicConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

class AnthropicService {
  private anthropic: Anthropic | null = null;
  private isEnabled = false;
  private config: AnthropicConfig = {
    enabled: false,
    apiKey: '',
    model: 'claude-3-5-haiku-20241022',
    temperature: 0.3,
    maxTokens: 1000
  };

  constructor() {
    // Try to initialize with environment variable first
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (apiKey && apiKey.length > 0) {
      this.config.enabled = true;
      this.config.apiKey = apiKey;
      this.initializeAnthropic();
    } else {
      console.log('ℹ️  Anthropic API key not found. AI-enhanced query generation disabled.');
      this.isEnabled = false;
    }
  }

  private initializeAnthropic() {
    try {
      this.anthropic = new Anthropic({ apiKey: this.config.apiKey });
      this.isEnabled = this.config.enabled;
      console.log('✅ Anthropic service initialized');
    } catch (error) {
      console.warn('⚠️  Failed to initialize Anthropic service:', error);
      this.isEnabled = false;
    }
  }

  public get enabled(): boolean {
    return this.isEnabled && this.anthropic !== null;
  }

  public updateConfig(newConfig: AnthropicConfig): void {
    this.config = { ...newConfig };
    
    if (this.config.enabled && this.config.apiKey) {
      this.initializeAnthropic();
    } else {
      this.isEnabled = false;
      this.anthropic = null;
    }
  }

  public getConfig(): AnthropicConfig {
    return { ...this.config };
  }

  private sanitizeJsonString(jsonStr: string): string {
    // Remove markdown code blocks if present
    let cleaned = jsonStr.replace(/```json\s*|```\s*/g, '').trim();
    
    // Replace common problematic control characters in string values
    // This regex finds string values and cleans them
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
    if (!this.enabled || !this.anthropic) {
      return null;
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request.schema);
      const userPrompt = this.buildUserPrompt(request.prompt);

      const message = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }

      const sanitizedText = this.sanitizeJsonString(response.text);
      const parsed = JSON.parse(sanitizedText) as QueryGenerationResponse;
      
      // Validate the response has required fields
      if (!parsed.sql || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response format from Anthropic');
      }

      // Ensure confidence is between 0 and 1
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

      return parsed;
    } catch (error) {
      console.error('Anthropic query generation error:', error);
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
Return a valid JSON object with:
- sql: The generated SQL query (string) - keep it on one line, no newlines
- confidence: Your confidence in the query (0.0 to 1.0)  
- reasoning: Brief explanation of your approach (string) - use plain text, no newlines
- tables_used: Array of table names used in the query (array)

IMPORTANT: Return ONLY valid JSON. Do not include markdown formatting, code blocks, or explanatory text.
Ensure all strings are properly escaped and contain no literal newlines or control characters.

Example:
{
  "sql": "SELECT fn_bin2uuid(user_profile_id) AS user_profile_id, user_profile_email, user_profile_status FROM users_profiles WHERE user_profile_is_deleted = 0 ORDER BY user_profile_updated_at DESC LIMIT 10",
  "confidence": 0.9,
  "reasoning": "Generated a query to list recent active user profiles selecting basic fields, filtering out deleted profiles, ordered by update time with a limit.",
  "tables_used": ["users_profiles"]
}`;
  }

  private buildUserPrompt(naturalLanguageQuery: string): string {
    return `Convert this natural language request into a SQL query:

"${naturalLanguageQuery}"

Please provide the response as a JSON object with the required fields.`;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.enabled || !this.anthropic) {
      return false;
    }

    try {
      await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test connection' }]
      });
      return true;
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const anthropicService = new AnthropicService();
export default anthropicService;
export type { AnthropicConfig };

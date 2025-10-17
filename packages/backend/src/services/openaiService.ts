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

IMPORTANT SCHEMA ANALYSIS:
- Look for tables with compound names (e.g., film_actor, film_category) - these are junction tables linking two entities
- Foreign keys typically follow the pattern: table_id (e.g., actor_id links to actor table, film_id links to film table)
- For relationships like "actors in horror films", chain through: actor → film_actor → film → film_category → category
- For relationships like "rented films", chain through: film → inventory → rental
- Junction tables (film_actor, film_category, etc.) are bridges - ALWAYS join through them when connecting entities

CRITICAL RULES FOR SQL GENERATION:
1. ONLY use tables and columns that EXACTLY match the schema above
2. Use proper MySQL syntax (backticks for identifiers if needed)
3. ANALYZE THE SCHEMA FIRST: Identify junction tables and foreign key relationships before writing SQL
4. For many-to-many relationships, ALWAYS join through junction tables (e.g., film_actor links film and actor)
5. Chain JOINs properly: If querying "actors in horror films", join actor → film_actor → film → film_category → category
6. Always include WHERE clauses when filtering (e.g., WHERE category.name = 'Horror')
7. Add ORDER BY for "top", "most", "best" queries, plus COUNT/GROUP BY for aggregations
8. ALWAYS include LIMIT with a NUMERIC value at the end (e.g., LIMIT 10, LIMIT 20) - NEVER omit LIMIT, NEVER use words
9. Use meaningful table aliases (e.g., 'f' for film, 'a' for actor, 'fa' for film_actor)
10. For text searches, use LIKE with wildcards: WHERE column LIKE '%value%'
11. Handle possessive/plural forms intelligently (e.g., "films" → film table, "actors" → actor table)
12. ALWAYS select primary identifier columns FIRST (e.g., film_id, title for films; actor_id, first_name, last_name for actors)
13. For "show all X" queries, select the most relevant columns: IDs, names/titles, and 2-3 key descriptive fields

IMPORTANT REQUIREMENTS:
- LIMIT clause is MANDATORY - every query must end with "LIMIT <number>"
- LIMIT must be a number (10-50 typical), never a word or variable
- Always select identifier columns first (e.g., film_id, title) before detail columns
- For "show/list all" queries, select: ID, name/title, and 2-3 most important descriptive columns

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

EXAMPLES:

Example 1 - Show all films:
{
  "sql": "SELECT film_id, title, description, release_year, rating, length FROM film ORDER BY title LIMIT 20",
  "confidence": 0.95,
  "reasoning": "Query lists all films with most relevant columns. Selected film_id and title first (identifiers), then key descriptive fields. Ordered by title for readability. Included mandatory LIMIT.",
  "tables_used": ["film"]
}

Example 2 - Simple actor search:
{
  "sql": "SELECT f.film_id, f.title, a.first_name, a.last_name FROM film f JOIN film_actor fa ON f.film_id = fa.film_id JOIN actor a ON fa.actor_id = a.actor_id WHERE CONCAT(a.first_name, ' ', a.last_name) LIKE '%Smith%' LIMIT 20",
  "confidence": 0.95,
  "reasoning": "Query finds films with actors matching 'Smith'. Selected identifiers first (film_id, title, names). Joined through film_actor junction table. Used CONCAT and LIKE for name matching. Included mandatory LIMIT.",
  "tables_used": ["film", "film_actor", "actor"]
}

Example 3 - Category filtering with junction table:
{
  "sql": "SELECT a.actor_id, a.first_name, a.last_name, f.film_id, f.title FROM actor a JOIN film_actor fa ON a.actor_id = fa.actor_id JOIN film f ON fa.film_id = f.film_id JOIN film_category fc ON f.film_id = fc.film_id JOIN category c ON fc.category_id = c.category_id WHERE c.name = 'Horror' LIMIT 20",
  "confidence": 0.95,
  "reasoning": "Query finds actors in horror films. Selected all identifier columns first (actor_id, names, film_id, title). Identified film_category as junction table linking film to category. Chained JOINs: actor → film_actor → film → film_category → category, filtered by category name. Included mandatory LIMIT.",
  "tables_used": ["actor", "film_actor", "film", "film_category", "category"]
}

Example 4 - Top aggregation with proper grouping:
{
  "sql": "SELECT a.actor_id, a.first_name, a.last_name, COUNT(r.rental_id) AS rental_count FROM actor a JOIN film_actor fa ON a.actor_id = fa.actor_id JOIN film f ON fa.film_id = f.film_id JOIN inventory i ON f.film_id = i.film_id JOIN rental r ON i.inventory_id = r.inventory_id GROUP BY a.actor_id, a.first_name, a.last_name ORDER BY rental_count DESC LIMIT 10",
  "confidence": 0.90,
  "reasoning": "Query finds top rented actors. Selected identifier columns (actor_id, names) plus aggregated count. Chained actor → film_actor → film → inventory → rental. Grouped by actor, counted rentals, sorted descending. Included mandatory LIMIT.",
  "tables_used": ["actor", "film_actor", "film", "inventory", "rental"]
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

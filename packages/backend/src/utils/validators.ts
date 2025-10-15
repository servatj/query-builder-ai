import { z } from 'zod';

export const promptSchema = z.object({
  prompt: z.string().min(1).max(500),
  useAI: z.boolean().optional().default(true)
});

export const sqlQuerySchema = z.object({
  sql: z.string().min(1),
  execute: z.boolean().optional().default(false)
});

export const validatePrompt = (prompt: string): { isValid: boolean; error?: string } => {
  try {
    z.string().min(1).max(500).parse(prompt);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: error instanceof z.ZodError ? error.errors[0].message : 'Invalid prompt' };
  }
};

export const validateSqlQuery = (query: string): { isValid: boolean; error?: string } => {
  try {
    const schema = z.string().min(1).refine((q) => {
      const trimmed = q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').replace(/#.*/g, '').trim();
      if (trimmed.length === 0) return false;
      const lower = trimmed.toLowerCase();
      if (!lower.startsWith('select')) return false;
      const semicolonIndex = trimmed.indexOf(';');
      if (semicolonIndex !== -1 && semicolonIndex < trimmed.length - 1) return false;
      const dangerousPatterns = [
        /\b(drop|delete|truncate|alter|create|grant|revoke|insert|update|call|exec|execute)\b/i,
        /union\s+all?\s+select/i,
        /into\s+outfile/i,
        /load_file\s*\(/i,
        /sleep\s*\(/i,
        /benchmark\s*\(/i,
        /information_schema\./i,
      ];
      return !dangerousPatterns.some(p => p.test(trimmed));
    }, { message: 'Invalid SQL query' });
    schema.parse(query);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: error instanceof z.ZodError ? error.errors[0].message : 'Invalid SQL query' };
  }
};

export const sanitizeInput = (input: string): string => {
  return input.trim().toLowerCase().replace(/[^\w\s]/g, '');
};

// Best-effort SQL sanitizer for common LLM artifacts
// - Normalizes malformed LIMIT clauses like "LIMIT give" or "LIMIT twenty" to a safe numeric default
// - Ensures LIMIT value is a positive integer and caps it to a maximum
export const normalizeLimitClause = (sql: string, defaultLimit = 50, maxLimit = 500): string => {
  if (!sql) return sql;
  let normalized = sql;

  // If LIMIT is present but not followed by a number, replace with default
  normalized = normalized.replace(/\bLIMIT\s+(?!\d)\S+/gi, `LIMIT ${defaultLimit}`);

  // If LIMIT is followed by a non-integer (e.g., words), coerce to default
  normalized = normalized.replace(/\bLIMIT\s+([\w-]+)/gi, (_m, v: string) => {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return `LIMIT ${defaultLimit}`;
    const safe = Math.min(Math.max(n, 1), maxLimit);
    return `LIMIT ${safe}`;
  });

  return normalized;
};

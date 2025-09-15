import { z } from 'zod';

export const promptSchema = z.object({
  prompt: z.string().min(1).max(500),
  useAI: z.boolean().optional().default(true)
});

export const sqlQuerySchema = z.object({
  query: z.string().min(1)
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
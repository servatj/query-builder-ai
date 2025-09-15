import path from 'path';
import fs from 'fs/promises';

export interface QueryPattern {
  intent: string;
  template: string;
  description: string;
  keywords: string[];
  examples?: string[];
}

export interface Rules {
  schema: Record<string, { columns: string[]; description: string }>;
  query_patterns: QueryPattern[];
}

let cachedRules: Rules | null = null;

export const loadRulesFromFile = async (): Promise<Rules> => {
  if (cachedRules !== null) return cachedRules as Rules;
  const rulesPath = path.join(__dirname, '..', 'rules.json');
  const rulesFile = await fs.readFile(rulesPath, 'utf-8');
  cachedRules = JSON.parse(rulesFile);
  return cachedRules as Rules;
};

export const saveRulesToFile = async (rules: Rules): Promise<void> => {
  const rulesPath = path.join(__dirname, '..', 'rules.json');
  await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), 'utf-8');
  cachedRules = rules;
};

export const getCachedRules = async (): Promise<Rules> => {
  return cachedRules || loadRulesFromFile();
};

export const setCachedRules = (rules: Rules | null) => {
  cachedRules = rules;
};

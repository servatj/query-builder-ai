import fs from 'fs/promises';
import path from 'path';

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

const rulesPath = path.join(__dirname, '../rules.json');

export const loadRulesFromFile = async (): Promise<Rules> => {
  try {
    const rulesFile = await fs.readFile(rulesPath, 'utf-8');
    return JSON.parse(rulesFile) as Rules;
  } catch (error) {
    console.error('Failed to load rules from file:', error);
    throw new Error('Unable to load rules configuration');
  }
};

export const saveRulesToFile = async (rules: Rules): Promise<void> => {
  try {
    await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save rules to file:', error);
    throw new Error('Unable to save rules configuration');
  }
};
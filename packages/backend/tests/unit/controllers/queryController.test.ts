import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { getPatterns, generateQuery } from '../../../src/controllers/queryController';

vi.mock('../../../src/services/rulesService', () => ({
  getCachedRules: vi.fn().mockResolvedValue({
    schema: { users: { columns: ['id', 'name', 'email', 'state'], description: 'Users table' } },
    query_patterns: [
      {
        intent: 'find_users_by_state',
        template: "SELECT id, name, email FROM users WHERE state = '?'",
        description: 'Find users by state',
        keywords: ['users', 'state']
      },
      {
        intent: 'count_products_by_category',
        template: "SELECT COUNT(*) as product_count FROM products WHERE category = '?'",
        description: 'Count products by category',
        keywords: ['count', 'products']
      }
    ]
  }),
  loadRulesFromFile: vi.fn().mockResolvedValue({
    schema: {},
    query_patterns: [
      { intent: 'fallback', template: 'SELECT 1', description: 'fallback', keywords: ['x'] }
    ]
  })
}));

vi.mock('../../../src/services/openaiService', () => ({
  __esModule: true,
  default: { enabled: false, generateQuery: vi.fn() }
}));

const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
};

describe('queryController', () => {
  describe('getPatterns', () => {
    it('returns patterns and schema', async () => {
      const req = {} as Request;
      const res = createMockRes();
      await getPatterns(req, res);
      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.total).toBeGreaterThan(0);
      expect(payload.patterns[0]).toHaveProperty('intent');
    });
  });

  describe('generateQuery', () => {
    it('generates SQL via pattern matching', async () => {
      const req = { body: { prompt: 'show users from california', useAI: false } } as any as Request;
      const res = createMockRes();
      await generateQuery(req, res);
      expect(res.json).toHaveBeenCalled();
      const { sql, source } = res.json.mock.calls[0][0];
      expect(sql.toLowerCase()).toContain('select');
      expect(source).toBe('pattern_matching');
    });

    it('returns 404 when no pattern matches', async () => {
      const req = { body: { prompt: 'unrelated words', useAI: false } } as any as Request;
      const res = createMockRes();
      await generateQuery(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
  });
});

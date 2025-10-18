import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('AI Integration E2E Tests', () => {
  let aiEnabled = false;

  beforeAll(async () => {
    // Check if AI is enabled
    const health = await request(API_BASE_URL).get('/api/health');
    aiEnabled = health.body.ai_enabled === 'enabled';
    
    if (!aiEnabled) {
      console.warn('⚠️  AI is disabled. Some tests will be skipped.');
    }
  });

  describe('AI Query Generation', () => {
    it.only('should not generate queries even when AI is disabled (fallback)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: 'Show all actors' })
        .expect(200);

      expect(response.body).toHaveProperty('sql');
      // Check that the query has the essential elements, not exact match
      const sql = response.body.sql.toLowerCase();
      expect(sql).toContain('select');
      expect(sql).toContain('actor_id');
      expect(sql).toContain('first_name');
      expect(sql).toContain('last_name');
      expect(sql).toContain('from actor');
      expect(sql).toContain('order by');
      expect(response.body).toHaveProperty('confidence');
      expect(typeof response.body.confidence).toBe('number');
    });

    it('should handle various query types', async () => {
      const prompts = [
        'Count all actors',
        'List top 10 films',
        'Show customer names',
        'Find films by category Action'
      ];

      for (const prompt of prompts) {
        const response = await request(API_BASE_URL)
          .post('/api/generate-query')
          .send({ prompt })
          .expect(200);

        expect(response.body.sql).toBeDefined();
        expect(response.body.sql).toContain('SELECT');
      }
    });

    it('should provide confidence scores', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: 'Show all actors' })
        .expect(200);

      expect(response.body.confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.confidence).toBeLessThanOrEqual(1);
    });

    it('should include matched pattern information', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: 'Show all films' })
        .expect(200);

      if (response.body.matchedPattern) {
        expect(response.body.matchedPattern).toHaveProperty('intent');
        expect(response.body.matchedPattern).toHaveProperty('description');
      }
    });
  });

  describe('AI Settings', () => {
    it('should get AI configuration', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/settings')
        .expect(200);

      expect(response.body).toHaveProperty('ai');
      expect(response.body.ai).toHaveProperty('provider');
      expect(response.body.ai).toHaveProperty('enabled');
    });

    it.skipIf(!aiEnabled)('should test AI provider connection', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/settings/ai/test')
        .send({
          provider: 'anthropic',
          api_key: process.env.ANTHROPIC_API_KEY || 'test_key',
          model: 'claude-sonnet-4-20250514'
        });

      // Should either succeed or fail gracefully
      expect([200, 400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Query Pattern Matching', () => {
    it('should match simple patterns', async () => {
      const testCases = [
        { prompt: 'show all actors', expectedKeywords: ['actors', 'all'] },
        { prompt: 'count films', expectedKeywords: ['films', 'count'] },
        { prompt: 'list customers', expectedKeywords: ['customers', 'list'] }
      ];

      for (const testCase of testCases) {
        const response = await request(API_BASE_URL)
          .post('/api/generate-query')
          .send({ prompt: testCase.prompt })
          .expect(200);

        expect(response.body.sql).toBeDefined();
      }
    });

    it('should handle complex pattern matching', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({
          prompt: 'Show me the top 5 most rented films with their total revenue'
        })
        .expect(200);

      const sql = response.body.sql.toLowerCase();
      expect(sql).toContain('select');
      expect(sql).toMatch(/limit|top/);
    });
  });

  describe('Natural Language Understanding', () => {
    const testQueries = [
      {
        nl: 'How many actors are in the database?',
        expectedParts: ['COUNT', 'actor']
      },
      {
        nl: 'List all action movies',
        expectedParts: ['SELECT', 'film', 'category']
      },
      {
        nl: 'Show me customers from London',
        expectedParts: ['SELECT', 'customer', 'city']
      }
    ];

    testQueries.forEach(({ nl, expectedParts }) => {
      it(`should understand: "${nl}"`, async () => {
        const response = await request(API_BASE_URL)
          .post('/api/generate-query')
          .send({ prompt: nl })
          .expect(200);

        const sql = response.body.sql.toUpperCase();
        expectedParts.forEach(part => {
          expect(sql).toContain(part.toUpperCase());
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle ambiguous queries gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: 'show me data' })
        .expect(200);

      expect(response.body).toHaveProperty('sql');
      // Should return something, even if generic
    });

    it('should handle invalid prompts', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: '***invalid***' })
        .expect(200);

      expect(response.body).toHaveProperty('sql');
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'show me '.repeat(100) + 'all actors';
      
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: longPrompt })
        .expect(200);

      expect(response.body).toHaveProperty('sql');
    });
  });
});

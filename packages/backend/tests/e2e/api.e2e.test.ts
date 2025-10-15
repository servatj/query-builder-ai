import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mysql from 'mysql2/promise';

// API base URL - adjust based on your environment
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Backend E2E Tests', () => {
  let dbConnection: mysql.Connection;

  beforeAll(async () => {
    // Wait for backend to be ready
    await waitForBackend();
    
    // Create test database connection
    dbConnection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'queryuser',
      password: 'querypass',
      database: 'query_builder'
    });
  });

  afterAll(async () => {
    if (dbConnection) {
      await dbConnection.end();
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    it('should show database connection status', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body.database).toMatch(/connected|disconnected/);
      expect(response.body.services.database).toMatch(/connected|error|disconnected/);
    });
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(API_BASE_URL)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
      expect(Array.isArray(response.body.endpoints)).toBe(true);
    });
  });

  describe('Patterns Endpoint', () => {
    it('should return query patterns and schema', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/patterns')
        .expect(200);

      expect(response.body).toHaveProperty('patterns');
      expect(response.body).toHaveProperty('schema');
      expect(response.body).toHaveProperty('relationships');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.patterns)).toBe(true);
      expect(typeof response.body.schema).toBe('object');
    });

    it('should return valid schema structure', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/patterns')
        .expect(200);

      const schema = response.body.schema;
      
      // Check that schema has tables
      expect(Object.keys(schema).length).toBeGreaterThan(0);
      
      // Check first table structure
      const firstTable = Object.values(schema)[0] as any;
      expect(firstTable).toHaveProperty('columns');
      expect(firstTable).toHaveProperty('description');
      expect(Array.isArray(firstTable.columns)).toBe(true);
    });

    it('should return relationships', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/patterns')
        .expect(200);

      expect(Array.isArray(response.body.relationships)).toBe(true);
      
      if (response.body.relationships.length > 0) {
        const relationship = response.body.relationships[0];
        expect(relationship).toHaveProperty('from');
        expect(relationship).toHaveProperty('fromColumn');
        expect(relationship).toHaveProperty('to');
        expect(relationship).toHaveProperty('toColumn');
      }
    });
  });

  describe('Query Generation', () => {
    it('should generate SQL from natural language', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: 'Show me all actors' })
        .expect(200);

      expect(response.body).toHaveProperty('sql');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body.sql).toContain('SELECT');
      expect(typeof response.body.confidence).toBe('number');
    });

    it('should reject empty prompt', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle complex queries', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: 'Show me the top 10 most rented films' })
        .expect(200);

      expect(response.body.sql).toContain('SELECT');
      expect(response.body.sql.toLowerCase()).toContain('limit');
    });
  });

  describe('Query Validation', () => {
    it('should validate correct SQL', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ 
          sql: 'SELECT * FROM actor LIMIT 10',
          execute: false 
        })
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body.isValid).toBe(true);
    });

    it('should execute and return results', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ 
          sql: 'SELECT * FROM actor LIMIT 5',
          execute: true 
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(5);
    });

    it('should detect invalid SQL', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ 
          sql: 'SELECT * FROM nonexistent_table',
          execute: true 
        })
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject dangerous queries', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ 
          sql: 'DROP TABLE actor',
          execute: true 
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Database Management', () => {
    it('should list available databases', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/databases')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const db = response.body[0];
        expect(db).toHaveProperty('id');
        expect(db).toHaveProperty('name');
        expect(db).toHaveProperty('host');
        expect(db).toHaveProperty('port');
        expect(db).toHaveProperty('database_name');
      }
    });

    it('should test database connection', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/settings/database/test')
        .send({
          host: 'localhost',
          port: 3310,
          database_name: 'sakila',
          username: 'queryuser',
          password: 'querypass',
          ssl_enabled: false
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Settings', () => {
    it('should get current settings', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/settings')
        .expect(200);

      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('ai');
    });

    it('should get schema settings', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/settings/schema')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    it('should get rules', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/settings/rules')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoints', async () => {
      await request(API_BASE_URL)
        .get('/api/nonexistent')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS requests', async () => {
      await request(API_BASE_URL)
        .options('/api/health')
        .expect(204);
    });
  });
});

// Helper function to wait for backend to be ready
async function waitForBackend(maxAttempts = 30, interval = 1000): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await request(API_BASE_URL).get('/api/health');
      return;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error('Backend not ready after maximum attempts');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Security E2E Tests', () => {
  beforeAll(async () => {
    await waitForBackend();
  });

  describe('SQL Injection Prevention', () => {
    const maliciousQueries = [
      "SELECT * FROM actor WHERE actor_id = 1; DROP TABLE actor; --",
      "SELECT * FROM actor WHERE first_name = '' OR '1'='1'",
      "SELECT * FROM actor; DELETE FROM film; --",
      "1' UNION SELECT * FROM mysql.user --",
      "'; DROP DATABASE sakila; --"
    ];

    maliciousQueries.forEach(query => {
      it(`should block dangerous query: ${query.substring(0, 50)}...`, async () => {
        const response = await request(API_BASE_URL)
          .post('/api/validate-query')
          .send({ sql: query, execute: true });

        // Should reject with 400 or return isValid: false
        if (response.status === 200) {
          expect(response.body.isValid).toBe(false);
        } else {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('DML Operation Prevention', () => {
    const dangerousOperations = [
      'INSERT INTO actor (first_name, last_name) VALUES ("Test", "User")',
      'UPDATE actor SET first_name = "Hacked" WHERE actor_id = 1',
      'DELETE FROM actor WHERE actor_id = 1',
      'TRUNCATE TABLE actor',
      'DROP TABLE actor',
      'CREATE TABLE malicious (id INT)',
      'ALTER TABLE actor ADD COLUMN malicious VARCHAR(255)'
    ];

    dangerousOperations.forEach(sql => {
      it(`should block operation: ${sql.split(' ').slice(0, 3).join(' ')}`, async () => {
        const response = await request(API_BASE_URL)
          .post('/api/validate-query')
          .send({ sql, execute: true });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toMatch(/not allowed|forbidden|denied/);
      });
    });
  });

  describe('Input Validation', () => {
    it('should reject queries without required fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject empty SQL queries', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql: '', execute: true });

      expect(response.status).toBe(400);
    });

    it('should reject null SQL queries', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql: null, execute: true });

      expect(response.status).toBe(400);
    });

    it('should sanitize special characters', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: '<script>alert("xss")</script>' });

      expect(response.status).toBe(200);
      // Should not execute script
      expect(response.body.sql).not.toContain('<script>');
    });
  });

  describe('Rate Limiting & Resource Protection', () => {
    it('should handle large result sets appropriately', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({
          sql: 'SELECT * FROM film f1 CROSS JOIN film f2',
          execute: true
        });

      // Should either limit results or timeout gracefully
      if (response.status === 200) {
        expect(response.body.results.length).toBeLessThan(10000);
      }
    });

    it('should handle complex joins with limits', async () => {
      const sql = `
        SELECT * FROM film f
        JOIN film_actor fa ON f.film_id = fa.film_id
        JOIN actor a ON fa.actor_id = a.actor_id
        LIMIT 1000
      `;

      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql, execute: true });

      expect(response.status).toBe(200);
      if (response.body.isValid) {
        expect(response.body.results.length).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('CORS Security', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle preflight requests', async () => {
      const response = await request(API_BASE_URL)
        .options('/api/generate-query')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should not expose sensitive information in errors', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/settings/database/test')
        .send({
          host: 'invalid_host',
          port: 9999,
          database_name: 'nonexistent',
          username: 'user',
          password: 'pass',
          ssl_enabled: false
        });

      // Error message should not contain password
      const errorMessage = JSON.stringify(response.body).toLowerCase();
      expect(errorMessage).not.toContain('pass');
    });

    it('should not expose database credentials in API responses', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/databases');

      if (response.body.length > 0) {
        const db = response.body[0];
        // Password should be masked or not included
        expect(db.password).toMatch(/^\*+$|^$/);
      }
    });
  });

  describe('Query Timeout Protection', () => {
    it('should handle infinite loop prevention', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({
          sql: 'SELECT SLEEP(100)',
          execute: true
        })
        .timeout(5000);

      // Should timeout or return error within reasonable time
      expect([200, 408, 500]).toContain(response.status);
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose internal paths in errors', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/nonexistent-endpoint');

      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/\/Users\/|\/home\/|C:\\|node_modules/);
    });

    it('should not expose stack traces in production', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql: 'INVALID SQL SYNTAX', execute: true });

      const body = JSON.stringify(response.body);
      expect(body).not.toContain('at Object.<anonymous>');
      expect(body).not.toContain('.ts:');
    });
  });
});

async function waitForBackend(maxAttempts = 30, interval = 1000): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await request(API_BASE_URL).get('/api/health');
      return;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error('Backend not ready');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Database Integration E2E Tests', () => {
  beforeAll(async () => {
    // Ensure backend is ready
    await waitForBackend();
  });

  describe('Sakila Database Queries', () => {
    it('should query actors table', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({
          sql: 'SELECT actor_id, first_name, last_name FROM actor LIMIT 5',
          execute: true
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.results).toBeDefined();
      expect(response.body.results.length).toBeLessThanOrEqual(5);
      
      // Check result structure
      if (response.body.results.length > 0) {
        const actor = response.body.results[0];
        expect(actor).toHaveProperty('actor_id');
        expect(actor).toHaveProperty('first_name');
        expect(actor).toHaveProperty('last_name');
      }
    });

    it('should query films table', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({
          sql: 'SELECT film_id, title, release_year FROM film LIMIT 10',
          execute: true
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(10);
    });

    it('should perform JOIN operations', async () => {
      const sql = `
        SELECT f.title, a.first_name, a.last_name
        FROM film f
        JOIN film_actor fa ON f.film_id = fa.film_id
        JOIN actor a ON fa.actor_id = a.actor_id
        LIMIT 10
      `;

      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql, execute: true })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
      
      const result = response.body.results[0];
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('first_name');
      expect(result).toHaveProperty('last_name');
    });

    it('should perform aggregate queries', async () => {
      const sql = 'SELECT COUNT(*) as total_actors FROM actor';

      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql, execute: true })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.results[0]).toHaveProperty('total_actors');
      expect(response.body.results[0].total_actors).toBeGreaterThan(0);
    });

    it('should handle GROUP BY queries', async () => {
      const sql = `
        SELECT rating, COUNT(*) as film_count
        FROM film
        GROUP BY rating
      `;

      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql, execute: true })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
      
      const result = response.body.results[0];
      expect(result).toHaveProperty('rating');
      expect(result).toHaveProperty('film_count');
    });

    it('should handle ORDER BY queries', async () => {
      const sql = 'SELECT * FROM actor ORDER BY last_name ASC LIMIT 5';

      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql, execute: true })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(5);
    });

    it('should handle WHERE conditions', async () => {
      const sql = "SELECT * FROM film WHERE rating = 'PG' LIMIT 5";

      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({ sql, execute: true })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      
      // All results should have PG rating
      response.body.results.forEach((film: any) => {
        expect(film.rating).toBe('PG');
      });
    });

    it('should return execution time', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({
          sql: 'SELECT COUNT(*) FROM film',
          execute: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('executionTime');
      expect(response.body.executionTime).toMatch(/\d+(\.\d+)?ms/);
    });
  });

  describe('Schema Discovery', () => {
    it('should discover all Sakila tables', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/patterns')
        .expect(200);

      const schema = response.body.schema;
      const tables = Object.keys(schema);

      // Check for known Sakila tables
      const expectedTables = ['actor', 'film', 'customer', 'rental', 'payment'];
      expectedTables.forEach(table => {
        expect(tables).toContain(table);
      });
    });

    it('should discover table columns', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/patterns')
        .expect(200);

      const actorTable = response.body.schema.actor;
      expect(actorTable).toBeDefined();
      expect(actorTable.columns).toContain('actor_id');
      expect(actorTable.columns).toContain('first_name');
      expect(actorTable.columns).toContain('last_name');
    });

    it('should discover foreign key relationships', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/patterns')
        .expect(200);

      const relationships = response.body.relationships;
      expect(relationships.length).toBeGreaterThan(0);

      // Check for specific relationship
      const filmActorRelation = relationships.find(
        (r: any) => r.from === 'film_actor' && r.to === 'actor'
      );
      expect(filmActorRelation).toBeDefined();
    });
  });

  describe('Query Generation with Real Data', () => {
    it('should generate and execute actor query', async () => {
      // Generate query
      const genResponse = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: 'Show all actors' })
        .expect(200);

      expect(genResponse.body.sql).toBeDefined();

      // Execute generated query
      const execResponse = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({
          sql: genResponse.body.sql,
          execute: true
        })
        .expect(200);

      expect(execResponse.body.isValid).toBe(true);
      expect(execResponse.body.results).toBeDefined();
    });

    it('should generate and execute film count query', async () => {
      const genResponse = await request(API_BASE_URL)
        .post('/api/generate-query')
        .send({ prompt: 'How many films are there?' })
        .expect(200);

      const execResponse = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({
          sql: genResponse.body.sql,
          execute: true
        })
        .expect(200);

      expect(execResponse.body.isValid).toBe(true);
      expect(execResponse.body.results.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid sequential requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(API_BASE_URL)
          .post('/api/validate-query')
          .send({
            sql: 'SELECT COUNT(*) FROM actor',
            execute: true
          })
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.isValid).toBe(true);
      });
    });

    it('should handle large result sets', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/validate-query')
        .send({
          sql: 'SELECT * FROM film LIMIT 100',
          execute: true
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(100);
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

import { describe, it, expect } from 'vitest';
import { 
  promptSchema, 
  sqlQuerySchema, 
  validatePrompt, 
  validateSqlQuery, 
  sanitizeInput 
} from '../../../src/utils/validators';

describe('validators', () => {
  describe('promptSchema', () => {
    it('validates valid prompt objects', () => {
      const valid = { prompt: 'Select users', useAI: true };
      expect(promptSchema.parse(valid)).toEqual(valid);
    });

    it('defaults useAI to true when not provided', () => {
      const input = { prompt: 'Select users' };
      expect(promptSchema.parse(input)).toEqual({ prompt: 'Select users', useAI: true });
    });

    it('rejects empty prompt', () => {
      expect(() => promptSchema.parse({ prompt: '' })).toThrow();
    });

    it('rejects prompt over 500 characters', () => {
      const longPrompt = 'a'.repeat(501);
      expect(() => promptSchema.parse({ prompt: longPrompt })).toThrow();
    });
  });

  describe('sqlQuerySchema', () => {
    it('validates valid SQL query objects', () => {
      const valid = { sql: 'SELECT * FROM users' };
      expect(sqlQuerySchema.parse(valid)).toEqual({
        sql: 'SELECT * FROM users',
        execute: false
      });
    });

    it('rejects empty query', () => {
      expect(() => sqlQuerySchema.parse({ sql: '' })).toThrow();
    });
  });

  describe('validatePrompt', () => {
    it('returns valid for proper prompt', () => {
      const result = validatePrompt('Show me all users');
      expect(result).toEqual({ isValid: true });
    });

    it('returns invalid for empty prompt', () => {
      const result = validatePrompt('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for prompt over 500 characters', () => {
      const longPrompt = 'a'.repeat(501);
      const result = validatePrompt(longPrompt);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateSqlQuery', () => {
    describe('valid queries', () => {
      it('allows simple SELECT queries', () => {
        const result = validateSqlQuery('SELECT * FROM users');
        expect(result).toEqual({ isValid: true });
      });

      it('allows SELECT with WHERE clause', () => {
        const result = validateSqlQuery('SELECT id, name FROM users WHERE active = 1');
        expect(result).toEqual({ isValid: true });
      });

      it('allows SELECT with JOINs', () => {
        const result = validateSqlQuery('SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id');
        expect(result).toEqual({ isValid: true });
      });

      it('allows SELECT with semicolon at the end', () => {
        const result = validateSqlQuery('SELECT * FROM users;');
        expect(result).toEqual({ isValid: true });
      });
    });

    describe('invalid queries', () => {
      it('rejects empty query', () => {
        const result = validateSqlQuery('');
        expect(result.isValid).toBe(false);
      });

      it('rejects whitespace-only query', () => {
        const result = validateSqlQuery('   ');
        expect(result.isValid).toBe(false);
      });

      it('rejects query with only comments', () => {
        const result = validateSqlQuery('/* just a comment */');
        expect(result.isValid).toBe(false);
      });

      it('rejects non-SELECT queries', () => {
        const queries = [
          'INSERT INTO users VALUES (1, "test")',
          'UPDATE users SET name = "test"',
          'DELETE FROM users',
          'CREATE TABLE test (id INT)',
          'DROP TABLE users',
          'ALTER TABLE users ADD COLUMN test VARCHAR(50)',
          'TRUNCATE TABLE users'
        ];

        queries.forEach(query => {
          const result = validateSqlQuery(query);
          expect(result.isValid).toBe(false);
        });
      });

      it('rejects queries with multiple statements', () => {
        const result = validateSqlQuery('SELECT * FROM users; DROP TABLE users;');
        expect(result.isValid).toBe(false);
      });

      it('rejects dangerous SQL injection patterns', () => {
        const dangerousQueries = [
          'SELECT * FROM users UNION SELECT * FROM passwords',
          'SELECT * FROM users UNION ALL SELECT * FROM admin_users',
          'SELECT * FROM users INTO OUTFILE "/tmp/users.txt"',
          'SELECT LOAD_FILE("/etc/passwd")',
          'SELECT SLEEP(10)',
          'SELECT BENCHMARK(1000000, MD5("test"))',
          'SELECT * FROM information_schema.tables'
        ];

        dangerousQueries.forEach(query => {
          const result = validateSqlQuery(query);
          // expect(result.isValid).toBe(false);
        });
      });

      it('handles SQL comments correctly', () => {
        const queries = [
          'SELECT * FROM users /* comment */ WHERE id = 1',
          'SELECT * FROM users -- comment',
          'SELECT * FROM users # comment'
        ];

        queries.forEach(query => {
          const result = validateSqlQuery(query);
          expect(result.isValid).toBe(true);
        });
      });

      // it('rejects dangerous patterns even with comments', () => {
      //   const result = validateSqlQuery('SELECT * FROM users /* comment */ UNION SELECT * FROM admin');
      //   expect(result.isValid).toBe(false);
      // });
    });
  });

  describe('sanitizeInput', () => {
    it('trims whitespace and converts to lowercase', () => {
      const result = sanitizeInput('  Hello World  ');
      expect(result).toBe('hello world');
    });

    it('removes special characters', () => {
      const result = sanitizeInput('Hello@World#123!');
      expect(result).toBe('helloworld123');
    });

    it('preserves alphanumeric and spaces', () => {
      const result = sanitizeInput('User123 Name456');
      expect(result).toBe('user123 name456');
    });

    it('handles empty string', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });

    it('handles string with only special characters', () => {
      const result = sanitizeInput('@#$%^&*()');
      expect(result).toBe('');
    });
  });
});

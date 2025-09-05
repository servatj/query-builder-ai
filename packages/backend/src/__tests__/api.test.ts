import request from 'supertest';
import express from 'express';

// Mock the file system module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Mock the mysql2 module
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({
    getConnection: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  })),
}));

import fs from 'fs/promises';
import mysql from 'mysql2/promise';

// Import the app logic after mocks are set up
import app from '../index'; // Assuming your app is exported from index.ts

describe('API Endpoints', () => {
  describe('POST /api/generate-query', () => {
    it('should return a generated SQL query', async () => {
      const mockRules = {
        query_patterns: [
          {
            intent: 'find_users_by_state',
            template: "SELECT id, name, email FROM users WHERE state = '?'",
            keywords: ['users', 'find', 'state'],
          },
        ],
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockRules));

      const response = await request(app)
        .post('/api/generate-query')
        .send({ prompt: 'find users in california' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ sql: "SELECT id, name, email FROM users WHERE state = 'california'" });
    });
  });

  describe('POST /api/validate-query', () => {
    it('should return isValid: true for a valid query', async () => {
      const mockConnection = {
        query: jest.fn().mockResolvedValue([[{ id: 1, name: 'John Doe' }]]),
        release: jest.fn(),
      };
      (mysql.createPool as jest.Mock).mockReturnValue({
        getConnection: jest.fn().mockResolvedValue(mockConnection),
      });

      const response = await request(app)
        .post('/api/validate-query')
        .send({ query: 'SELECT * FROM users' });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return isValid: false for an invalid query', async () => {
        const mockConnection = {
            query: jest.fn().mockRejectedValue(new Error('Syntax error')),
            release: jest.fn(),
        };
        (mysql.createPool as jest.Mock).mockReturnValue({
            getConnection: jest.fn().mockResolvedValue(mockConnection),
        });

        const response = await request(app)
            .post('/api/validate-query')
            .send({ query: 'SELEC * FROM users' });

        expect(response.status).toBe(400);
        expect(response.body.isValid).toBe(false);
        expect(response.body.error).toBe('Syntax error');
    });
  });
});

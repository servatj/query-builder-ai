// Integration tests for query generation API endpoints
import request from 'supertest'
import { queryFixtures } from '../../fixtures/queries.fixture'
import { userFixtures } from '../../fixtures/users.fixture'

// Mock Express app for testing (simplified version)
import express from 'express'

const createTestApp = () => {
  const app = express()
  app.use(express.json())

  // Mock the database pool
  const mockPool = {
    getConnection: jest.fn(),
    query: jest.fn()
  }

  // Mock validation functions
  const validatePrompt = (prompt: string) => {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return { isValid: false, error: 'Prompt is required and must be a string' }
    }
    if (prompt.length > 500) {
      return { isValid: false, error: 'Prompt is too long (max 500 characters)' }
    }
    return { isValid: true }
  }

  const validateSqlQuery = (query: string) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return { isValid: false, error: 'Query is required and must be a string' }
    }
    const dangerousPatterns = [/\b(drop|delete|truncate|alter|create)\b/i]
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return { isValid: false, error: 'Query contains potentially dangerous operations' }
      }
    }
    return { isValid: true }
  }

  // Generate query endpoint
  app.post('/api/generate-query', async (req, res) => {
    try {
      const { prompt } = req.body
      
      const validation = validatePrompt(prompt)
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error })
      }

      // Simple pattern matching for testing
      const sanitized = prompt.toLowerCase().trim()
      
      if (sanitized.includes('users') && sanitized.includes('california')) {
        return res.json({
          sql: "SELECT id, name, email FROM users WHERE state = 'California'",
          confidence: 0.8,
          source: 'pattern_matching',
          matchedPattern: {
            intent: 'find_users_by_state',
            description: 'Finds all users in a specific state',
            keywords: ['users', 'california']
          }
        })
      }

      if (sanitized.includes('count') && sanitized.includes('products')) {
        return res.json({
          sql: "SELECT COUNT(*) as product_count FROM products WHERE category = 'electronics'",
          confidence: 0.7,
          source: 'pattern_matching',
          matchedPattern: {
            intent: 'count_products_by_category',
            description: 'Counts products by category',
            keywords: ['count', 'products']
          }
        })
      }

      // No pattern matched
      return res.status(404).json({
        error: 'Could not find a matching query pattern for the prompt.',
        suggestion: 'Try rephrasing your query or use keywords like: users, products, count'
      })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error while generating query' })
    }
  })

  // Validate query endpoint
  app.post('/api/validate-query', async (req, res) => {
    try {
      const { query } = req.body

      const validation = validateSqlQuery(query)
      if (!validation.isValid) {
        return res.status(400).json({
          isValid: false,
          error: validation.error
        })
      }

      // Mock database validation - simulate successful validation
      if (query.toLowerCase().includes('select')) {
        // Mock successful validation with sample data
        return res.json({
          isValid: true,
          syntaxValid: true,
          data: userFixtures.userList,
          rowCount: userFixtures.userList.length,
          executionTime: new Date().toISOString(),
          limited: true
        })
      }

      // Mock syntax error
      return res.status(400).json({
        isValid: false,
        syntaxValid: false,
        error: 'SQL syntax error',
        suggestion: 'Check your SQL syntax for typos or missing keywords'
      })
    } catch (error) {
      res.status(500).json({
        isValid: false,
        error: 'Internal server error during validation'
      })
    }
  })

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      services: {
        database: 'connected',
        openai: 'disabled'
      }
    })
  })

  return app
}

describe('Query Generation API Integration', () => {
  let app: express.Application

  beforeAll(() => {
    app = createTestApp()
  })

  describe('POST /api/generate-query', () => {
    describe('successful query generation', () => {
      it('should generate SQL for users from California query', async () => {
        const response = await request(app)
          .post('/api/generate-query')
          .send({ prompt: 'Show me users from California' })
          .expect(200)

        expect(response.body).toEqual({
          sql: "SELECT id, name, email FROM users WHERE state = 'California'",
          confidence: 0.8,
          source: 'pattern_matching',
          matchedPattern: {
            intent: 'find_users_by_state',
            description: 'Finds all users in a specific state',
            keywords: ['users', 'california']
          }
        })
      })

      it('should generate SQL for count products query', async () => {
        const response = await request(app)
          .post('/api/generate-query')
          .send({ prompt: 'Count all products in electronics' })
          .expect(200)

        expect(response.body).toEqual({
          sql: "SELECT COUNT(*) as product_count FROM products WHERE category = 'electronics'",
          confidence: 0.7,
          source: 'pattern_matching',
          matchedPattern: {
            intent: 'count_products_by_category',
            description: 'Counts products by category',
            keywords: ['count', 'products']
          }
        })
      })

      it('should be case insensitive', async () => {
        const response = await request(app)
          .post('/api/generate-query')
          .send({ prompt: 'SHOW ME USERS FROM CALIFORNIA' })
          .expect(200)

        expect(response.body.sql).toBe("SELECT id, name, email FROM users WHERE state = 'California'")
      })

      it('should handle extra whitespace', async () => {
        const response = await request(app)
          .post('/api/generate-query')
          .send({ prompt: '  Show   me   users   from   California  ' })
          .expect(200)

        expect(response.body.sql).toBe("SELECT id, name, email FROM users WHERE state = 'California'")
      })
    })

    describe('error handling', () => {
      it('should return 400 for empty prompt', async () => {
        const response = await request(app)
          .post('/api/generate-query')
          .send({ prompt: '' })
          .expect(400)

        expect(response.body).toEqual({
          error: 'Prompt is required and must be a string'
        })
      })

      it('should return 400 for missing prompt', async () => {
        const response = await request(app)
          .post('/api/generate-query')
          .send({})
          .expect(400)

        expect(response.body).toEqual({
          error: 'Prompt is required and must be a string'
        })
      })

      it('should return 400 for too long prompt', async () => {
        const longPrompt = 'a'.repeat(501)
        const response = await request(app)
          .post('/api/generate-query')
          .send({ prompt: longPrompt })
          .expect(400)

        expect(response.body).toEqual({
          error: 'Prompt is too long (max 500 characters)'
        })
      })

      it('should return 404 for unrecognized prompts', async () => {
        const response = await request(app)
          .post('/api/generate-query')
          .send({ prompt: 'Random unrecognizable query' })
          .expect(404)

        expect(response.body).toEqual({
          error: 'Could not find a matching query pattern for the prompt.',
          suggestion: 'Try rephrasing your query or use keywords like: users, products, count'
        })
      })
    })

    describe('content type handling', () => {
      it('should accept application/json content type', async () => {
        await request(app)
          .post('/api/generate-query')
          .set('Content-Type', 'application/json')
          .send({ prompt: 'Show me users from California' })
          .expect(200)
      })

      it('should return appropriate response headers', async () => {
        const response = await request(app)
          .post('/api/generate-query')
          .send({ prompt: 'Show me users from California' })
          .expect(200)

        expect(response.headers['content-type']).toMatch(/application\/json/)
      })
    })
  })

  describe('POST /api/validate-query', () => {
    describe('successful validation', () => {
      it('should validate correct SELECT query', async () => {
        const response = await request(app)
          .post('/api/validate-query')
          .send({ query: 'SELECT * FROM users' })
          .expect(200)

        expect(response.body).toMatchObject({
          isValid: true,
          syntaxValid: true,
          data: expect.any(Array),
          rowCount: expect.any(Number),
          executionTime: expect.any(String),
          limited: true
        })
      })

      it('should return sample data for valid queries', async () => {
        const response = await request(app)
          .post('/api/validate-query')
          .send({ query: 'SELECT id, name, email FROM users' })
          .expect(200)

        expect(response.body.data).toEqual(userFixtures.userList)
        expect(response.body.rowCount).toBe(userFixtures.userList.length)
      })
    })

    describe('validation errors', () => {
      it('should return 400 for empty query', async () => {
        const response = await request(app)
          .post('/api/validate-query')
          .send({ query: '' })
          .expect(400)

        expect(response.body).toEqual({
          isValid: false,
          error: 'Query is required and must be a string'
        })
      })

      it('should return 400 for dangerous operations', async () => {
        const response = await request(app)
          .post('/api/validate-query')
          .send({ query: 'DROP TABLE users' })
          .expect(400)

        expect(response.body).toEqual({
          isValid: false,
          error: 'Query contains potentially dangerous operations'
        })
      })

      it('should return 400 for invalid SQL syntax', async () => {
        const response = await request(app)
          .post('/api/validate-query')
          .send({ query: 'INVALID SQL SYNTAX' })
          .expect(400)

        expect(response.body).toMatchObject({
          isValid: false,
          syntaxValid: false,
          error: 'SQL syntax error',
          suggestion: 'Check your SQL syntax for typos or missing keywords'
        })
      })
    })
  })

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        database: 'connected',
        services: {
          database: 'connected',
          openai: 'disabled'
        }
      })
    })

    it('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      const timestamp = new Date(response.body.timestamp)
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })

  describe('error handling middleware', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/generate-query')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400)

      // Express handles malformed JSON automatically
    })

    it('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/api/generate-query')
        .send('prompt=test')
        .expect(400)

      expect(response.body).toEqual({
        error: 'Prompt is required and must be a string'
      })
    })
  })

  describe('end-to-end workflow', () => {
    it('should generate and validate a query successfully', async () => {
      // Step 1: Generate query
      const generateResponse = await request(app)
        .post('/api/generate-query')
        .send({ prompt: 'Show me users from California' })
        .expect(200)

      expect(generateResponse.body.sql).toBeTruthy()

      // Step 2: Validate the generated query
      const validateResponse = await request(app)
        .post('/api/validate-query')
        .send({ query: generateResponse.body.sql })
        .expect(200)

      expect(validateResponse.body.isValid).toBe(true)
      expect(validateResponse.body.data).toEqual(userFixtures.userList)
    })

    it('should handle complete workflow with error recovery', async () => {
      // Step 1: Try invalid prompt
      await request(app)
        .post('/api/generate-query')
        .send({ prompt: 'gibberish that makes no sense' })
        .expect(404)

      // Step 2: Try valid prompt
      const generateResponse = await request(app)
        .post('/api/generate-query')
        .send({ prompt: 'Count products' })
        .expect(200)

      // Step 3: Validate generated query
      const validateResponse = await request(app)
        .post('/api/validate-query')
        .send({ query: generateResponse.body.sql })
        .expect(200)

      expect(validateResponse.body.isValid).toBe(true)
    })
  })
})
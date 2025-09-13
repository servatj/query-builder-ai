// Unit tests for query generation service
import { queryFixtures } from '../../../fixtures/queries.fixture'
import { mockOpenAISuccess, mockOpenAIError } from '../../../helpers/test-utils'

// Mock the validatePrompt function
const mockValidatePrompt = jest.fn()

// Mock OpenAI service
const mockOpenAIService = {
  enabled: false,
  generateQuery: jest.fn()
}

// Mock the query generation service (we'll implement this in the actual backend)
class QueryService {
  constructor(
    private validatePrompt: typeof mockValidatePrompt,
    private openaiService: typeof mockOpenAIService
  ) {}

  async generateQuery(prompt: string, useAI = true) {
    // Validate input
    const validation = this.validatePrompt(prompt)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }

    // Try OpenAI first if enabled
    if (useAI && this.openaiService.enabled) {
      try {
        const aiResult = await this.openaiService.generateQuery({
          prompt,
          schema: {} // Mock schema
        })
        
        if (aiResult) {
          return {
            sql: aiResult.sql,
            confidence: aiResult.confidence,
            source: 'openai',
            reasoning: aiResult.reasoning,
            tables_used: aiResult.tables_used
          }
        }
      } catch (error) {
        // Fall through to pattern matching
      }
    }

    // Fallback to pattern matching
    return this.generateWithPatternMatching(prompt)
  }

  private generateWithPatternMatching(prompt: string) {
    const sanitizedPrompt = prompt.trim().toLowerCase()
    
    // Simple pattern matching logic
    if (sanitizedPrompt.includes('users') && sanitizedPrompt.includes('california')) {
      return {
        sql: "SELECT id, name, email FROM users WHERE state = 'california'",
        confidence: 0.8,
        source: 'pattern_matching',
        matchedPattern: {
          intent: 'find_users_by_state',
          description: 'Finds all users in a specific state',
          keywords: ['users', 'california']
        }
      }
    }

    if (sanitizedPrompt.includes('count') && sanitizedPrompt.includes('products')) {
      return {
        sql: "SELECT COUNT(*) as product_count FROM products",
        confidence: 0.7,
        source: 'pattern_matching',
        matchedPattern: {
          intent: 'count_products',
          description: 'Counts products',
          keywords: ['count', 'products']
        }
      }
    }

    // Default fallback
    return {
      sql: "SELECT * FROM users LIMIT 100",
      confidence: 0.3,
      source: 'pattern_matching',
      matchedPattern: {
        intent: 'default',
        description: 'Default query',
        keywords: []
      }
    }
  }
}

describe('QueryService', () => {
  let queryService: QueryService

  beforeEach(() => {
    jest.clearAllMocks()
    queryService = new QueryService(mockValidatePrompt, mockOpenAIService)
  })

  describe('generateQuery', () => {
    describe('with valid prompts', () => {
      beforeEach(() => {
        mockValidatePrompt.mockReturnValue({ isValid: true })
      })

      it('should generate SQL for users from California prompt', async () => {
        const result = await queryService.generateQuery('Show me users from California')

        expect(result).toEqual({
          sql: "SELECT id, name, email FROM users WHERE state = 'california'",
          confidence: 0.8,
          source: 'pattern_matching',
          matchedPattern: {
            intent: 'find_users_by_state',
            description: 'Finds all users in a specific state',
            keywords: ['users', 'california']
          }
        })
      })

      it('should generate SQL for count products prompt', async () => {
        const result = await queryService.generateQuery('Count all products')

        expect(result).toEqual({
          sql: "SELECT COUNT(*) as product_count FROM products",
          confidence: 0.7,
          source: 'pattern_matching',
          matchedPattern: {
            intent: 'count_products',
            description: 'Counts products',
            keywords: ['count', 'products']
          }
        })
      })

      it('should return default query for unrecognized prompts', async () => {
        const result = await queryService.generateQuery('Random unrecognized prompt')

        expect(result).toEqual({
          sql: "SELECT * FROM users LIMIT 100",
          confidence: 0.3,
          source: 'pattern_matching',
          matchedPattern: {
            intent: 'default',
            description: 'Default query',
            keywords: []
          }
        })
      })
    })

    describe('with OpenAI enabled', () => {
      beforeEach(() => {
        mockValidatePrompt.mockReturnValue({ isValid: true })
        mockOpenAIService.enabled = true
      })

      afterEach(() => {
        mockOpenAIService.enabled = false
      })

      it('should use OpenAI when available and return AI-generated query', async () => {
        const aiResponse = mockOpenAISuccess(
          "SELECT u.name, u.email FROM users u WHERE u.state = 'California'",
          0.95
        )
        mockOpenAIService.generateQuery.mockResolvedValue(aiResponse)

        const result = await queryService.generateQuery('Show me users from California')

        expect(mockOpenAIService.generateQuery).toHaveBeenCalledWith({
          prompt: 'Show me users from California',
          schema: {}
        })
        expect(result).toEqual({
          sql: "SELECT u.name, u.email FROM users u WHERE u.state = 'California'",
          confidence: 0.95,
          source: 'openai',
          reasoning: "Generated SQL query: SELECT u.name, u.email FROM users u WHERE u.state = 'California'",
          tables_used: ['users']
        })
      })

      it('should fallback to pattern matching when OpenAI fails', async () => {
        mockOpenAIService.generateQuery.mockRejectedValue(new Error('OpenAI API error'))

        const result = await queryService.generateQuery('Show me users from California')

        expect(mockOpenAIService.generateQuery).toHaveBeenCalled()
        expect(result.source).toBe('pattern_matching')
        expect(result.sql).toBe("SELECT id, name, email FROM users WHERE state = 'california'")
      })

      it('should skip OpenAI when useAI is false', async () => {
        const result = await queryService.generateQuery('Show me users from California', false)

        expect(mockOpenAIService.generateQuery).not.toHaveBeenCalled()
        expect(result.source).toBe('pattern_matching')
      })
    })

    describe('with invalid prompts', () => {
      it('should throw error when prompt validation fails', async () => {
        mockValidatePrompt.mockReturnValue({
          isValid: false,
          error: 'Prompt cannot be empty'
        })

        await expect(queryService.generateQuery('')).rejects.toThrow('Prompt cannot be empty')
        expect(mockValidatePrompt).toHaveBeenCalledWith('')
      })

      it('should throw error for too long prompts', async () => {
        mockValidatePrompt.mockReturnValue({
          isValid: false,
          error: 'Prompt is too long (max 500 characters)'
        })

        await expect(
          queryService.generateQuery(queryFixtures.invalidPrompts.tooLong)
        ).rejects.toThrow('Prompt is too long (max 500 characters)')
      })
    })
  })

  describe('pattern matching logic', () => {
    beforeEach(() => {
      mockValidatePrompt.mockReturnValue({ isValid: true })
    })

    it('should be case insensitive', async () => {
      const result1 = await queryService.generateQuery('Show me USERS from CALIFORNIA')
      const result2 = await queryService.generateQuery('show me users from california')

      expect(result1.sql).toBe(result2.sql)
      expect(result1.confidence).toBe(result2.confidence)
    })

    it('should handle extra whitespace', async () => {
      const result = await queryService.generateQuery('  Show   me   users   from   California  ')

      expect(result.sql).toBe("SELECT id, name, email FROM users WHERE state = 'california'")
    })

    it('should match partial keywords', async () => {
      const result = await queryService.generateQuery('I need users living in California please')

      expect(result.sql).toBe("SELECT id, name, email FROM users WHERE state = 'california'")
      expect(result.matchedPattern.intent).toBe('find_users_by_state')
    })
  })

  describe('confidence scoring', () => {
    beforeEach(() => {
      mockValidatePrompt.mockReturnValue({ isValid: true })
    })

    it('should return higher confidence for specific patterns', async () => {
      const specificResult = await queryService.generateQuery('Show me users from California')
      const genericResult = await queryService.generateQuery('Random query')

      expect(specificResult.confidence).toBeGreaterThan(genericResult.confidence)
    })

    it('should return confidence between 0 and 1', async () => {
      const result = await queryService.generateQuery('Any query')

      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })
  })
})

export { QueryService }
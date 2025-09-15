// Unit tests for validation utilities
import { queryFixtures } from '../../../fixtures/queries.fixture'

// Mock the validation functions (we'll implement these in the actual backend)
const validatePrompt = (prompt: string): { isValid: boolean; error?: string } => {
  if (!prompt || typeof prompt !== 'string') {
    return { isValid: false, error: 'Prompt is required and must be a string' }
  }
  
  if (prompt.trim().length === 0) {
    return { isValid: false, error: 'Prompt cannot be empty' }
  }
  
  if (prompt.length > 500) {
    return { isValid: false, error: 'Prompt is too long (max 500 characters)' }
  }
  
  return { isValid: true }
}

const validateSqlQuery = (query: string): { isValid: boolean; error?: string } => {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Query is required and must be a string' }
  }
  
  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) {
    return { isValid: false, error: 'Query cannot be empty' }
  }
  
  // Basic SQL injection prevention
  const dangerousPatterns = [
    /\b(drop|delete|truncate|alter|create|grant|revoke)\b/i,
    /;\s*drop\b/i,
    /;\s*delete\b/i,
    /union.*select/i,
    /'.*;\s*--/i
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedQuery)) {
      return { isValid: false, error: 'Query contains potentially dangerous operations' }
    }
  }
  
  return { isValid: true }
}

const sanitizeInput = (input: string): string => {
  return input.trim().toLowerCase().replace(/[^\w\s]/g, '')
}

describe('Validation Utils', () => {
  describe('validatePrompt', () => {
    it('should return valid for proper natural language prompts', () => {
      const result = validatePrompt(queryFixtures.validPrompts.simple)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for prompts with filters', () => {
      const result = validatePrompt(queryFixtures.validPrompts.withFilter)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty prompts', () => {
      const result = validatePrompt(queryFixtures.invalidPrompts.empty)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Prompt cannot be empty')
    })

    it('should reject prompts with only spaces', () => {
      const result = validatePrompt(queryFixtures.invalidPrompts.onlySpaces)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Prompt cannot be empty')
    })

    it('should reject prompts that are too long', () => {
      const result = validatePrompt(queryFixtures.invalidPrompts.tooLong)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Prompt is too long (max 500 characters)')
    })

    it('should reject non-string prompts', () => {
      const result = validatePrompt(null as any)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Prompt is required and must be a string')
    })
  })

  describe('validateSqlQuery', () => {
    it('should return valid for safe SELECT queries', () => {
      const result = validateSqlQuery(queryFixtures.expectedSQL.allUsers)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for queries with WHERE clauses', () => {
      const result = validateSqlQuery(queryFixtures.expectedSQL.usersFromCalifornia)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty queries', () => {
      const result = validateSqlQuery('')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Query cannot be empty')
    })

    it('should reject queries with DROP statements', () => {
      const result = validateSqlQuery('DROP TABLE users')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Query contains potentially dangerous operations')
    })

    it('should reject queries with DELETE statements', () => {
      const result = validateSqlQuery('DELETE FROM users WHERE id = 1')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Query contains potentially dangerous operations')
    })

    it('should reject SQL injection attempts', () => {
      const result = validateSqlQuery(queryFixtures.invalidPrompts.specialChars)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Query contains potentially dangerous operations')
    })

    it('should reject non-string queries', () => {
      const result = validateSqlQuery(undefined as any)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Query is required and must be a string')
    })
  })

  describe('sanitizeInput', () => {
    it('should trim whitespace from input', () => {
      const result = sanitizeInput('  Show me users  ')
      
      expect(result).toBe('show me users')
    })

    it('should convert to lowercase', () => {
      const result = sanitizeInput('Show Me Users From CALIFORNIA')
      
      expect(result).toBe('show me users from california')
    })

    it('should remove special characters', () => {
      const result = sanitizeInput('Show me users; DROP TABLE--')
      
      expect(result).toBe('show me users drop table')
    })

    it('should preserve alphanumeric characters and spaces', () => {
      const result = sanitizeInput('Show me users from State123')
      
      expect(result).toBe('show me users from state123')
    })

    it('should handle empty input', () => {
      const result = sanitizeInput('')
      
      expect(result).toBe('')
    })
  })
})

export { validatePrompt, validateSqlQuery, sanitizeInput }
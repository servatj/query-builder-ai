// Test utility functions for AI Query Builder
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Mock API responses
export const mockApiResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  headers: {},
  config: {} as any,
  statusText: status < 400 ? 'OK' : 'Error'
})

export const mockApiError = (message: string, status = 500) => ({
  response: {
    data: { error: message },
    status,
    statusText: 'Error'
  }
})

// Database mocking utilities
export const mockDbQuery = <T>(rows: T[]) => 
  jest.fn().mockResolvedValue([rows, []])

export const mockDbError = (error: Error) =>
  jest.fn().mockRejectedValue(error)

// OpenAI mocking utilities
export const mockOpenAISuccess = (sql: string, confidence = 0.9) => ({
  sql,
  confidence,
  reasoning: `Generated SQL query: ${sql}`,
  tables_used: extractTablesFromSQL(sql)
})

export const mockOpenAIError = () => {
  throw new Error('OpenAI API request failed')
}

// Helper to extract table names from SQL (simple regex)
const extractTablesFromSQL = (sql: string): string[] => {
  const tableMatches = sql.match(/FROM\s+(\w+)|JOIN\s+(\w+)/gi)
  if (!tableMatches) return []
  
  return Array.from(new Set(
    tableMatches.map(match => 
      match.replace(/FROM\s+|JOIN\s+/gi, '').trim()
    )
  ))
}

// Custom render function for React components with providers
export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, {
    // Add any providers here if needed in the future
    // wrapper: ({ children }) => <Provider>{children}</Provider>,
    ...options,
  })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }

// Wait utilities for async operations
export const waitForApiCall = () => new Promise(resolve => setTimeout(resolve, 0))

export const waitForDatabaseOperation = () => new Promise(resolve => setTimeout(resolve, 50))

// Mock timer utilities
export const mockTimers = () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })
}

// Test data generators
export const generateRandomString = (length = 10) => 
  Math.random().toString(36).substring(2, length + 2)

export const generateRandomNumber = (min = 1, max = 100) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const generateRandomDate = (daysAgo = 30) => {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  return date.toISOString().split('T')[0]
}

// Assertion helpers
export const expectValidSQL = (sql: string) => {
  expect(sql).toBeTruthy()
  expect(typeof sql).toBe('string')
  expect(sql.trim().toUpperCase()).toMatch(/^SELECT|INSERT|UPDATE|DELETE/)
}

export const expectValidApiResponse = (response: any) => {
  expect(response).toBeDefined()
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
  expect(response.data).toBeDefined()
}

export const expectApiError = (error: any, expectedStatus?: number) => {
  expect(error.response).toBeDefined()
  expect(error.response.data.error).toBeTruthy()
  if (expectedStatus) {
    expect(error.response.status).toBe(expectedStatus)
  }
}

// Mock console methods for cleaner test output
export const suppressConsole = () => {
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn

  beforeAll(() => {
    originalConsoleError = console.error
    originalConsoleWarn = console.warn
    console.error = jest.fn()
    console.warn = jest.fn()
  })

  afterAll(() => {
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  })
}

// Performance testing utilities
export const measureExecutionTime = async (fn: () => Promise<any>) => {
  const start = Date.now()
  await fn()
  return Date.now() - start
}

export const expectFastExecution = async (fn: () => Promise<any>, maxMs = 100) => {
  const executionTime = await measureExecutionTime(fn)
  expect(executionTime).toBeLessThan(maxMs)
}
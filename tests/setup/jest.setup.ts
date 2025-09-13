// Global Jest setup for AI Query Builder tests
import '@testing-library/jest-dom'

// Mock console methods in tests to reduce noise
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: componentWillReceiveProps has been renamed'))
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('deprecated')
    ) {
      return
    }
    originalConsoleWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Mock fetch for API tests
global.fetch = jest.fn()

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'mysql://testuser:testpass@localhost:3306/test_db'

// Setup default timezone for consistent date tests
process.env.TZ = 'UTC'

// Increase timeout for integration tests
jest.setTimeout(10000)
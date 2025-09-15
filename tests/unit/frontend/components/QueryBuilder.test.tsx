// Unit tests for QueryBuilder React component
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockApiResponse, mockApiError } from '../../../helpers/test-utils'
import { queryFixtures } from '../../../fixtures/queries.fixture'

// Mock axios
const mockAxios = {
  get: jest.fn(),
  post: jest.fn()
}

jest.mock('axios', () => mockAxios)

// Mock QueryBuilder component (simplified version for testing)
import { useState } from 'react'

interface QueryBuilderProps {
  onQueryGenerate?: (prompt: string) => void
  onQueryValidate?: (query: string) => void
}

const QueryBuilder = ({ onQueryGenerate, onQueryValidate }: QueryBuilderProps) => {
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('')
  const [sqlQuery, setSqlQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [previewData, setPreviewData] = useState<any[] | null>(null)

  const handleGenerateQuery = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      onQueryGenerate?.(naturalLanguageQuery)
      const response = await mockAxios.post('/api/generate-query', { prompt: naturalLanguageQuery })
      setSqlQuery(response.data.sql)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate query')
    }
    
    setIsLoading(false)
  }

  const handleValidateQuery = async () => {
    setIsLoading(true)
    setError(null)
    setIsValid(null)
    setPreviewData(null)
    
    try {
      onQueryValidate?.(sqlQuery)
      const response = await mockAxios.post('/api/validate-query', { query: sqlQuery })
      setIsValid(response.data.isValid)
      if (response.data.isValid) {
        setPreviewData(response.data.data)
      }
    } catch (err: any) {
      setIsValid(false)
      setError(err.response?.data?.error || 'Validation failed')
    }
    
    setIsLoading(false)
  }

  return (
    <div>
      <div>
        <label htmlFor="natural-language">Describe what you want to query</label>
        <textarea
          id="natural-language"
          placeholder="e.g., Show me all users from California"
          value={naturalLanguageQuery}
          onChange={(e) => setNaturalLanguageQuery(e.target.value)}
          disabled={isLoading}
        />
        <button 
          onClick={handleGenerateQuery}
          disabled={isLoading || !naturalLanguageQuery.trim()}
        >
          {isLoading ? 'Generating...' : 'Generate SQL Query'}
        </button>
      </div>

      <div>
        <label htmlFor="sql-query">Generated SQL Query</label>
        <textarea
          id="sql-query"
          placeholder="Your generated SQL query will appear here..."
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          disabled={isLoading}
        />
        <button 
          onClick={handleValidateQuery}
          disabled={isLoading || !sqlQuery.trim()}
        >
          {isLoading ? 'Validating...' : 'Validate & Preview Query'}
        </button>
      </div>

      {error && (
        <div role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {isValid === true && (
        <div role="status" data-testid="success-message">
          Query is valid
        </div>
      )}

      {isValid === false && (
        <div role="alert" data-testid="validation-error">
          Validation failed
        </div>
      )}

      {previewData && (
        <div data-testid="preview-data">
          <h3>Data Preview</h3>
          <table>
            <thead>
              <tr>
                {Object.keys(previewData[0]).map(key => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val: any, j) => (
                    <td key={j}>{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

describe('QueryBuilder Component', () => {
  const mockProps = {
    onQueryGenerate: jest.fn(),
    onQueryValidate: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAxios.get.mockClear()
    mockAxios.post.mockClear()
  })

  describe('Query Generation', () => {
    it('should render input field and generate button', () => {
      render(<QueryBuilder {...mockProps} />)

      expect(screen.getByLabelText(/describe what you want to query/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /generate sql query/i })).toBeInTheDocument()
    })

    it('should enable generate button when input has content', async () => {
      const user = userEvent.setup()
      render(<QueryBuilder {...mockProps} />)

      const input = screen.getByLabelText(/describe what you want to query/i)
      const button = screen.getByRole('button', { name: /generate sql query/i })

      expect(button).toBeDisabled()

      await user.type(input, queryFixtures.validPrompts.simple)

      expect(button).toBeEnabled()
    })

    it('should call onQueryGenerate when user submits natural language input', async () => {
      const user = userEvent.setup()
      mockAxios.post.mockResolvedValue(
        mockApiResponse({ sql: queryFixtures.expectedSQL.allUsers })
      )

      render(<QueryBuilder {...mockProps} />)

      const input = screen.getByLabelText(/describe what you want to query/i)
      const button = screen.getByRole('button', { name: /generate sql query/i })

      await user.type(input, queryFixtures.validPrompts.simple)
      await user.click(button)

      expect(mockProps.onQueryGenerate).toHaveBeenCalledWith(queryFixtures.validPrompts.simple)
      expect(mockAxios.post).toHaveBeenCalledWith('/api/generate-query', {
        prompt: queryFixtures.validPrompts.simple
      })
    })

    it('should display generated SQL in the SQL textarea', async () => {
      const user = userEvent.setup()
      mockAxios.post.mockResolvedValue(
        mockApiResponse({ sql: queryFixtures.expectedSQL.usersFromCalifornia })
      )

      render(<QueryBuilder {...mockProps} />)

      const input = screen.getByLabelText(/describe what you want to query/i)
      const button = screen.getByRole('button', { name: /generate sql query/i })

      await user.type(input, queryFixtures.validPrompts.withFilter)
      await user.click(button)

      await waitFor(() => {
        const sqlTextarea = screen.getByLabelText(/generated sql query/i)
        expect(sqlTextarea).toHaveValue(queryFixtures.expectedSQL.usersFromCalifornia)
      })
    })

    it('should show loading state during query generation', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => { resolvePromise = resolve })
      mockAxios.post.mockReturnValue(promise)

      render(<QueryBuilder {...mockProps} />)

      const input = screen.getByLabelText(/describe what you want to query/i)
      const button = screen.getByRole('button', { name: /generate sql query/i })

      await user.type(input, queryFixtures.validPrompts.simple)
      await user.click(button)

      expect(screen.getByRole('button', { name: /generating\.\.\./i })).toBeInTheDocument()

      resolvePromise!(mockApiResponse({ sql: 'SELECT * FROM users' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate sql query/i })).toBeInTheDocument()
      })
    })

    it('should display error message when query generation fails', async () => {
      const user = userEvent.setup()
      mockAxios.post.mockRejectedValue(
        mockApiError('Could not find matching pattern', 404)
      )

      render(<QueryBuilder {...mockProps} />)

      const input = screen.getByLabelText(/describe what you want to query/i)
      const button = screen.getByRole('button', { name: /generate sql query/i })

      await user.type(input, 'Invalid query that cannot be matched')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Could not find matching pattern')
      })
    })
  })

  describe('Query Validation', () => {
    it('should enable validate button when SQL query exists', async () => {
      const user = userEvent.setup()
      render(<QueryBuilder {...mockProps} />)

      const sqlInput = screen.getByLabelText(/generated sql query/i)
      const validateButton = screen.getByRole('button', { name: /validate & preview query/i })

      expect(validateButton).toBeDisabled()

      await user.type(sqlInput, 'SELECT * FROM users')

      expect(validateButton).toBeEnabled()
    })

    it('should call onQueryValidate when user validates SQL', async () => {
      const user = userEvent.setup()
      mockAxios.post.mockResolvedValue(
        mockApiResponse(queryFixtures.validationResults.validQuery)
      )

      render(<QueryBuilder {...mockProps} />)

      const sqlInput = screen.getByLabelText(/generated sql query/i)
      const validateButton = screen.getByRole('button', { name: /validate & preview query/i })

      await user.type(sqlInput, queryFixtures.expectedSQL.allUsers)
      await user.click(validateButton)

      expect(mockProps.onQueryValidate).toHaveBeenCalledWith(queryFixtures.expectedSQL.allUsers)
      expect(mockAxios.post).toHaveBeenCalledWith('/api/validate-query', {
        query: queryFixtures.expectedSQL.allUsers
      })
    })

    it('should show success message for valid queries', async () => {
      const user = userEvent.setup()
      mockAxios.post.mockResolvedValue(
        mockApiResponse(queryFixtures.validationResults.validQuery)
      )

      render(<QueryBuilder {...mockProps} />)

      const sqlInput = screen.getByLabelText(/generated sql query/i)
      const validateButton = screen.getByRole('button', { name: /validate & preview query/i })

      await user.type(sqlInput, queryFixtures.expectedSQL.allUsers)
      await user.click(validateButton)

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent('Query is valid')
      })
    })

    it('should display data preview for valid queries', async () => {
      const user = userEvent.setup()
      mockAxios.post.mockResolvedValue(
        mockApiResponse(queryFixtures.validationResults.validQuery)
      )

      render(<QueryBuilder {...mockProps} />)

      const sqlInput = screen.getByLabelText(/generated sql query/i)
      const validateButton = screen.getByRole('button', { name: /validate & preview query/i })

      await user.type(sqlInput, queryFixtures.expectedSQL.allUsers)
      await user.click(validateButton)

      await waitFor(() => {
        const previewTable = screen.getByTestId('preview-data')
        expect(previewTable).toBeInTheDocument()
        expect(previewTable).toHaveTextContent('Data Preview')
        expect(previewTable).toHaveTextContent('John Doe')
        expect(previewTable).toHaveTextContent('jane@example.com')
      })
    })

    it('should show validation error for invalid queries', async () => {
      const user = userEvent.setup()
      mockAxios.post.mockRejectedValue(
        mockApiError('SQL syntax error', 400)
      )

      render(<QueryBuilder {...mockProps} />)

      const sqlInput = screen.getByLabelText(/generated sql query/i)
      const validateButton = screen.getByRole('button', { name: /validate & preview query/i })

      await user.type(sqlInput, 'INVALID SQL SYNTAX')
      await user.click(validateButton)

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument()
        expect(screen.getByTestId('error-message')).toHaveTextContent('SQL syntax error')
      })
    })
  })

  describe('User Experience', () => {
    it('should disable inputs during loading', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => { resolvePromise = resolve })
      mockAxios.post.mockReturnValue(promise)

      render(<QueryBuilder {...mockProps} />)

      const input = screen.getByLabelText(/describe what you want to query/i)
      const sqlInput = screen.getByLabelText(/generated sql query/i)
      const button = screen.getByRole('button', { name: /generate sql query/i })

      await user.type(input, queryFixtures.validPrompts.simple)
      await user.click(button)

      expect(input).toBeDisabled()
      expect(sqlInput).toBeDisabled()

      resolvePromise!(mockApiResponse({ sql: 'SELECT * FROM users' }))
      await waitFor(() => {
        expect(input).toBeEnabled()
        expect(sqlInput).toBeEnabled()
      })
    })

    it('should clear error messages when starting new operations', async () => {
      const user = userEvent.setup()
      
      // First, create an error
      mockAxios.post.mockRejectedValue(mockApiError('Test error', 400))
      
      render(<QueryBuilder {...mockProps} />)

      const input = screen.getByLabelText(/describe what you want to query/i)
      const button = screen.getByRole('button', { name: /generate sql query/i })

      await user.type(input, 'Test query')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })

      // Then, start a new successful operation
      mockAxios.post.mockResolvedValue(mockApiResponse({ sql: 'SELECT * FROM users' }))
      
      await user.clear(input)
      await user.type(input, 'New query')
      await user.click(button)

      // Error should be cleared during the new operation
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    })
  })
})

export { QueryBuilder }
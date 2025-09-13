// Test fixtures for query generation and validation
export const queryFixtures = {
  validPrompts: {
    simple: 'Show me all users',
    withFilter: 'Show me users from California',
    count: 'Count users in Texas',
    recent: 'Show recent orders',
    complex: 'Show me top selling products by category'
  },

  invalidPrompts: {
    empty: '',
    tooShort: 'hi',
    tooLong: 'a'.repeat(501), // Over 500 character limit
    specialChars: ''; DROP TABLE users; --',
    onlySpaces: '   '
  },

  expectedSQL: {
    allUsers: "SELECT id, name, email, signup_date FROM users ORDER BY signup_date DESC LIMIT 100",
    usersFromCalifornia: "SELECT id, name, email, signup_date FROM users WHERE state = 'california' ORDER BY signup_date DESC",
    countUsersInTexas: "SELECT category, COUNT(*) as product_count FROM products WHERE category = 'texas' GROUP BY category",
    recentOrders: "SELECT o.id, u.name, p.name as product_name, o.quantity, o.order_date FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY o.order_date DESC"
  },

  generatedQueries: {
    highConfidence: {
      sql: "SELECT id, name, email FROM users WHERE state = 'California'",
      confidence: 0.95,
      matchedPattern: {
        intent: 'find_users_by_state',
        description: 'Finds all users in a specific state',
        keywords: ['users', 'find', 'state', 'location', 'from']
      },
      extractedValues: ['california']
    },

    mediumConfidence: {
      sql: "SELECT COUNT(*) as product_count FROM products WHERE category = 'electronics'",
      confidence: 0.67,
      matchedPattern: {
        intent: 'count_products_by_category',
        description: 'Counts how many products are in a given category',
        keywords: ['count', 'products', 'category']
      },
      extractedValues: ['electronics']
    },

    lowConfidence: {
      sql: "SELECT * FROM products LIMIT 100",
      confidence: 0.3,
      matchedPattern: {
        intent: 'get_all_products',
        description: 'Retrieves all products',
        keywords: ['get', 'all', 'products']
      },
      extractedValues: []
    }
  },

  openAIResponses: {
    successful: {
      sql: "SELECT u.name, u.email, u.state FROM users u WHERE u.state = 'California' AND u.signup_date >= '2024-01-01'",
      confidence: 0.92,
      reasoning: 'Generated query to find users from California who signed up in 2024',
      tables_used: ['users']
    },

    withJoin: {
      sql: "SELECT u.name, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id ORDER BY order_count DESC LIMIT 10",
      confidence: 0.88,
      reasoning: 'Complex query to find users with most orders using JOIN and aggregation',
      tables_used: ['users', 'orders']
    }
  },

  validationResults: {
    validQuery: {
      isValid: true,
      syntaxValid: true,
      data: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ],
      rowCount: 2,
      executionTime: new Date().toISOString(),
      limited: true
    },

    invalidSyntax: {
      isValid: false,
      syntaxValid: false,
      error: 'SQL syntax error near SELECT',
      errorCode: 'ER_PARSE_ERROR',
      suggestion: 'Check your SQL syntax for typos or missing keywords'
    },

    executionError: {
      isValid: false,
      syntaxValid: true,
      error: "Table 'nonexistent_table' doesn't exist",
      errorCode: 'ER_NO_SUCH_TABLE',
      suggestion: 'The query is syntactically correct but failed to execute. Check table/column names.'
    }
  }
}

export const createMockQueryResponse = (
  overrides: Partial<typeof queryFixtures.generatedQueries.highConfidence> = {}
) => ({
  ...queryFixtures.generatedQueries.highConfidence,
  ...overrides
})
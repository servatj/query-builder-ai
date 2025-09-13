// Test fixtures for user data
export const userFixtures = {
  validUser: {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    signup_date: '2024-01-15',
    state: 'California',
    age: 28,
    phone: '555-0101'
  },

  userFromTexas: {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    signup_date: '2024-02-20',
    state: 'Texas',
    age: 32,
    phone: '555-0102'
  },

  recentUser: {
    id: 3,
    name: 'Mike Johnson',
    email: 'mike.j@example.com',
    signup_date: new Date().toISOString().split('T')[0], // Today
    state: 'New York',
    age: 25,
    phone: '555-0103'
  },

  invalidUser: {
    id: null,
    name: '',
    email: 'invalid-email',
    signup_date: 'invalid-date',
    state: null,
    age: -1,
    phone: ''
  },

  userList: [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      signup_date: '2024-01-15',
      state: 'California',
      age: 28
    },
    {
      id: 2,
      name: 'Jane Smith', 
      email: 'jane@example.com',
      signup_date: '2024-02-20',
      state: 'Texas',
      age: 32
    },
    {
      id: 3,
      name: 'Bob Wilson',
      email: 'bob@example.com',
      signup_date: '2024-01-10',
      state: 'California',
      age: 29
    }
  ]
}

export const createMockUser = (overrides: Partial<typeof userFixtures.validUser> = {}) => ({
  ...userFixtures.validUser,
  ...overrides
})
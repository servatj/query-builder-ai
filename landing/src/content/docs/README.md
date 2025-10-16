# AI Query Builder Documentation

Welcome to the comprehensive documentation for the AI-Powered Query Builder - a modern full-stack application that converts natural language prompts into validated SQL queries.

## 📖 Table of Contents

- [Getting Started](getting-started.md) - Quick setup and installation guide
- [User Guide](user-guide.md) - How to use the application effectively
- [Architecture](architecture.md) - Technical architecture and design decisions
- [API Reference](api-reference.md) - Backend API documentation
- [Development](development.md) - Development setup and contribution guide
- [Deployment](deployment.md) - Production deployment instructions

## ✨ Key Features

- **Natural Language to SQL**: Convert plain English descriptions into SQL queries
- **Real-time Validation**: Validate SQL syntax and show immediate feedback
- **Data Preview**: Execute queries safely with automatic LIMIT clauses and preview results
- **Modern UI**: Beautiful, responsive interface built with shadcn/ui and Tailwind CSS
- **Type Safety**: Full TypeScript support across frontend and backend
- **Pattern Matching**: Intelligent query generation using configurable rules and patterns

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd query-builder

# Install dependencies
npm install

# Start the application
npm run dev
```

Navigate to `http://localhost:5173` to use the application.

## 🛠 Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- shadcn/ui for beautiful UI components
- Axios for API communication

**Backend:**
- Node.js with Express
- TypeScript for type safety
- MySQL2 for database connectivity
- Vitest for testing
- Configurable query patterns in JSON

## 📝 License

This project is licensed under the ISC License.

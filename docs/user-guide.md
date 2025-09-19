# User Guide

This comprehensive guide will walk you through using the AI Query Builder to convert natural language into SQL queries.

## Overview

The AI Query Builder consists of three main components:
1. **Query Builder Interface** - Where you input natural language and generate SQL
2. **Settings Panel** - For configuration and schema management  
3. **Results Preview** - To validate and preview query results

![Application Overview](screenshots/app-overview.png)
*The main application interface showing the query builder, settings, and results sections*

## Basic Workflow

### 1. Enter Natural Language Query

Start by describing what you want to query in plain English:

![Natural Language Input](screenshots/natural-language-input.png)
*Enter your query description in the text area*

**Example Prompts:**
- "Show me all users from California"
- "Count products in electronics category"  
- "Get recent orders from last week"
- "Find customers who signed up this month"

### 2. Generate SQL Query

Click the "Generate SQL Query" button to convert your natural language into SQL:

![Generate SQL](screenshots/generate-sql.png)
*The generated SQL query with confidence score and metadata*

The system will:
- Parse your natural language input
- Match it against predefined patterns
- Generate appropriate SQL syntax
- Show confidence score and matched pattern details

### 3. Validate and Preview

Click "Validate & Preview Query" to check the SQL and see results:

![Validate and Preview](screenshots/validate-preview.png)
*Query validation results and data preview table*

The validation process:
- Checks SQL syntax for errors
- Executes the query safely with limits
- Shows preview of the first 20 rows
- Displays execution metadata

## Understanding Query Generation

### Confidence Scores

The system provides confidence scores to help you understand how well your query was interpreted:

- **80-100%** (Green) - High confidence, query likely accurate
- **50-79%** (Yellow) - Medium confidence, review recommended  
- **Below 50%** (Red) - Low confidence, manual review needed

### Pattern Matching

![Pattern Matching](screenshots/pattern-matching.png)
*Pattern matching details showing keywords and extracted values*

The system uses pattern matching to understand your intent:
- **Matched Pattern**: Shows which rule was triggered
- **Keywords**: Highlights the words that triggered the pattern
- **Extracted Values**: Shows parameters extracted from your input

## Working with Examples

### Using Quick Examples

The sidebar provides quick examples to get you started:

![Quick Examples](screenshots/quick-examples.png)
*Sidebar with example queries and database schema*

Click any example to:
- Populate the input field
- See how different queries are structured
- Learn the system's capabilities

### Database Schema Reference

The schema panel shows available tables and columns:

![Database Schema](screenshots/database-schema.png)
*Database schema showing tables and their columns*

This helps you understand:
- What tables are available
- Column names for each table
- Relationships between tables

## Advanced Features

### Query Editing

You can manually edit generated SQL queries:

![Query Editing](screenshots/query-editing.png)
*Manually editing the generated SQL query*

- Edit the SQL directly in the text area
- Validation will check your modified query
- Syntax highlighting helps identify issues

### Error Handling

When queries fail, the system provides helpful error messages:

![Error Handling](screenshots/error-handling.png)
*Error message with suggestions for fixing the query*

Error messages include:
- Specific error description
- Suggestions for fixing the issue
- Available patterns that might work better

### Settings Configuration

Access the settings panel to configure the application:

![Settings Panel](screenshots/settings-panel.png)
*Settings panel for configuration and schema management*

Settings include:
- Database connection configuration
- Schema editor for custom tables
- Pattern management for query rules

## Best Practices

### Writing Effective Prompts

**Good Examples:**
```
✅ "Show me users from Texas who signed up this year"
✅ "Count all products in the electronics category"
✅ "Get orders with quantity greater than 10"
```

**Less Effective:**
```
❌ "Give me data"
❌ "Show stuff"
❌ "Query the database"
```

### Tips for Better Results

1. **Be Specific**: Include table names, column names, and conditions
2. **Use Keywords**: The system recognizes patterns based on keywords
3. **Start Simple**: Begin with basic queries and build complexity
4. **Review Generated SQL**: Always validate the generated query makes sense
5. **Use Examples**: Learn from the provided examples in the sidebar

### Common Query Patterns

The system recognizes these common patterns:

| Intent | Example Prompt | Generated SQL Pattern |
|--------|----------------|----------------------|
| **Show All** | "Show all users" | `SELECT * FROM users` |
| **Filter by Location** | "Users from California" | `SELECT * FROM users WHERE state = 'California'` |
| **Count Records** | "Count products" | `SELECT COUNT(*) FROM products` |
| **Recent Records** | "Recent orders" | `SELECT * FROM orders ORDER BY date DESC` |
| **Filter by Category** | "Electronics products" | `SELECT * FROM products WHERE category = 'electronics'` |

## Troubleshooting

### Query Generation Issues

**Problem**: "No matching pattern found"
- **Solution**: Try rephrasing your query using keywords from examples
- **Solution**: Check if your table/column names match the schema

**Problem**: Low confidence score
- **Solution**: Be more specific about what you want
- **Solution**: Include table names and conditions explicitly

### Validation Errors

**Problem**: SQL syntax errors
- **Solution**: Check for typos in column names
- **Solution**: Verify table names match your schema
- **Solution**: Review the generated SQL for logical errors

**Problem**: "Table doesn't exist"
- **Solution**: Check the database schema panel
- **Solution**: Verify your database connection in settings
- **Solution**: Make sure the table name is spelled correctly

### Performance Issues

**Problem**: Slow query execution
- **Solution**: The system automatically adds LIMIT clauses for safety
- **Solution**: Consider adding more specific WHERE conditions
- **Solution**: Check if your query is accessing large tables efficiently

## Next Steps

- Explore the [API Reference](api-reference.md) for programmatic access
- Learn about [Development](development.md) to extend functionality
- Check [Settings](settings.md) for advanced configuration options

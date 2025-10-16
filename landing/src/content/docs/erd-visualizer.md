# ERD Visualizer

The ERD (Entity Relationship Diagram) Visualizer provides an interactive, visual representation of your database schema to help users better understand the structure and relationships within their database.

## Features

### 📊 **Visual Schema Display**
- **Grid View**: Card-based layout showing each table with its columns
- **List View**: Compact list showing tables with expandable details
- **Interactive**: Click on tables to expand/collapse details

### 🔍 **Smart Column Detection**
The visualizer automatically detects column types based on naming conventions:
- **🔑 Primary/Foreign Keys**: `id`, `*_id` columns
- **📧 Email Fields**: Columns containing "email"
- **🔒 Password Fields**: Columns containing "password"
- **📅 Date/Time Fields**: Columns with "date", "created_at", "updated_at"
- **📱 Phone Fields**: Columns containing "phone" or "mobile"
- **💰 Decimal/Money**: Columns with "amount", "price", "cost"
- **🔢 Integer Fields**: Columns with "count", "quantity", "number"
- **☑️ Boolean Fields**: Columns with "is_", "has_", "enabled", "active"
- **📦 JSON Fields**: Columns containing "json", "data", "metadata"
- **📝 Text/Varchar**: Default for other text fields

### 🔗 **Relationship Detection**
Automatically detects and visualizes table relationships:
- Identifies foreign key relationships based on naming patterns
- Shows outgoing references (tables this table references)
- Shows incoming references (tables that reference this table)
- Visual indicators with arrows and colors:
  - 🔵 Blue arrows: Outgoing references
  - 🟢 Green arrows: Incoming references

### 🎯 **Key Statistics**
Dashboard showing:
- **Total Tables**: Count of all tables in the database
- **Total Columns**: Sum of all columns across tables
- **Relationships**: Number of detected relationships
- **Average Columns/Table**: Average column count per table

### 🔎 **Search & Filter**
- Real-time search across:
  - Table names
  - Column names
  - Table descriptions
- Instant filtering of results

### 🎨 **Visual Features**
- **Color-coded columns**:
  - Yellow border: Primary keys (`id`)
  - Blue border: Foreign keys (`*_id`)
- **Hover effects**: Interactive highlighting
- **Responsive design**: Works on all screen sizes
- **Dark/Light mode**: Follows system theme

### 📋 **Legend**
A comprehensive legend at the bottom explains all icons and their meanings for quick reference.

## Usage

### Accessing the ERD Viewer
1. Navigate to the **"Schema"** tab in the main application
2. The schema will automatically load from your connected database

### Viewing Modes

#### Grid View
- Shows tables as cards in a grid layout
- Best for browsing and getting an overview
- Click any table card to select/deselect it

#### List View
- Shows tables in a compact list format
- Click to expand and see all columns
- Better for detailed analysis of specific tables

### Search
- Use the search bar to filter tables by:
  - Table name
  - Column name
  - Description text
- Search is case-insensitive and updates in real-time

### Understanding Relationships
- **Blue "references" arrows** (→): This table has a foreign key to another table
- **Green "referenced by" arrows** (←): Another table has a foreign key to this table
- Click on table names in relationships to quickly identify related tables

## Technical Details

### Data Source
- Schema data is fetched from `/api/patterns` endpoint
- Updates automatically when database configuration changes
- Supports any MySQL database schema

### Relationship Detection Algorithm
The visualizer uses smart pattern matching to detect relationships:
```
Pattern: column_name matches *_id
Example: user_id → references "user" or "users" table
```

### Column Type Detection
Based on column naming conventions commonly used in database design:
- Follows industry best practices
- Customizable for your specific naming conventions

## Benefits

1. **Better Understanding**: Quickly visualize complex database structures
2. **Query Planning**: See available columns and relationships before writing queries
3. **Documentation**: Visual reference for database structure
4. **Onboarding**: Help new team members understand the data model
5. **AI Training**: Better context for AI-powered query generation

## Future Enhancements

Potential features for future versions:
- Export schema as image (PNG/SVG)
- Interactive relationship diagram with graph visualization
- Schema comparison between databases
- Data type information from database metadata
- Cardinality indicators (1:1, 1:N, N:M)
- Custom relationship annotations
- Schema versioning and history

## Tips

- **Use grid view** for initial exploration of unfamiliar databases
- **Use list view** when you need to see all columns at once
- **Search** when you know what you're looking for
- **Check relationships** to understand data dependencies
- **Refer to the legend** to understand column type icons

---

The ERD Visualizer makes it easy to explore and understand your database structure, improving both manual query building and AI-powered query generation!

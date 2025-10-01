# Interactive Diagram Visualizer

An advanced ERD (Entity Relationship Diagram) visualizer built with React Flow that provides a fully interactive, draggable, and zoomable representation of your database schema.

## 🎨 Features

### **Interactive Canvas**
- **Drag & Drop**: Move tables anywhere on the canvas
- **Pan & Zoom**: Navigate large schemas with ease
- **Smooth Animations**: Animated relationship lines
- **Mini Map**: Bird's eye view for quick navigation
- **Fit to View**: Automatic optimal zoom level

### **Three Layout Algorithms**

#### 1. **Hierarchical Layout** (Default)
- Organizes tables based on relationships
- Parent tables at the top
- Child tables (those with foreign keys) below
- Best for understanding data flow and dependencies

#### 2. **Grid Layout**
- Evenly distributed grid pattern
- Perfect for equal importance tables
- Clean and organized appearance
- Easy to scan all tables

#### 3. **Circular Layout**
- Tables arranged in a circle
- Great for showing network relationships
- Aesthetic and balanced
- Good for presentations

### **Visual Table Nodes**

Each table is displayed as a beautiful card with:
- **Blue Header**: Table name and description
- **Column List**: Scrollable list of all columns
- **Visual Indicators**:
  - 🔑 Yellow highlight for primary keys (`id`)
  - 🔗 Blue highlight for foreign keys (`*_id`)
- **Column Count**: Badge showing total columns
- **Hover Effects**: Interactive highlighting

### **Relationship Mapping**

Automatically detects and visualizes:
- **Foreign Key Relationships**: Based on `*_id` naming convention
- **Animated Edges**: Blue arrows showing data flow
- **Edge Labels**: Display foreign key column names
- **Smart Detection**: Handles various naming patterns:
  - `user_id` → `users` table
  - `customer_id` → `customer` table
  - Handles singular/plural variations
  - Handles underscores and naming differences

### **Control Panel**
- **Background Grid**: Visual alignment grid
- **Zoom Controls**: +/- buttons and reset
- **Mini Map**: Toggle on/off
- **Legend**: Key for understanding symbols
- **Usage Tips**: Context-sensitive help

### **Statistics Dashboard**
Real-time display of:
- Total number of tables
- Total number of relationships
- Total columns across all tables
- Current layout algorithm

## 🚀 Usage

### Getting Started

1. **Navigate to Diagram Tab**: Click the "Diagram" tab in the navigation
2. **View Your Schema**: The diagram loads automatically
3. **Explore**: Use mouse/trackpad to navigate

### Navigation Controls

#### Mouse/Trackpad
- **Pan**: Click and drag on empty space
- **Zoom**: Scroll up/down or pinch gesture
- **Move Table**: Click and drag a table node
- **Select**: Click on a table to highlight

#### Control Panel
- **Zoom In/Out**: Use +/- buttons
- **Fit View**: Click fit-to-view button
- **Reset**: Double-click to reset position

### Layout Options

Click layout buttons to switch between:
- **Hierarchical**: Best for understanding relationships
- **Grid**: Best for browsing all tables
- **Circular**: Best for balanced view

### Mini Map

- Toggle mini map with the button
- Click anywhere on mini map to jump to that location
- See highlighted viewport area
- Quickly navigate large schemas

## 💡 Tips & Tricks

### For Small Schemas (< 10 tables)
- Use **Hierarchical layout** to see relationships clearly
- Turn off mini map for more space
- Zoom in to see column details

### For Medium Schemas (10-30 tables)
- Start with **Grid layout** for overview
- Switch to **Hierarchical** to understand specific relationships
- Use mini map for navigation
- Use search (if available) to find specific tables

### For Large Schemas (30+ tables)
- Use **Grid layout** initially
- Zoom in on specific areas of interest
- Keep mini map visible for orientation
- Consider splitting analysis into logical groups

### Understanding Relationships
1. **Follow the arrows**: Direction shows foreign key → primary key
2. **Check labels**: Edge labels show the foreign key column name
3. **Trace paths**: Follow connections to understand data flow
4. **Count connections**: More arrows = more important table

## 🎯 Use Cases

### 1. **Database Design Review**
- Visualize existing schema structure
- Identify missing relationships
- Spot potential optimization opportunities
- Validate data model design

### 2. **Query Planning**
- See which tables connect before writing JOINs
- Understand data flow for complex queries
- Identify shortest path between tables
- Plan optimal query execution

### 3. **Documentation**
- Export visual representation for documentation
- Share schema with team members
- Use in presentations and training
- Onboard new developers

### 4. **AI Query Context**
- Better understand available relationships
- Provide better prompts to AI
- Validate AI-generated JOIN logic
- Learn table connections for future queries

### 5. **Database Migration**
- Plan data migration paths
- Identify dependent tables
- Understand impact of schema changes
- Visualize before/after states

## 🔧 Technical Details

### Built With
- **React Flow**: Core diagram engine
- **React**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling

### Performance
- Optimized for schemas up to 100+ tables
- Lazy rendering for large diagrams
- Efficient re-rendering with React Flow
- Smooth animations at 60fps

### Relationship Detection
Uses intelligent pattern matching:
```typescript
// Detects patterns like:
user_id → users
customer_id → customer/customers
order_id → orders
product_id → products
// Handles underscores, plurals, case variations
```

### Layout Algorithms

**Hierarchical**: BFS-based level assignment
- O(n) time complexity
- Creates parent-child hierarchy
- Handles cycles gracefully

**Grid**: Simple mathematical distribution
- O(n) time complexity
- Calculates optimal grid dimensions
- Evenly spaces all nodes

**Circular**: Polar coordinate distribution
- O(n) time complexity
- Calculates radius based on table count
- Even angular distribution

## 🎨 Customization

### Colors
- **Blue (#3b82f6)**: Primary color for relationships
- **Yellow**: Primary keys
- **Blue**: Foreign keys
- **Gray**: Regular columns

### Spacing
- **Horizontal**: 400px between tables
- **Vertical**: 400px between levels
- **Node Size**: 250-300px wide, auto height

## 📱 Responsive Design

- Works on desktop and tablet
- Touch-friendly on tablets
- Pinch to zoom support
- Swipe to pan support

## 🔮 Future Enhancements

Potential features for future versions:
- Export as PNG/SVG image
- Custom color themes
- Table grouping/clustering
- Cardinality indicators (1:1, 1:N, N:M)
- Column data type display
- Index visualization
- Constraint visualization
- Schema comparison mode
- Undo/Redo for layout changes
- Save custom layouts
- Collaborative editing
- Real-time schema updates

## 🐛 Troubleshooting

### Diagram Not Loading
- Check backend connection
- Verify database is connected
- Refresh the page
- Check browser console for errors

### Tables Overlapping
- Try different layout algorithm
- Manually drag tables to adjust
- Use fit-to-view to reset
- Increase browser zoom level

### Performance Issues
- Close other browser tabs
- Disable mini map for large schemas
- Use simpler layout (Grid)
- Consider filtering to fewer tables

### Relationships Not Showing
- Verify column naming follows `*_id` pattern
- Check that referenced tables exist
- Ensure foreign keys are properly named
- Check browser console for warnings

## 📚 Resources

- [React Flow Documentation](https://reactflow.dev/)
- [Database Design Best Practices](https://www.vertabelo.com/blog/database-design-best-practices/)
- [ERD Notation Guide](https://www.visual-paradigm.com/guide/data-modeling/what-is-entity-relationship-diagram/)

---

The Interactive Diagram Visualizer transforms your database schema into a beautiful, interactive, and explorable visual experience! 🎉

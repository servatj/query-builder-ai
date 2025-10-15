import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_BASE_URL = '';

interface TableSchema {
  columns: string[];
  description: string;
}

interface DatabaseSchema {
  [tableName: string]: TableSchema;
}

interface TableRelationship {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
  type: 'one-to-many' | 'many-to-one' | 'one-to-one';
}

interface TableNodeData {
  label: string;
  columns: string[];
  description: string;
}

// Custom node component for tables
const TableNode = ({ data }: { data: TableNodeData }) => {
  const { label, columns, description } = data;
  
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-[250px] max-w-[300px]">
      {/* Table Header */}
      <div className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-3 rounded-t-lg border-b-2 border-blue-700 dark:border-blue-800">
        <div className="font-bold text-lg">{label}</div>
        {description && (
          <div className="text-xs text-blue-100 dark:text-blue-200 mt-1 truncate">{description}</div>
        )}
      </div>
      
      {/* Table Columns */}
      <div className="max-h-[300px] overflow-y-auto">
        {columns.map((column: string, idx: number) => {
          const isPrimaryKey = column.toLowerCase() === 'id';
          const isForeignKey = column.toLowerCase().endsWith('_id') && !isPrimaryKey;
          
          return (
            <div 
              key={idx} 
              className={`px-4 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                isPrimaryKey ? 'bg-yellow-50 dark:bg-yellow-900/20' : isForeignKey ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {isPrimaryKey && <span className="text-yellow-600 dark:text-yellow-400">🔑</span>}
                {isForeignKey && <span className="text-blue-600 dark:text-blue-400">🔗</span>}
                <span className={`font-mono text-sm text-gray-900 dark:text-gray-100 ${isPrimaryKey || isForeignKey ? 'font-semibold' : ''}`}>
                  {column}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Column Count Badge */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
        <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
          {columns.length} column{columns.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

interface DiagramVisualizerProps {
  schema?: DatabaseSchema | null;
}

function DiagramVisualizer({ schema: propSchema }: DiagramVisualizerProps) {
  const [schema, setSchema] = useState<DatabaseSchema | null>(propSchema || null);
  const [isLoading, setIsLoading] = useState(!propSchema);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<'hierarchical' | 'grid' | 'circular'>('hierarchical');
  const [showMiniMap, setShowMiniMap] = useState(true);

  // Update schema when prop changes
  useEffect(() => {
    if (propSchema) {
      setSchema(propSchema);
      setIsLoading(false);
      setError(null);
      // Generate diagram with the new schema
      const response = { schema: propSchema, relationships: [] };
      generateDiagram(propSchema, layoutAlgorithm, response.relationships || detectRelationships(propSchema));
    }
  }, [propSchema, layoutAlgorithm]);

  useEffect(() => {
    if (!propSchema) {
      loadSchema();
    }
  }, [propSchema]);

  const loadSchema = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/patterns`);
      if (response.data.schema) {
        setSchema(response.data.schema);
        generateDiagram(response.data.schema, layoutAlgorithm, response.data.relationships);
      } else {
        setError('No schema data available');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load database schema');
      console.error('Schema load error:', err);
    }
    
    setIsLoading(false);
  };

  const detectRelationships = (schemaData: DatabaseSchema): TableRelationship[] => {
    const relationships: TableRelationship[] = [];
    
    Object.entries(schemaData).forEach(([tableName, tableInfo]) => {
      tableInfo.columns.forEach(column => {
        // Detect foreign key patterns
        const fkPattern = /^(.+?)_id$/i;
        const match = column.match(fkPattern);
        
        if (match) {
          const referencedTable = match[1];
          // Find matching table
          const possibleTables = Object.keys(schemaData).filter(t => {
            const tLower = t.toLowerCase();
            const refLower = referencedTable.toLowerCase();
            return (
              tLower === refLower ||
              tLower === refLower + 's' ||
              tLower + 's' === refLower ||
              tLower === refLower.replace(/_/g, '') ||
              tLower.replace(/_/g, '') === refLower
            );
          });
          
          if (possibleTables.length > 0) {
            relationships.push({
              from: tableName,
              fromColumn: column,
              to: possibleTables[0],
              toColumn: 'id',
              type: 'many-to-one'
            });
          }
        }
      });
    });
    
    return relationships;
  };

  const generateDiagram = (
    schemaData: DatabaseSchema,
    layout: 'hierarchical' | 'grid' | 'circular',
    apiRelationships?: Array<{ from: string; fromColumn: string; to: string; toColumn: string }>
  ) => {
    const tableNames = Object.keys(schemaData);
    const relationshipsFromApi = (apiRelationships || []).filter(r =>
      r.from in schemaData && r.to in schemaData
    );
    const relationships = relationshipsFromApi.length > 0
      ? relationshipsFromApi.map(r => ({ ...r, type: 'many-to-one' as const }))
      : detectRelationships(schemaData);
    
    // Generate nodes
    const newNodes: Node[] = [];
    const positions = calculatePositions(tableNames, relationships, layout);
    
    tableNames.forEach((tableName) => {
      newNodes.push({
        id: tableName,
        type: 'tableNode',
        position: positions[tableName] || { x: 0, y: 0 },
        data: {
          label: tableName,
          columns: schemaData[tableName].columns,
          description: schemaData[tableName].description,
        },
      });
    });
    
    // Generate edges
    // Check if dark mode is active
    const isDarkMode = document.documentElement.classList.contains('dark');
    const purple = '#a855f7'; // Tailwind purple-500 to match Generate button
    const newEdges: Edge[] = relationships.map((rel, idx) => ({
      id: `${rel.from}-${rel.to}-${idx}`,
      source: rel.from,
      target: rel.to,
      type: 'smoothstep',
      animated: true,
      label: rel.fromColumn,
      labelStyle: { fontSize: 10, fill: isDarkMode ? '#d1d5db' : '#666', fontWeight: 500 },
      labelBgStyle: { fill: isDarkMode ? '#374151' : '#fff', fillOpacity: 0.9 },
      style: { stroke: purple, strokeWidth: 2 },
      markerEnd: {
        type: 'arrowclosed' as const,
        color: purple,
      },
    }));
    
    setNodes(newNodes);
    setEdges(newEdges);
  };

  const calculatePositions = (
    tableNames: string[],
    relationships: TableRelationship[],
    layout: 'hierarchical' | 'grid' | 'circular'
  ): Record<string, { x: number; y: number }> => {
    const positions: Record<string, { x: number; y: number }> = {};
    const horizontalSpacing = 400;
    const verticalSpacing = 400;
    
    if (layout === 'grid') {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(tableNames.length));
      tableNames.forEach((tableName, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        positions[tableName] = {
          x: col * horizontalSpacing,
          y: row * verticalSpacing,
        };
      });
    } else if (layout === 'circular') {
      // Circular layout
      const radius = Math.max(300, (tableNames.length * 80) / (2 * Math.PI));
      const centerX = radius;
      const centerY = radius;
      
      tableNames.forEach((tableName, idx) => {
        const angle = (2 * Math.PI * idx) / tableNames.length;
        positions[tableName] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      });
    } else {
      // Hierarchical layout (simple version based on relationships)
      const levels = new Map<string, number>();
      const visited = new Set<string>();
      
      // Find root tables (tables that aren't referenced by others)
      const referencedTables = new Set(relationships.map(r => r.to));
      const rootTables = tableNames.filter(t => !referencedTables.has(t));
      
      // Assign levels using BFS
      const queue: Array<{ table: string; level: number }> = rootTables.map(t => ({ table: t, level: 0 }));
      
      while (queue.length > 0) {
        const { table, level } = queue.shift()!;
        
        if (visited.has(table)) continue;
        visited.add(table);
        levels.set(table, level);
        
        // Find children (tables that reference this table)
        const children = relationships.filter(r => r.to === table).map(r => r.from);
        children.forEach(child => {
          if (!visited.has(child)) {
            queue.push({ table: child, level: level + 1 });
          }
        });
      }
      
      // Handle unvisited tables (isolated tables or cycles)
      tableNames.forEach(tableName => {
        if (!levels.has(tableName)) {
          levels.set(tableName, 0);
        }
      });
      
      // Assign positions based on levels
      const tablesAtLevel = new Map<number, string[]>();
      tableNames.forEach(tableName => {
        const level = levels.get(tableName) ?? 0;
        if (!tablesAtLevel.has(level)) {
          tablesAtLevel.set(level, []);
        }
        tablesAtLevel.get(level)!.push(tableName);
      });
      
      tablesAtLevel.forEach((tables, level) => {
        tables.forEach((tableName, idx) => {
          const totalAtLevel = tables.length;
          const startX = -(totalAtLevel - 1) * horizontalSpacing / 2;
          positions[tableName] = {
            x: startX + idx * horizontalSpacing,
            y: level * verticalSpacing,
          };
        });
      });
    }
    
    return positions;
  };

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleLayoutChange = (newLayout: 'hierarchical' | 'grid' | 'circular') => {
    setLayoutAlgorithm(newLayout);
    if (schema) {
      generateDiagram(schema, newLayout);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-muted-foreground">Loading schema diagram...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!schema || nodes.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Schema Available</AlertTitle>
        <AlertDescription>
          No database schema found. Please ensure the backend is connected to a database.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Interactive Database Diagram</h2>
          <p className="text-muted-foreground">
            Visual ERD with draggable tables and relationship mapping
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={layoutAlgorithm === 'hierarchical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLayoutChange('hierarchical')}
          >
            Hierarchical
          </Button>
          <Button
            variant={layoutAlgorithm === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLayoutChange('grid')}
          >
            Grid
          </Button>
          <Button
            variant={layoutAlgorithm === 'circular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLayoutChange('circular')}
          >
            Circular
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMiniMap(!showMiniMap)}
          >
            {showMiniMap ? 'Hide' : 'Show'} MiniMap
          </Button>
          <Button variant="outline" size="sm" onClick={loadSchema}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{nodes.length}</div>
              <div className="text-xs text-muted-foreground">Tables</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{edges.length}</div>
              <div className="text-xs text-muted-foreground">Relationships</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(schema).reduce((sum, table) => sum + table.columns.length, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Columns</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 capitalize">{layoutAlgorithm}</div>
              <div className="text-xs text-muted-foreground">Layout</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* React Flow Diagram */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div style={{ height: '700px', width: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{
                padding: 0.2,
              }}
              minZoom={0.1}
              maxZoom={2}
              defaultEdgeOptions={{
                animated: true,
              }}
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Controls />
              {showMiniMap && (
                <MiniMap
                  nodeColor={() => '#3b82f6'}
                  nodeStrokeWidth={3}
                  zoomable
                  pannable
                  maskColor="rgb(0, 0, 0, 0.1)"
                />
              )}
              <Panel position="top-left" className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                <div className="text-sm space-y-2">
                  <div className="font-semibold text-gray-700 dark:text-gray-200">Legend</div>
                  <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-100">
                    <span className="text-yellow-600 dark:text-yellow-400">🔑</span>
                    <span>Primary Key</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-100">
                    <span className="text-blue-600 dark:text-blue-400">🔗</span>
                    <span>Foreign Key</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-100">
                    <div className="w-8 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
                    <span>Relationship</span>
                  </div>
                </div>
              </Panel>
              <Panel position="bottom-right" className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  💡 Drag tables to rearrange • Scroll to zoom
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-2">🖱️ Navigation</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Drag to pan around</li>
                <li>• Scroll to zoom in/out</li>
                <li>• Click and drag tables to move them</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">🎨 Layouts</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Hierarchical: Parent-child structure</li>
                <li>• Grid: Organized grid layout</li>
                <li>• Circular: Tables in a circle</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">🔗 Relationships</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Blue arrows show foreign keys</li>
                <li>• Animated edges indicate connections</li>
                <li>• Labels show column names</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DiagramVisualizer;

import { useState, useEffect } from 'react';
import { axios, API_BASE_URL } from '@/lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TableSchema {
  columns: string[];
  description: string;
}

interface DatabaseSchema {
  [tableName: string]: TableSchema;
}

interface TableRelationship {
  from: string;
  to: string;
  type: 'one-to-many' | 'many-to-one' | 'one-to-one' | 'many-to-many';
}

interface ERDViewerProps {
  schema?: DatabaseSchema | null;
}

function ERDViewer({ schema: propSchema }: ERDViewerProps) {
  const [schema, setSchema] = useState<DatabaseSchema | null>(propSchema || null);
  const [isLoading, setIsLoading] = useState(!propSchema);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);

  // Update schema when prop changes
  useEffect(() => {
    if (propSchema) {
      setSchema(propSchema);
      setIsLoading(false);
      setError(null);
      detectRelationships(propSchema);
    }
  }, [propSchema]);

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
        detectRelationships(response.data.schema);
      } else {
        setError('No schema data available');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load database schema');
      console.error('Schema load error:', err);
    }
    
    setIsLoading(false);
  };

  const detectRelationships = (schemaData: DatabaseSchema) => {
    const detectedRelationships: TableRelationship[] = [];
    
    // Detect foreign key relationships based on column naming conventions
    Object.entries(schemaData).forEach(([tableName, tableInfo]) => {
      tableInfo.columns.forEach(column => {
        // Common FK patterns: table_id, tableId, table_name_id
        const fkPattern = /^(.+?)_id$/i;
        const match = column.match(fkPattern);
        
        if (match) {
          const referencedTable = match[1];
          // Check if the referenced table exists in schema
          const possibleTables = Object.keys(schemaData).filter(t => 
            t.toLowerCase() === referencedTable.toLowerCase() ||
            t.toLowerCase() === referencedTable.toLowerCase() + 's' ||
            t.toLowerCase() + 's' === referencedTable.toLowerCase()
          );
          
          if (possibleTables.length > 0) {
            detectedRelationships.push({
              from: tableName,
              to: possibleTables[0],
              type: 'many-to-one'
            });
          }
        }
      });
    });
    
    setRelationships(detectedRelationships);
  };

  const getColumnType = (columnName: string): string => {
    const lower = columnName.toLowerCase();
    
    if (lower === 'id' || lower.endsWith('_id')) return 'PK/FK';
    if (lower.includes('email')) return 'email';
    if (lower.includes('password')) return 'password';
    if (lower.includes('date') || lower.includes('created_at') || lower.includes('updated_at')) return 'datetime';
    if (lower.includes('phone') || lower.includes('mobile')) return 'phone';
    if (lower.includes('amount') || lower.includes('price') || lower.includes('cost')) return 'decimal';
    if (lower.includes('count') || lower.includes('quantity') || lower.includes('number')) return 'integer';
    if (lower.includes('is_') || lower.includes('has_') || lower.includes('enabled') || lower.includes('active')) return 'boolean';
    if (lower.includes('json') || lower.includes('data') || lower.includes('metadata')) return 'json';
    
    return 'varchar';
  };

  const getColumnIcon = (type: string): string => {
    switch (type) {
      case 'PK/FK': return '🔑';
      case 'email': return '📧';
      case 'password': return '🔒';
      case 'datetime': return '📅';
      case 'phone': return '📱';
      case 'decimal': return '💰';
      case 'integer': return '🔢';
      case 'boolean': return '☑️';
      case 'json': return '📦';
      default: return '📝';
    }
  };

  const getRelationshipsForTable = (tableName: string) => {
    return {
      outgoing: relationships.filter(r => r.from === tableName),
      incoming: relationships.filter(r => r.to === tableName)
    };
  };

  const filteredTables = schema ? Object.entries(schema).filter(([tableName, tableInfo]) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tableName.toLowerCase().includes(searchLower) ||
      tableInfo.description.toLowerCase().includes(searchLower) ||
      tableInfo.columns.some(col => col.toLowerCase().includes(searchLower))
    );
  }) : [];

  const handleTableClick = (tableName: string) => {
    setSelectedTable(selectedTable === tableName ? null : tableName);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-muted-foreground">Loading schema...</div>
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

  if (!schema) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Database Schema Visualizer</h2>
          <p className="text-muted-foreground">
            Interactive ERD view of your database structure
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          <Button variant="outline" size="sm" onClick={loadSchema}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Schema Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{Object.keys(schema).length}</div>
              <div className="text-sm text-muted-foreground">Tables</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Object.values(schema).reduce((sum, table) => sum + table.columns.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Columns</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{relationships.length}</div>
              <div className="text-sm text-muted-foreground">Relationships</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {Math.round(Object.values(schema).reduce((sum, table) => sum + table.columns.length, 0) / Object.keys(schema).length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Columns/Table</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search tables, columns, or descriptions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-border rounded-md bg-background"
        />
      </div>

      {/* Tables Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTables.map(([tableName, tableInfo]) => {
            const tableRelationships = getRelationshipsForTable(tableName);
            const isSelected = selectedTable === tableName;
            
            return (
              <Card 
                key={tableName}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleTableClick(tableName)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {tableName}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {tableInfo.description || 'No description available'}
                      </CardDescription>
                    </div>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {tableInfo.columns.length} cols
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {tableInfo.columns.map((column, idx) => {
                      const columnType = getColumnType(column);
                      const icon = getColumnIcon(columnType);
                      const isPrimaryKey = column.toLowerCase() === 'id';
                      const isForeignKey = column.toLowerCase().endsWith('_id') && !isPrimaryKey;
                      
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted ${
                            isPrimaryKey ? 'bg-yellow-50 border-l-2 border-yellow-500' :
                            isForeignKey ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{icon}</span>
                            <span className={`font-mono ${isPrimaryKey || isForeignKey ? 'font-semibold' : ''}`}>
                              {column}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{columnType}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Relationships */}
                  {(tableRelationships.outgoing.length > 0 || tableRelationships.incoming.length > 0) && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">Relationships</div>
                      {tableRelationships.outgoing.length > 0 && (
                        <div className="space-y-1">
                          {tableRelationships.outgoing.map((rel, idx) => (
                            <div key={idx} className="text-xs flex items-center gap-2 text-blue-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                              references <span className="font-semibold">{rel.to}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {tableRelationships.incoming.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {tableRelationships.incoming.map((rel, idx) => (
                            <div key={idx} className="text-xs flex items-center gap-2 text-green-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                              </svg>
                              referenced by <span className="font-semibold">{rel.from}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredTables.map(([tableName, tableInfo]) => {
            const tableRelationships = getRelationshipsForTable(tableName);
            const isSelected = selectedTable === tableName;
            
            return (
              <Card 
                key={tableName}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleTableClick(tableName)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <CardTitle>{tableName}</CardTitle>
                        <CardDescription className="text-xs">
                          {tableInfo.description || 'No description available'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Columns:</span>{' '}
                        <span className="font-semibold">{tableInfo.columns.length}</span>
                      </div>
                      {(tableRelationships.outgoing.length > 0 || tableRelationships.incoming.length > 0) && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Relations:</span>{' '}
                          <span className="font-semibold">
                            {tableRelationships.outgoing.length + tableRelationships.incoming.length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {isSelected && (
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {tableInfo.columns.map((column, idx) => {
                        const columnType = getColumnType(column);
                        const icon = getColumnIcon(columnType);
                        const isPrimaryKey = column.toLowerCase() === 'id';
                        const isForeignKey = column.toLowerCase().endsWith('_id') && !isPrimaryKey;
                        
                        return (
                          <div 
                            key={idx} 
                            className={`flex items-center gap-2 text-sm py-2 px-3 rounded border ${
                              isPrimaryKey ? 'bg-yellow-50 border-yellow-300' :
                              isForeignKey ? 'bg-blue-50 border-blue-300' : 
                              'bg-muted border-border'
                            }`}
                          >
                            <span>{icon}</span>
                            <span className="font-mono text-xs">{column}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Relationships in list view */}
                    {(tableRelationships.outgoing.length > 0 || tableRelationships.incoming.length > 0) && (
                      <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tableRelationships.outgoing.length > 0 && (
                          <div>
                            <div className="text-sm font-semibold mb-2">References</div>
                            <div className="space-y-1">
                              {tableRelationships.outgoing.map((rel, idx) => (
                                <div key={idx} className="text-sm flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-2 rounded">
                                  → <span className="font-semibold">{rel.to}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {tableRelationships.incoming.length > 0 && (
                          <div>
                            <div className="text-sm font-semibold mb-2">Referenced By</div>
                            <div className="space-y-1">
                              {tableRelationships.incoming.map((rel, idx) => (
                                <div key={idx} className="text-sm flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                                  ← <span className="font-semibold">{rel.from}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {filteredTables.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">
              No tables found matching "{searchTerm}"
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span>🔑</span>
              <span>Primary/Foreign Key</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📝</span>
              <span>Text/Varchar</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔢</span>
              <span>Integer</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <span>Decimal/Money</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>Date/Datetime</span>
            </div>
            <div className="flex items-center gap-2">
              <span>☑️</span>
              <span>Boolean</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📧</span>
              <span>Email</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔒</span>
              <span>Password</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📱</span>
              <span>Phone</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📦</span>
              <span>JSON</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ERDViewer;

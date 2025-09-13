import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface TableSchema {
  columns: string[];
  description: string;
}

interface SchemaEditorProps {
  schema: Record<string, TableSchema>;
  onSchemaChange: (newSchema: Record<string, TableSchema>) => void;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({ schema, onSchemaChange }) => {
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [newTableColumns, setNewTableColumns] = useState('');

  const addNewTable = () => {
    if (!newTableName.trim()) return;
    
    const columns = newTableColumns
      .split('\n')
      .map(col => col.trim())
      .filter(col => col.length > 0);
    
    const newSchema = {
      ...schema,
      [newTableName.trim()]: {
        columns,
        description: newTableDescription.trim() || 'No description provided'
      }
    };
    
    onSchemaChange(newSchema);
    setNewTableName('');
    setNewTableDescription('');
    setNewTableColumns('');
  };

  const removeTable = (tableName: string) => {
    const newSchema = { ...schema };
    delete newSchema[tableName];
    onSchemaChange(newSchema);
  };

  const updateTable = (tableName: string, updatedTable: TableSchema) => {
    const newSchema = {
      ...schema,
      [tableName]: updatedTable
    };
    onSchemaChange(newSchema);
  };

  return (
    <div className="space-y-4">
      {/* Existing Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(schema).map(([tableName, tableInfo]) => (
          <Card key={tableName} className="relative">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{tableName}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeTable(tableName)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
              <CardDescription className="text-sm">
                {tableInfo.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium">Columns ({tableInfo.columns.length})</div>
                <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                  {tableInfo.columns.map((column, index) => (
                    <div key={index} className="py-1 px-2 bg-muted rounded mb-1">
                      {column}
                    </div>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTable(tableName)}
                  className="w-full mt-2"
                >
                  Edit Table
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Table</CardTitle>
          <CardDescription>
            Define a new table with columns and description
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Table Name</label>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g., users, orders, products"
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                value={newTableDescription}
                onChange={(e) => setNewTableDescription(e.target.value)}
                placeholder="Brief description of the table"
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Columns (one per line)</label>
            <Textarea
              value={newTableColumns}
              onChange={(e) => setNewTableColumns(e.target.value)}
              placeholder={`id\nname\nemail\ncreated_at\nupdated_at`}
              className="font-mono text-sm"
              rows={6}
            />
          </div>
          
          <Button onClick={addNewTable} disabled={!newTableName.trim()}>
            Add Table
          </Button>
        </CardContent>
      </Card>

      {/* Edit Table Modal */}
      {editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>Edit Table: {editingTable}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TableEditor
                tableName={editingTable}
                tableInfo={schema[editingTable]}
                onSave={(updatedTable) => {
                  updateTable(editingTable, updatedTable);
                  setEditingTable(null);
                }}
                onCancel={() => setEditingTable(null)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

interface TableEditorProps {
  tableName: string;
  tableInfo: TableSchema;
  onSave: (tableInfo: TableSchema) => void;
  onCancel: () => void;
}

const TableEditor: React.FC<TableEditorProps> = ({ tableName, tableInfo, onSave, onCancel }) => {
  const [description, setDescription] = useState(tableInfo.description);
  const [columns, setColumns] = useState(tableInfo.columns.join('\n'));

  const handleSave = () => {
    const columnList = columns
      .split('\n')
      .map(col => col.trim())
      .filter(col => col.length > 0);
    
    onSave({
      columns: columnList,
      description: description.trim() || 'No description provided'
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the table"
          className="w-full px-3 py-2 border border-input rounded-md text-sm"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Columns (one per line)</label>
        <Textarea
          value={columns}
          onChange={(e) => setColumns(e.target.value)}
          placeholder="Enter column names, one per line"
          className="font-mono text-sm"
          rows={10}
        />
        <div className="text-xs text-muted-foreground">
          Current columns: {columns.split('\n').filter(col => col.trim()).length}
        </div>
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default SchemaEditor;
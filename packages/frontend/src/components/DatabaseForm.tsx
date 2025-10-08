import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DatabaseFormData {
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  ssl_enabled: boolean;
}

interface DatabaseFormProps {
  onSubmit: (data: DatabaseFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<DatabaseFormData>;
}

const DatabaseForm: React.FC<DatabaseFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData = {}
}) => {
  const [formData, setFormData] = useState<DatabaseFormData>({
    name: initialData.name || '',
    host: initialData.host || 'localhost',
    port: initialData.port || 3306,
    database_name: initialData.database_name || '',
    username: initialData.username || '',
    password: initialData.password || '',
    ssl_enabled: initialData.ssl_enabled || false
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DatabaseFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof DatabaseFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Database name is required';
    }

    if (!formData.host.trim()) {
      newErrors.host = 'Host is required';
    }

    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (!formData.database_name.trim()) {
      newErrors.database_name = 'Database name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: keyof DatabaseFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'port' ? parseInt(e.target.value) || 0 :
                  field === 'ssl_enabled' ? e.target.checked : 
                  e.target.value;

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Database Configuration</CardTitle>
        <CardDescription>
          Create a new database connection configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Configuration Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Configuration Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              className="w-full p-2 border border-gray-300 rounded-md bg-background"
              placeholder="e.g., Production Database"
              disabled={isLoading}
            />
            {errors.name && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{errors.name}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Host */}
          <div className="space-y-2">
            <label htmlFor="host" className="text-sm font-medium">
              Host *
            </label>
            <input
              id="host"
              type="text"
              value={formData.host}
              onChange={handleInputChange('host')}
              className="w-full p-2 border border-gray-300 rounded-md bg-background"
              placeholder="localhost"
              disabled={isLoading}
            />
            {errors.host && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{errors.host}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Port */}
          <div className="space-y-2">
            <label htmlFor="port" className="text-sm font-medium">
              Port *
            </label>
            <input
              id="port"
              type="number"
              value={formData.port}
              onChange={handleInputChange('port')}
              className="w-full p-2 border border-gray-300 rounded-md bg-background"
              placeholder="3306"
              min="1"
              max="65535"
              disabled={isLoading}
            />
            {errors.port && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{errors.port}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Database Name */}
          <div className="space-y-2">
            <label htmlFor="database_name" className="text-sm font-medium">
              Database Name *
            </label>
            <input
              id="database_name"
              type="text"
              value={formData.database_name}
              onChange={handleInputChange('database_name')}
              className="w-full p-2 border border-gray-300 rounded-md bg-background"
              placeholder="your_database"
              disabled={isLoading}
            />
            {errors.database_name && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{errors.database_name}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username *
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange('username')}
              className="w-full p-2 border border-gray-300 rounded-md bg-background"
              placeholder="servatj"
              disabled={isLoading}
            />
            {errors.username && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{errors.username}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              className="w-full p-2 border border-gray-300 rounded-md bg-background"
              placeholder="your_password"
              disabled={isLoading}
            />
            <div className="text-xs text-muted-foreground">
              Leave blank if no password is required
            </div>
          </div>

          {/* SSL Enabled */}
          <div className="flex items-center space-x-2">
            <input
              id="ssl_enabled"
              type="checkbox"
              checked={formData.ssl_enabled}
              onChange={handleInputChange('ssl_enabled')}
              className="h-4 w-4"
              disabled={isLoading}
            />
            <label htmlFor="ssl_enabled" className="text-sm font-medium">
              Enable SSL/TLS encryption
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Database Configuration'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        {/* Configuration Preview */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Configuration Preview</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div><strong>Name:</strong> {formData.name || 'Not set'}</div>
            <div><strong>Connection:</strong> {formData.host}:{formData.port}</div>
            <div><strong>Database:</strong> {formData.database_name || 'Not set'}</div>
            <div><strong>Username:</strong> {formData.username || 'Not set'}</div>
            <div><strong>SSL:</strong> {formData.ssl_enabled ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseForm;
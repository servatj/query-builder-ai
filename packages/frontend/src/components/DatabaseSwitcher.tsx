import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';

const API_BASE_URL = '';

interface Database {
  id: number;
  name: string;
  host: string;
  port: number;
  database_name: string;
  is_default: boolean;
}

interface DatabaseSwitcherProps {
  onDatabaseChange?: (database: Database) => void;
  disabled?: boolean;
}

function DatabaseSwitcher({ onDatabaseChange, disabled = false }: DatabaseSwitcherProps) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [currentDatabase, setCurrentDatabase] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    setIsInitialLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/databases`);
      const dbList = response.data.data || [];
      setDatabases(dbList);
      
      // Set current database (the default one)
      const defaultDb = dbList.find((db: Database) => db.is_default);
      if (defaultDb) {
        setCurrentDatabase(defaultDb);
      }
    } catch (err) {
      console.error('Failed to load databases:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleSwitchDatabase = async (database: Database) => {
    setIsLoading(true);
    setShowDropdown(false);
    
    try {
      await axios.post(`${API_BASE_URL}/api/settings/databases/${database.id}/switch`);
      setCurrentDatabase(database);
      
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('databaseSwitched', { 
        detail: { databaseName: database.database_name } 
      }));
      
      if (onDatabaseChange) {
        onDatabaseChange(database);
      }
      
      // Reload the page to refresh schema
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to switch database:', err);
      alert(err.response?.data?.error || 'Failed to switch database');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="flex items-center gap-2 min-w-[200px]"
      >
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-sm">Loading...</span>
      </Button>
    );
  }

  if (!currentDatabase && databases.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="flex items-center gap-2 min-w-[200px]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm">No databases</span>
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isLoading || disabled}
        className="flex items-center gap-2 min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <div className="text-left overflow-hidden">
            <div className="text-xs font-semibold truncate">{currentDatabase?.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {currentDatabase?.database_name}
            </div>
          </div>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                Available Databases
              </div>
              {databases.map((db) => (
                <button
                  key={db.id}
                  onClick={() => handleSwitchDatabase(db)}
                  disabled={isLoading || db.id === currentDatabase?.id || disabled}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    db.id === currentDatabase?.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{db.name}</span>
                        {db.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {db.host}:{db.port}/{db.database_name}
                      </div>
                    </div>
                    {db.id === currentDatabase?.id && (
                      <svg className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DatabaseSwitcher;

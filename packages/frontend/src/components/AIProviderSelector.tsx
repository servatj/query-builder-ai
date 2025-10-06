import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_BASE_URL = 'http://localhost:3001';

export type AIProvider = 'openai' | 'anthropic';

interface AIProviderConfig {
  provider: AIProvider;
  openai: {
    enabled: boolean;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  anthropic: {
    enabled: boolean;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  available_models?: {
    openai: string[];
    anthropic: string[];
  };
}

interface AIProviderSelectorProps {
  onProviderChange?: (provider: AIProvider) => void;
}

const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({ onProviderChange }) => {
  const [config, setConfig] = useState<AIProviderConfig | null>(null);
  const [currentProvider, setCurrentProvider] = useState<AIProvider>('anthropic');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/ai/config`);
      setConfig(response.data.data);
      setCurrentProvider(response.data.data.provider);
    } catch (err) {
      console.error('Failed to load AI config:', err);
    }
  };

  const handleProviderChange = async (provider: AIProvider) => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      await axios.post(`${API_BASE_URL}/api/settings/ai/provider`, { provider });
      setCurrentProvider(provider);
      setMessage({ type: 'success', text: `Switched to ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}` });
      
      if (onProviderChange) {
        onProviderChange(provider);
      }
      
      await loadConfig();
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || `Failed to switch to ${provider}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings/ai/test-connection`);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
      } else {
        setMessage({ type: 'error', text: response.data.error });
      }
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Connection test failed' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderStatus = (provider: AIProvider) => {
    if (!config) return 'unknown';
    const providerConfig = config[provider];
    return providerConfig.enabled && providerConfig.apiKey ? 'configured' : 'not-configured';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>
          Choose your AI provider for natural language query generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Anthropic Option */}
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              currentProvider === 'anthropic'
                ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                : 'border-gray-300 hover:border-purple-400'
            }`}
            onClick={() => !isLoading && handleProviderChange('anthropic')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Anthropic Claude
                  {currentProvider === 'anthropic' && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Active</span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Claude 3.5 Sonnet - Latest and most capable model
                </p>
                <div className="mt-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      getProviderStatus('anthropic') === 'configured'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {getProviderStatus('anthropic') === 'configured' ? '✓ Configured' : '⚠ API Key Required'}
                  </span>
                </div>
              </div>
              <div className="ml-2">
                <svg 
                  className={`w-6 h-6 ${currentProvider === 'anthropic' ? 'text-purple-600' : 'text-gray-400'}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {config?.available_models?.anthropic && currentProvider === 'anthropic' && (
              <div className="mt-3 text-xs text-muted-foreground">
                <strong>Current model:</strong> {config.anthropic.model}
              </div>
            )}
          </div>

          {/* OpenAI Option */}
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              currentProvider === 'openai'
                ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                : 'border-gray-300 hover:border-purple-400'
            }`}
            onClick={() => !isLoading && handleProviderChange('openai')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  OpenAI GPT
                  {currentProvider === 'openai' && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Active</span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  GPT-4 & GPT-3.5 - Industry-leading language models
                </p>
                <div className="mt-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      getProviderStatus('openai') === 'configured'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {getProviderStatus('openai') === 'configured' ? '✓ Configured' : '⚠ API Key Required'}
                  </span>
                </div>
              </div>
              <div className="ml-2">
                <svg 
                  className={`w-6 h-6 ${currentProvider === 'openai' ? 'text-purple-600' : 'text-gray-400'}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {config?.available_models?.openai && currentProvider === 'openai' && (
              <div className="mt-3 text-xs text-muted-foreground">
                <strong>Current model:</strong> {config.openai.model}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={isLoading || getProviderStatus(currentProvider) !== 'configured'}
            variant="outline"
            size="sm"
          >
            Test Connection
          </Button>
        </div>

        {config && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <strong>Note:</strong> Configure API keys in the AI Settings section below or in your .env file
            {currentProvider === 'anthropic' && ' (ANTHROPIC_API_KEY)'}
            {currentProvider === 'openai' && ' (OPENAI_API_KEY)'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIProviderSelector;

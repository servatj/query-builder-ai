import openaiService from './openaiService';
import anthropicService from './anthropicService';
import dotenv from 'dotenv';

dotenv.config();

export type AIProvider = 'openai' | 'anthropic';

interface QueryGenerationRequest {
  prompt: string;
  schema: Record<string, { columns: string[]; description: string }>;
}

interface QueryGenerationResponse {
  sql: string;
  confidence: number;
  reasoning: string;
  tables_used: string[];
}

interface AIServiceConfig {
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
}

class UnifiedAIService {
  private currentProvider: AIProvider = 'anthropic'; // Default to Anthropic

  constructor() {
    // Set default provider based on which API key is available
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (anthropicKey && anthropicKey.length > 0) {
      this.currentProvider = 'anthropic';
      console.log('✅ Using Anthropic as default AI provider');
    } else if (openaiKey && openaiKey.length > 0) {
      this.currentProvider = 'openai';
      console.log('✅ Using OpenAI as default AI provider');
    }
  }

  public setProvider(provider: AIProvider): void {
    this.currentProvider = provider;
    console.log(`🔄 Switched AI provider to: ${provider}`);
  }

  public getProvider(): AIProvider {
    return this.currentProvider;
  }

  public get enabled(): boolean {
    if (this.currentProvider === 'anthropic') {
      return anthropicService.enabled;
    } else {
      return openaiService.enabled;
    }
  }

  public async generateQuery(request: QueryGenerationRequest): Promise<QueryGenerationResponse | null> {
    if (this.currentProvider === 'anthropic') {
      return anthropicService.generateQuery(request);
    } else {
      return openaiService.generateQuery(request);
    }
  }

  public updateConfig(config: AIServiceConfig): void {
    this.currentProvider = config.provider;
    
    if (config.openai) {
      openaiService.updateConfig(config.openai);
    }
    
    if (config.anthropic) {
      anthropicService.updateConfig(config.anthropic);
    }
  }

  public getConfig(): AIServiceConfig {
    return {
      provider: this.currentProvider,
      openai: openaiService.getConfig(),
      anthropic: anthropicService.getConfig()
    };
  }

  public async testConnection(): Promise<boolean> {
    if (this.currentProvider === 'anthropic') {
      return anthropicService.testConnection();
    } else {
      return openaiService.testConnection();
    }
  }

  public getAvailableModels(provider: AIProvider): string[] {
    if (provider === 'anthropic') {
      return [
        'claude-sonnet-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ];
    } else {
      return [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-4o',
        'gpt-4o-mini'
      ];
    }
  }
}

// Export a singleton instance
export const aiService = new UnifiedAIService();
export default aiService;
export type { AIServiceConfig };

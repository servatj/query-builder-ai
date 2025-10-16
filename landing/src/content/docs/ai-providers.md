# AI Provider Integration - Anthropic & OpenAI

This update adds support for multiple AI providers with Anthropic Claude as the default option, alongside the existing OpenAI integration.

## Features

### Multi-Provider Support
- **Anthropic Claude** (Default): Claude Sonnet 4.0 and other Claude models
- **OpenAI GPT**: GPT-4, GPT-3.5 Turbo, and other OpenAI models
- Easy switching between providers through the UI
- Independent configuration for each provider

### Available Models

#### Anthropic
- `claude-sonnet-4-20250514` (Default - Latest and most capable - Claude 4.0)
- `claude-3-5-sonnet-20241022` (Claude 3.5 Sonnet)
- `claude-3-5-haiku-20241022` (Claude 3.5 Haiku)
- `claude-3-opus-20240229` (Claude 3 Opus)
- `claude-3-sonnet-20240229` (Claude 3 Sonnet)
- `claude-3-haiku-20240307` (Claude 3 Haiku)

#### OpenAI
- `gpt-4-turbo-preview`
- `gpt-4`
- `gpt-3.5-turbo`
- `gpt-4o`
- `gpt-4o-mini`

## Configuration

### Environment Variables

Add to your `.env` file in `packages/backend/`:

```bash
# Anthropic API Key (Default Provider)
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here

# OpenAI API Key (Alternative Provider)
OPENAI_API_KEY=sk-your_openai_api_key_here
```

### Getting API Keys

**Anthropic:**
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

**OpenAI:**
1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Create a new API key

### UI Configuration

1. Navigate to **Settings** → **AI Settings**
2. Select your preferred provider (Anthropic or OpenAI)
3. Configure API keys and model settings
4. Test the connection
5. Start generating queries!

## API Endpoints

### New Endpoints

```typescript
// Get current AI configuration
GET /api/settings/ai/config

// Switch AI provider
POST /api/settings/ai/provider
Body: { provider: "anthropic" | "openai" }

// Update AI configuration
PUT /api/settings/ai/config
Body: AIServiceConfig

// Test AI connection
POST /api/settings/ai/test-connection
```

## Architecture

### Backend Services

- **`aiService.ts`**: Unified service that manages both providers
- **`anthropicService.ts`**: Anthropic-specific implementation
- **`openaiService.ts`**: OpenAI-specific implementation (existing)

### Frontend Components

- **`AIProviderSelector.tsx`**: New component for switching providers
- **`Settings.tsx`**: Updated to include provider selector

### Provider Selection Logic

1. Default provider is set to Anthropic if API key is present
2. Falls back to OpenAI if only OpenAI key is present
3. Can be switched dynamically through the UI
4. Configuration persists across sessions

## Usage Example

```typescript
// The AI service automatically uses the selected provider
const result = await aiService.generateQuery({
  prompt: "Show me all users from California",
  schema: databaseSchema
});

// Returns:
{
  sql: "SELECT * FROM users WHERE state = 'California'",
  confidence: 0.95,
  reasoning: "Simple filter query on users table",
  tables_used: ["users"]
}
```

## Benefits

### Why Anthropic Claude?

- **Latest Technology**: Claude Sonnet 4.0 is the most recent model (May 2025)
- **Strong SQL Generation**: Excellent at understanding database schemas
- **Safety**: Built-in safety features for query generation
- **Cost Effective**: Competitive pricing

### Why Multiple Providers?

- **Flexibility**: Choose the model that works best for your use case
- **Redundancy**: Fallback if one provider has issues
- **Cost Optimization**: Use different models for different query complexities
- **Feature Comparison**: Test and compare results

## Migration Notes

### Existing OpenAI Users

- Your existing OpenAI configuration will continue to work
- No breaking changes to existing functionality
- Simply add ANTHROPIC_API_KEY to enable Anthropic
- Switch between providers in Settings

### Default Behavior

- New installations default to Anthropic if API key is present
- Existing installations maintain current OpenAI configuration
- Provider can be changed at any time without data loss

## Troubleshooting

### "AI provider not configured"
- Ensure you've added the API key to `.env` file
- Restart the backend server after adding env variables
- Test connection in Settings → AI Settings

### "Connection failed"
- Verify API key is correct
- Check internet connection
- Ensure API key has sufficient quota
- Check API provider status page

### Provider Switch Not Working
- Restart backend server
- Clear browser cache
- Check backend logs for errors

## Development

### Adding New Providers

To add a new AI provider:

1. Create a new service file (e.g., `googleService.ts`)
2. Implement the standard interface
3. Add to `aiService.ts` provider list
4. Update UI components
5. Add to environment configuration

## License

Same as main project

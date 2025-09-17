import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockCreate = vi.fn();
const mockCompletions = { create: mockCreate };
const mockChat = { completions: mockCompletions } as any;

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({ chat: mockChat }))
  };
});

const importService = async () => {
  vi.resetModules();
  vi.doMock('openai', () => ({ default: vi.fn().mockImplementation(() => ({ chat: mockChat })) }));
  const mod = await import('../../../src/services/openaiService');
  return mod.openaiService as any;
};

describe('openaiService', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('initializes when api key present and returns null when disabled', async () => {
    const svc = await importService();
    expect(svc.enabled).toBe(true);
    // disable via updateConfig
    svc.updateConfig({ enabled: false, apiKey: '', model: 'm', temperature: 0.1, maxTokens: 100 });
    expect(svc.enabled).toBe(false);
  });

  it('generateQuery returns parsed response on success', async () => {
    const svc = await importService();
    const payload = { sql: 'SELECT 1', confidence: 0.9, reasoning: 'ok', tables_used: ['t'] };
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(payload) } }] });
    const res = await svc.generateQuery({ prompt: 'get 1', schema: { users: { columns: ['id'], description: '...' } } });
    expect(res).toEqual(payload);
    expect(mockCreate).toHaveBeenCalled();
  });

  it('generateQuery clamps invalid confidence and handles invalid format', async () => {
    const svc = await importService();
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ sql: 'x', confidence: 5 }) } }] });
    const res = await svc.generateQuery({ prompt: 'q', schema: {} });
    expect(res?.confidence).toBe(1);

    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: '' } }] });
    const res2 = await svc.generateQuery({ prompt: 'q', schema: {} });
    expect(res2).toBeNull();
  });

  it('generateQuery returns null when disabled or on error', async () => {
    // no API key
    process.env.OPENAI_API_KEY = '';
    const svc = await importService();
    expect(svc.enabled).toBe(false);
    const res = await svc.generateQuery({ prompt: 'q', schema: {} });
    expect(res).toBeNull();

    // enabled but API error
    process.env.OPENAI_API_KEY = 'k';
    const svc2 = await importService();
    mockCreate.mockRejectedValueOnce(new Error('api error'));
    const res2 = await svc2.generateQuery({ prompt: 'q', schema: {} });
    expect(res2).toBeNull();
  });

  it('testConnection true/false based on API', async () => {
    const svc = await importService();
    mockCreate.mockResolvedValueOnce({});
    await expect(svc.testConnection()).resolves.toBe(true);
    mockCreate.mockRejectedValueOnce(new Error('x'));
    await expect(svc.testConnection()).resolves.toBe(false);
  });
});

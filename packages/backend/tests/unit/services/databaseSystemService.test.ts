import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConn = () => ({
  execute: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  ping: vi.fn(),
  release: vi.fn()
});

const mockGetConnection = vi.fn();
const mockPool = {
  getConnection: mockGetConnection,
  end: vi.fn()
} as any;
const mockCreatePool = vi.fn(() => mockPool);

vi.mock('mysql2/promise', () => ({
  default: { createPool: mockCreatePool },
  createPool: mockCreatePool
}));

const importService = async () => {
  vi.resetModules();
  vi.doMock('mysql2/promise', () => ({
    default: { createPool: mockCreatePool },
    createPool: mockCreatePool
  }));
  const mod = await import('../../../src/services/databaseSystemService');
  return mod.databaseService as any;
};

describe('databaseSystemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePool.mockReturnValue(mockPool);
  });

  it('gets active database configs', async () => {
    const c = mockConn();
    c.execute.mockResolvedValueOnce([[{ id: 1, name: 'db1', is_default: 1 }]]);
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    const rows = await svc.getDatabaseConfigs();
    expect(rows).toEqual([{ id: 1, name: 'db1', is_default: 1 }]);
    expect(c.release).toHaveBeenCalled();
  });

  it('gets default database config or null', async () => {
    const c = mockConn();
    c.execute
      .mockResolvedValueOnce([[{ id: 2, name: 'default', is_default: 1 }]])
      .mockResolvedValueOnce([[]]);
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    const def = await svc.getDefaultDatabaseConfig();
    expect(def).toEqual({ id: 2, name: 'default', is_default: 1 });
    const def2 = await svc.getDefaultDatabaseConfig();
    expect(def2).toBeNull();
  });

  it('saves database config and returns insertId; handles default flag', async () => {
    const c = mockConn();
    c.beginTransaction.mockResolvedValue(undefined as any);
    c.execute
      .mockResolvedValueOnce([{}]) // UPDATE to clear default
      .mockResolvedValueOnce([{ insertId: 42 }]);
    c.commit.mockResolvedValue(undefined as any);
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    const id = await svc.upsertDatabaseConfig({
      name: 'db', host: 'h', port: 3306, database_name: 'd', username: 'u', password: 'p', ssl_enabled: false, is_active: true, is_default: true
    });
    expect(id).toBe(42);
    expect(c.beginTransaction).toHaveBeenCalled();
    expect(c.commit).toHaveBeenCalled();
    expect(c.release).toHaveBeenCalled();
  });

  it('rolls back on saveDatabaseConfig error', async () => {
    const c = mockConn();
  c.beginTransaction.mockResolvedValue(undefined as any);
    c.execute.mockRejectedValue(new Error('fail'));
  c.rollback.mockResolvedValue(undefined as any);
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    await expect(svc.upsertDatabaseConfig({
      name: 'db', host: 'h', port: 3306, database_name: 'd', username: 'u', password: 'p', ssl_enabled: false, is_active: true, is_default: false
    })).rejects.toThrow('fail');
    expect(c.rollback).toHaveBeenCalled();
    expect(c.release).toHaveBeenCalled();
  });

  it('gets AI settings and default AI setting', async () => {
    const c = mockConn();
    c.execute
      .mockResolvedValueOnce([[{ id: 1, name: 'ai1' }]])
      .mockResolvedValueOnce([[{ id: 1, name: 'ai1', is_default: 1 }]])
      .mockResolvedValueOnce([[]]);
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    const rows = await svc.getAISettings();
    expect(rows).toEqual([{ id: 1, name: 'ai1' }]);
    const def = await svc.getDefaultAISettings();
    expect(def).toEqual({ id: 1, name: 'ai1', is_default: 1 });
    const none = await svc.getDefaultAISettings();
    expect(none).toBeNull();
  });

  it('saves AI settings with default toggle', async () => {
    const c = mockConn();
  c.beginTransaction.mockResolvedValue(undefined as any);
    c.execute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ insertId: 77 }]);
  c.commit.mockResolvedValue(undefined as any);
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    const id = await svc.saveAISettings({
      name: 'ai', enabled: true, apiKey: 'k', model: 'm', temperature: 0.3, maxTokens: 1000, is_active: true, is_default: true
    });
    expect(id).toBe(77);
  });

  it('sets, gets, and lists app settings', async () => {
    const c = mockConn();
    c.execute
      // setAppSetting
      .mockResolvedValueOnce([{}])
      // getAppSetting returns value
      .mockResolvedValueOnce([[{ setting_value: 'on' }]])
      // getAllAppSettings returns multiple
      .mockResolvedValueOnce([[{ setting_key: 'a', setting_value: '1' }]]);
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    await svc.setAppSetting('enable_query_logging', 'true', 'boolean');
    const val = await svc.getAppSetting('enable_query_logging');
    expect(val).toBe('on');
    const all = await svc.getAllAppSettings();
    expect(all).toEqual([{ setting_key: 'a', setting_value: '1' }]);
  });

  it('logQuery is a no-op when disabled', async () => {
    const c = mockConn();
    // getAppSetting -> disabled
    c.execute.mockResolvedValueOnce([[{ setting_value: 'false' }]]);
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    await svc.logQuery({ natural_language_query: 'x', execution_status: 'success' });
    // no insert executed after the first get
    expect(c.execute).toHaveBeenCalledTimes(1);
  });

  it('logQuery inserts when enabled and swallows errors', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = mockConn();
    // get setting -> enabled
    c.execute
      .mockResolvedValueOnce([[{ setting_value: 'true' }]])
      .mockRejectedValueOnce(new Error('insert failed'));
    mockGetConnection.mockResolvedValue(c);
    const svc = await importService();
    await svc.logQuery({ natural_language_query: 'x', execution_status: 'success' });
    expect(c.release).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to log query:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('testConnection true/false', async () => {
    const c = mockConn();
    c.ping.mockResolvedValue(undefined);
    mockGetConnection.mockResolvedValueOnce(c);
    const svc = await importService();
    expect(await svc.testConnection()).toBe(true);

    mockGetConnection.mockRejectedValueOnce(new Error('no'));
    expect(await svc.testConnection()).toBe(false);
  });
});

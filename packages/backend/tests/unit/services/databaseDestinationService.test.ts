import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prepare mysql2/promise mock factory so service picks it up on import
const mockGetConnection = vi.fn();
const mockPool = {
  getConnection: mockGetConnection,
  end: vi.fn()
} as any;

const mockCreatePool = vi.fn(() => mockPool);

vi.mock('../../../src/services/databaseDestinationService', async (importOriginal) => {
  // We still want to import the real module after mocking mysql2
  const real = await (importOriginal() as any);
  return real;
});

vi.mock('mysql2/promise', () => ({
  default: { createPool: mockCreatePool },
  createPool: mockCreatePool
}));

const freshService = async () => {
  vi.resetModules();
  // reapply mocks after reset
  vi.doMock('mysql2/promise', () => ({
    default: { createPool: mockCreatePool },
    createPool: mockCreatePool
  }));
  const mod = await import('../../../src/services/databaseDestinationService');
  return mod.databaseService as typeof import('../../../src/services/databaseDestinationService').default;
};

const makeConn = (opts?: { pingError?: any; executeResult?: any; executeError?: any }) => ({
  ping: vi.fn().mockImplementation(() => {
    if (opts?.pingError) throw opts.pingError;
    return Promise.resolve();
  }),
  execute: vi.fn().mockImplementation(async () => {
    if (opts?.executeError) throw opts.executeError;
    return [opts?.executeResult ?? [{ id: 1 }]];
  }),
  release: vi.fn()
});

describe('databaseDestinationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePool.mockReturnValue(mockPool);
  });

  it('initializes a pool and tests connection successfully', async () => {
    const conn = makeConn();
    mockGetConnection.mockResolvedValue(conn);
    const service = await freshService();

    const ok = await (service as any).testDestinationConnection();
    expect(ok).toBe(true);
    expect(conn.ping).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });

  it('returns false if connection test fails', async () => {
    mockGetConnection.mockRejectedValue(new Error('no pool'));
    const service = await freshService();

    const ok = await (service as any).testDestinationConnection();
    expect(ok).toBe(false);
  });

  it('executes a safe SELECT query and returns rows', async () => {
    const conn = makeConn({ executeResult: [{ a: 1 }, { a: 2 }] });
    mockGetConnection.mockResolvedValue(conn);
    const service = await freshService();

    const rows = await (service as any).runQuery('SELECT * FROM users');
    expect(rows).toEqual([{ a: 1 }, { a: 2 }]);
    expect(conn.execute).toHaveBeenCalledWith('SELECT * FROM users');
    expect(conn.release).toHaveBeenCalled();
  });

  it('rejects non-SELECT queries', async () => {
    const conn = makeConn();
    mockGetConnection.mockResolvedValue(conn);
    const service = await freshService();

    await expect((service as any).runQuery('DELETE FROM users')).rejects.toThrow('Only SELECT queries are allowed');
    expect(conn.execute).not.toHaveBeenCalled();
  });

  it('rejects multiple SQL statements', async () => {
    const conn = makeConn();
    mockGetConnection.mockResolvedValue(conn);
    const service = await freshService();

    await expect((service as any).runQuery('SELECT 1; SELECT 2')).rejects.toThrow('Multiple statements are not allowed');
  });

  it('blocks forbidden patterns like DROP/UNION/SLEEP', async () => {
    const conn = makeConn();
    mockGetConnection.mockResolvedValue(conn);
    const service = await freshService();

    await expect((service as any).runQuery('SELECT SLEEP(1)')).rejects.toThrow('Query contains disallowed operations');
    await expect((service as any).runQuery('SELECT * FROM users UNION ALL SELECT password FROM users')).rejects.toThrow();
    await expect((service as any).runQuery('SELECT * FROM information_schema.tables')).rejects.toThrow();
  });

  it('returns error when pool closed', async () => {
    const conn = makeConn();
    mockGetConnection.mockResolvedValueOnce(conn);
    const service = await freshService();

    await (service as any).close();
    await expect((service as any).runQuery('SELECT 1')).rejects.toThrow('Database pool not initialized');
  });
});

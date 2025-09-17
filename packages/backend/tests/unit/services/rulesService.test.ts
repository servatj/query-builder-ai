import { describe, it, expect, vi, beforeEach } from 'vitest';

const memfs: Record<string, string> = {};

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn((p: string) => {
      const key = String(p);
      if (!(key in memfs)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return Promise.resolve(memfs[key]);
    }),
    writeFile: vi.fn((p: string, data: string) => {
      memfs[String(p)] = data;
      return Promise.resolve();
    })
  },
  readFile: vi.fn((p: string) => {
    const key = String(p);
    if (!(key in memfs)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    return Promise.resolve(memfs[key]);
  }),
  writeFile: vi.fn((p: string, data: string) => {
    memfs[String(p)] = data;
    return Promise.resolve();
  })
}));

const importSvc = async () => {
  vi.resetModules();
  vi.doMock('fs/promises', () => ({
    default: {
      readFile: vi.fn((p: string) => {
        const key = String(p);
        if (!(key in memfs)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        return Promise.resolve(memfs[key]);
      }),
      writeFile: vi.fn((p: string, data: string) => {
        memfs[String(p)] = data;
        return Promise.resolve();
      })
    },
    readFile: vi.fn((p: string) => {
      const key = String(p);
      if (!(key in memfs)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return Promise.resolve(memfs[key]);
    }),
    writeFile: vi.fn((p: string, data: string) => {
      memfs[String(p)] = data;
      return Promise.resolve();
    })
  }));
  const svc = await import('../../../src/services/rulesService');
  return svc;
};

const sampleRules = {
  schema: { users: { columns: ['id', 'name'], description: 'users table' } },
  query_patterns: [{ intent: 'list', template: 'SELECT * FROM users', description: 'list users', keywords: ['list'] }]
};

describe('rulesService', () => {
  beforeEach(() => {
    for (const k of Object.keys(memfs)) delete memfs[k];
  });

  it('loads rules from file and caches them', async () => {
    const svc = await importSvc();
    // Put file into memfs under computed path. We don't know exact path so intercept write then read.
    // First call loadRulesFromFile should trigger fs.readFile and cache
    // We'll monkey patch path join by spying, but easier: call once to get path via error then adjust
    // Simulate rules file content by populating any path read with JSON
    // Since our mocked readFile looks into memfs by string path, we can set a generic key that will be requested.
    // However path is dynamic; instead, we wrap fs.readFile mock to always return our JSON.
  const fsmod: any = await import('fs/promises');
  fsmod.default.readFile.mockResolvedValueOnce(JSON.stringify(sampleRules));
    const rules = await svc.loadRulesFromFile();
    expect(rules.schema.users.columns).toContain('id');

    // Second call should return cached without hitting fs again
  const spy2 = vi.spyOn((await import('fs/promises') as any).default, 'readFile');
    const rules2 = await svc.loadRulesFromFile();
    expect(spy2).not.toHaveBeenCalled();
    expect(rules2).toEqual(rules);
  });

  it('getCachedRules returns cached if present otherwise loads', async () => {
    const svc = await importSvc();
    // First without cache -> should read
  const fsmod: any = await import('fs/promises');
  fsmod.default.readFile.mockResolvedValueOnce(JSON.stringify(sampleRules));
    const rules1 = await svc.getCachedRules();
    expect(rules1.query_patterns.length).toBe(1);
    // Set cache to null -> forces load again
    svc.setCachedRules(null);
  fsmod.default.readFile.mockResolvedValueOnce(JSON.stringify(sampleRules));
    const rules2 = await svc.getCachedRules();
    expect(rules2.schema.users.description).toBe('users table');
  });

  it('saves rules to file and updates cache', async () => {
    const svc = await importSvc();
  const fsmod: any = await import('fs/promises');
    await svc.saveRulesToFile(sampleRules as any);
  expect(fsmod.default.writeFile).toHaveBeenCalled();
    const cached = await svc.getCachedRules();
    expect(cached).toEqual(sampleRules);
  });
});

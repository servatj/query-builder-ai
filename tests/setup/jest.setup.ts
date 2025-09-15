// Global test setup for the monorepo (backend + frontend)
// Compatible with both Jest and Vitest

// Increase default timeout for Jest (Vitest timeout is set via vitest.config.ts)
if (typeof (globalThis as any).jest !== 'undefined') {
  ;(globalThis as any).jest.setTimeout(15000)
}

// Silence noisy logs during tests; keep errors
const origInfo = console.info;
const origWarn = console.warn;
const origDebug = console.debug;

beforeAll(() => {
  console.info = (...args: any[]) => {
    if (process.env.DEBUG_TESTS) origInfo(...args);
  };
  console.warn = (...args: any[]) => {
    if (process.env.DEBUG_TESTS) origWarn(...args);
  };
  console.debug = (...args: any[]) => {
    if (process.env.DEBUG_TESTS) origDebug(...args);
  };
});

afterAll(() => {
  console.info = origInfo;
  console.warn = origWarn;
  console.debug = origDebug;
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import winston from 'winston';

// Mock winston before importing logger
vi.mock('winston', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  };

  const mockTransports = {
    File: vi.fn(),
    Console: vi.fn()
  };

  const mockFormat = {
    combine: vi.fn((...args) => args),
    timestamp: vi.fn(),
    errors: vi.fn(),
    json: vi.fn(),
    colorize: vi.fn(),
    simple: vi.fn()
  };

  return {
    default: {
      createLogger: vi.fn(() => mockLogger),
      transports: mockTransports,
      format: mockFormat
    },
    createLogger: vi.fn(() => mockLogger),
    transports: mockTransports,
    format: mockFormat
  };
});

describe('logger', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    vi.resetModules();
  });

  it('creates logger with production configuration when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    
    // Re-import logger to get fresh instance with new env
    await import('../../../src/utils/logger');

    expect(winston.createLogger).toHaveBeenCalledWith({
      level: 'info',
      format: expect.any(Array),
      transports: expect.any(Array)
    });
  });

  it('creates logger with debug level when NODE_ENV is not production', async () => {
    process.env.NODE_ENV = 'development';
    
    await import('../../../src/utils/logger');

    expect(winston.createLogger).toHaveBeenCalledWith({
      level: 'debug',
      format: expect.any(Array),
      transports: expect.any(Array)
    });
  });

  it('creates logger with debug level when NODE_ENV is undefined', async () => {
    delete process.env.NODE_ENV;
    
    await import('../../../src/utils/logger');

    expect(winston.createLogger).toHaveBeenCalledWith({
      level: 'debug',
      format: expect.any(Array),
      transports: expect.any(Array)
    });
  });

  it('configures file transports correctly', async () => {
    await import('../../../src/utils/logger');

    expect(winston.transports.File).toHaveBeenCalledWith({
      filename: 'error.log',
      level: 'error'
    });

    expect(winston.transports.File).toHaveBeenCalledWith({
      filename: 'combined.log'
    });
  });

  it('configures console transport with formatting', async () => {
    await import('../../../src/utils/logger');

    expect(winston.transports.Console).toHaveBeenCalledWith({
      format: expect.any(Array)
    });
  });

  it('uses correct format combinations', async () => {
    await import('../../../src/utils/logger');

    expect(winston.format.combine).toHaveBeenCalledWith(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    expect(winston.format.combine).toHaveBeenCalledWith(
      winston.format.colorize(),
      winston.format.simple()
    );
  });

  it('configures error format with stack traces', async () => {
    await import('../../../src/utils/logger');

    expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
  });

  it('exports the logger instance as default', async () => {
    const loggerModule = await import('../../../src/utils/logger');
    
    expect(loggerModule.default).toBeDefined();
    expect(winston.createLogger).toHaveBeenCalled();
  });
});
import { beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Global test setup
beforeAll(async () => {
  console.log('🚀 Starting E2E test suite...');
  
  // Check if backend is accessible
  const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  console.log(`📡 Testing backend at: ${apiUrl}`);
  
  // Verify database connectivity
  console.log('🗄️  Verifying database connections...');
  
  // You can add any global setup here
  // For example: seeding test data, clearing caches, etc.
});

afterAll(async () => {
  console.log('✅ E2E test suite completed');
  
  // Cleanup if needed
});

// Helper to check if port is in use
export async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} || true`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

// Helper to wait for service
export async function waitForService(
  url: string,
  maxAttempts = 30,
  interval = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Service not ready yet
    }
    
    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  return false;
}

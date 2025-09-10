/**
 * Efficient Test Data Setup and Teardown
 * 
 * Provides optimized utilities for fast test data creation and cleanup.
 */

import { testPerformanceMonitor } from './test-performance-monitor';

interface TestDataPool<T> {
  available: T[];
  inUse: Set<T>;
  factory: () => T;
  cleanup: (item: T) => void | Promise<void>;
}

interface DatabaseTransaction {
  id: string;
  rollback: () => Promise<void>;
  commit: () => Promise<void>;
}

/**
 * Efficient test data manager with object pooling
 */
class EfficientTestDataManager {
  private pools = new Map<string, TestDataPool<any>>();
  private transactions = new Map<string, DatabaseTransaction>();
  private cleanupTasks: (() => Promise<void>)[] = [];

  /**
   * Create a data pool for reusable test objects
   */
  createPool<T>(
    poolName: string,
    factory: () => T,
    cleanup: (item: T) => void | Promise<void>,
    initialSize: number = 5
  ): void {
    const pool: TestDataPool<T> = {
      available: [],
      inUse: new Set(),
      factory,
      cleanup,
    };

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      pool.available.push(factory());
    }

    this.pools.set(poolName, pool);
  }

  /**
   * Get an item from the pool (reuse if available, create if needed)
   */
  getFromPool<T>(poolName: string): T {
    const pool = this.pools.get(poolName) as TestDataPool<T>;
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    let item: T;
    if (pool.available.length > 0) {
      item = pool.available.pop()!;
    } else {
      item = pool.factory();
    }

    pool.inUse.add(item);
    return item;
  }

  /**
   * Return an item to the pool for reuse
   */
  async returnToPool<T>(poolName: string, item: T): Promise<void> {
    const pool = this.pools.get(poolName) as TestDataPool<T>;
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    if (pool.inUse.has(item)) {
      pool.inUse.delete(item);
      await pool.cleanup(item);
      pool.available.push(item);
    }
  }

  /**
   * Create a database transaction for test isolation
   */
  async createTransaction(testName: string): Promise<string> {
    const transactionId = `tx_${testName}_${Date.now()}`;
    
    // Mock transaction for now - in real implementation would use actual DB
    const transaction: DatabaseTransaction = {
      id: transactionId,
      rollback: async () => {
        console.log(`🔄 Rolling back transaction: ${transactionId}`);
      },
      commit: async () => {
        console.log(`✅ Committing transaction: ${transactionId}`);
      },
    };

    this.transactions.set(transactionId, transaction);
    return transactionId;
  }

  /**
   * Rollback a transaction (for test cleanup)
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      await transaction.rollback();
      this.transactions.delete(transactionId);
    }
  }

  /**
   * Add a cleanup task to be executed during teardown
   */
  addCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Execute all cleanup tasks
   */
  async executeCleanup(): Promise<void> {
    const startTime = performance.now();
    
    // Execute cleanup tasks in parallel for speed
    await Promise.all(this.cleanupTasks.map(task => task()));
    
    // Rollback any remaining transactions
    await Promise.all(
      Array.from(this.transactions.keys()).map(id => this.rollbackTransaction(id))
    );

    // Clear cleanup tasks
    this.cleanupTasks = [];
    
    const duration = performance.now() - startTime;
    console.log(`🧹 Cleanup completed in ${duration.toFixed(2)}ms`);
  }

  /**
   * Reset all pools and cleanup
   */
  async reset(): Promise<void> {
    await this.executeCleanup();
    
    // Clear all pools
    for (const [poolName, pool] of this.pools) {
      // Cleanup all items in use
      for (const item of pool.inUse) {
        await pool.cleanup(item);
      }
      // Cleanup all available items
      for (const item of pool.available) {
        await pool.cleanup(item);
      }
    }
    
    this.pools.clear();
    this.transactions.clear();
  }
}

// Global instance
export const efficientTestData = new EfficientTestDataManager();

/**
 * Fast test user factory with pooling
 */
export function createUserPool() {
  efficientTestData.createPool(
    'users',
    () => ({
      id: Math.floor(Math.random() * 1000000),
      email: `test${Date.now()}@example.com`,
      username: `user${Date.now()}`,
      hashedPassword: 'hashed_password',
      createdAt: new Date(),
    }),
    async (user) => {
      // Reset user state for reuse
      user.email = `test${Date.now()}@example.com`;
      user.username = `user${Date.now()}`;
    },
    3 // Keep 3 users in pool
  );
}

/**
 * Fast plant data factory with pooling
 */
export function createPlantPool() {
  efficientTestData.createPool(
    'plants',
    () => ({
      id: Math.floor(Math.random() * 1000000),
      commonName: 'Test Plant',
      scientificName: 'Testicus planticus',
      family: 'Testaceae',
      userId: 1,
    }),
    async (plant) => {
      // Reset plant state for reuse
      plant.commonName = 'Test Plant';
      plant.scientificName = 'Testicus planticus';
    },
    5 // Keep 5 plants in pool
  );
}

/**
 * Fast plant instance factory with pooling
 */
export function createPlantInstancePool() {
  efficientTestData.createPool(
    'plantInstances',
    () => ({
      id: Math.floor(Math.random() * 1000000),
      plantId: 1,
      nickname: 'Test Instance',
      location: 'Test Location',
      userId: 1,
      careHistory: [],
    }),
    async (instance) => {
      // Reset instance state for reuse
      instance.nickname = 'Test Instance';
      instance.location = 'Test Location';
      instance.careHistory = [];
    },
    5 // Keep 5 instances in pool
  );
}

/**
 * Setup efficient test data for a test suite
 */
export function setupEfficientTestData() {
  beforeAll(async () => {
    createUserPool();
    createPlantPool();
    createPlantInstancePool();
  });

  afterAll(async () => {
    await efficientTestData.reset();
  });
}

/**
 * Setup transaction-based test isolation
 */
export function setupTransactionIsolation() {
  let transactionId: string;

  beforeEach(async () => {
    const testName = expect.getState().currentTestName || 'unknown';
    transactionId = await efficientTestData.createTransaction(testName);
  });

  afterEach(async () => {
    if (transactionId) {
      await efficientTestData.rollbackTransaction(transactionId);
    }
  });
}

/**
 * Batch operations for better performance
 */
export class BatchOperations {
  private operations: (() => Promise<any>)[] = [];
  private batchSize: number;

  constructor(batchSize: number = 10) {
    this.batchSize = batchSize;
  }

  /**
   * Add an operation to the batch
   */
  add(operation: () => Promise<any>): void {
    this.operations.push(operation);
  }

  /**
   * Execute all operations in batches
   */
  async execute(): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < this.operations.length; i += this.batchSize) {
      const batch = this.operations.slice(i, i + this.batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Clear all operations
   */
  clear(): void {
    this.operations = [];
  }
}

/**
 * Memory-efficient test data generator
 */
export function* generateTestData<T>(
  factory: () => T,
  count: number
): Generator<T, void, unknown> {
  for (let i = 0; i < count; i++) {
    yield factory();
  }
}

/**
 * Lazy loading test data helper
 */
export class LazyTestData<T> {
  private data: T | null = null;
  private factory: () => T | Promise<T>;

  constructor(factory: () => T | Promise<T>) {
    this.factory = factory;
  }

  async get(): Promise<T> {
    if (this.data === null) {
      this.data = await this.factory();
    }
    return this.data;
  }

  reset(): void {
    this.data = null;
  }
}
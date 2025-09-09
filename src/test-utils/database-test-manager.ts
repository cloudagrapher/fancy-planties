/**
 * Database Test Manager - Provides robust database mocking without live PostgreSQL
 * Implements Requirements 8.1, 8.2, 8.3, 4.3, 4.4
 */

import { jest } from '@jest/globals';
import type { 
  User, Plant, PlantInstance, Propagation, CareHistory, CareGuide,
  NewUser, NewPlant, NewPlantInstance, NewPropagation, NewCareHistory, NewCareGuide
} from '@/lib/db/schema';

export interface DatabaseMockConfig {
  useInMemory: boolean;
  mockQueries: boolean;
  seedData?: TestDataSeed;
  enableTransactions?: boolean;
}

export interface TestDataSeed {
  users: TestUser[];
  plants: TestPlant[];
  plantInstances: TestPlantInstance[];
  propagations: TestPropagation[];
  careHistory: TestCareHistory[];
  careGuides?: TestCareGuide[];
}

export interface TestUser extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestPlant extends Omit<Plant, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestPlantInstance extends Omit<PlantInstance, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestPropagation extends Omit<Propagation, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestCareHistory extends Omit<CareHistory, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestCareGuide extends Omit<CareGuide, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * In-memory database implementation for tests
 */
class InMemoryDatabase {
  private data: Map<string, any[]> = new Map();
  private nextId: Map<string, number> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.data.clear();
    this.nextId.clear();
    
    // Initialize tables
    const tables = ['users', 'plants', 'plantInstances', 'propagations', 'careHistory', 'careGuides', 'sessions'];
    tables.forEach(table => {
      this.data.set(table, []);
      this.nextId.set(table, 1);
    });
  }

  insert(table: string, data: any): any {
    const records = this.data.get(table) || [];
    const id = this.nextId.get(table) || 1;
    
    const record = {
      ...data,
      id,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    };
    
    records.push(record);
    this.data.set(table, records);
    this.nextId.set(table, id + 1);
    
    return record;
  }

  select(table: string, where?: (record: any) => boolean): any[] {
    const records = this.data.get(table) || [];
    return where ? records.filter(where) : [...records];
  }

  update(table: string, where: (record: any) => boolean, updates: any): any[] {
    const records = this.data.get(table) || [];
    const updatedRecords: any[] = [];
    
    records.forEach(record => {
      if (where(record)) {
        const updated = {
          ...record,
          ...updates,
          updatedAt: new Date(),
        };
        updatedRecords.push(updated);
        Object.assign(record, updated);
      }
    });
    
    return updatedRecords;
  }

  delete(table: string, where: (record: any) => boolean): any[] {
    const records = this.data.get(table) || [];
    const deleted: any[] = [];
    
    for (let i = records.length - 1; i >= 0; i--) {
      if (where(records[i])) {
        deleted.push(records.splice(i, 1)[0]);
      }
    }
    
    return deleted.reverse();
  }

  count(table: string, where?: (record: any) => boolean): number {
    const records = this.data.get(table) || [];
    return where ? records.filter(where).length : records.length;
  }

  seedData(seed: TestDataSeed) {
    // Clear existing data
    this.reset();
    
    // Insert seed data
    seed.users?.forEach(user => this.insert('users', user));
    seed.plants?.forEach(plant => this.insert('plants', plant));
    seed.plantInstances?.forEach(instance => this.insert('plantInstances', instance));
    seed.propagations?.forEach(propagation => this.insert('propagations', propagation));
    seed.careHistory?.forEach(care => this.insert('careHistory', care));
    seed.careGuides?.forEach(guide => this.insert('careGuides', guide));
  }
}

/**
 * Mock Drizzle ORM query builder
 */
class MockQueryBuilder {
  private inMemoryDb: InMemoryDatabase;
  private currentTable: string = '';
  private whereConditions: ((record: any) => boolean)[] = [];
  private joinTables: string[] = [];
  private orderByFields: { field: string; direction: 'asc' | 'desc' }[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(inMemoryDb: InMemoryDatabase) {
    this.inMemoryDb = inMemoryDb;
  }

  select(fields?: any) {
    return this;
  }

  from(table: any) {
    // Extract table name from Drizzle table object
    this.currentTable = typeof table === 'string' ? table : table._.name || 'unknown';
    return this;
  }

  where(condition: any) {
    // Convert Drizzle conditions to filter functions
    if (typeof condition === 'function') {
      this.whereConditions.push(condition);
    } else {
      // Mock condition - always match for simplicity
      this.whereConditions.push(() => true);
    }
    return this;
  }

  leftJoin(table: any, condition?: any) {
    const tableName = typeof table === 'string' ? table : table._.name || 'unknown';
    this.joinTables.push(tableName);
    return this;
  }

  innerJoin(table: any, condition?: any) {
    return this.leftJoin(table, condition);
  }

  orderBy(field: any, direction: 'asc' | 'desc' = 'asc') {
    this.orderByFields.push({ field: String(field), direction });
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  offset(count: number) {
    this.offsetValue = count;
    return this;
  }

  async execute(): Promise<any[]> {
    let results = this.inMemoryDb.select(this.currentTable);
    
    // Apply where conditions
    this.whereConditions.forEach(condition => {
      results = results.filter(condition);
    });
    
    // Apply ordering
    if (this.orderByFields.length > 0) {
      results.sort((a, b) => {
        for (const { field, direction } of this.orderByFields) {
          const aVal = a[field];
          const bVal = b[field];
          
          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    // Apply pagination
    if (this.offsetValue) {
      results = results.slice(this.offsetValue);
    }
    if (this.limitValue) {
      results = results.slice(0, this.limitValue);
    }
    
    return results;
  }

  // For compatibility with existing tests
  then(onResolve: (value: any[]) => any, onReject?: (reason: any) => any) {
    return this.execute().then(onResolve, onReject);
  }
}

/**
 * Mock insert/update/delete operations
 */
class MockMutationBuilder {
  private inMemoryDb: InMemoryDatabase;
  private currentTable: string = '';
  private insertData: any = null;
  private updateData: any = null;
  private whereConditions: ((record: any) => boolean)[] = [];

  constructor(inMemoryDb: InMemoryDatabase, table: string) {
    this.inMemoryDb = inMemoryDb;
    this.currentTable = table;
  }

  values(data: any) {
    this.insertData = data;
    return this;
  }

  set(data: any) {
    this.updateData = data;
    return this;
  }

  where(condition: any) {
    if (typeof condition === 'function') {
      this.whereConditions.push(condition);
    } else {
      this.whereConditions.push(() => true);
    }
    return this;
  }

  returning(fields?: any) {
    return this;
  }

  async execute(): Promise<any[]> {
    if (this.insertData) {
      const inserted = this.inMemoryDb.insert(this.currentTable, this.insertData);
      return [inserted];
    }
    
    if (this.updateData) {
      const whereCondition = this.whereConditions.length > 0 
        ? (record: any) => this.whereConditions.every(cond => cond(record))
        : () => true;
      
      return this.inMemoryDb.update(this.currentTable, whereCondition, this.updateData);
    }
    
    // Delete operation
    const whereCondition = this.whereConditions.length > 0 
      ? (record: any) => this.whereConditions.every(cond => cond(record))
      : () => true;
    
    return this.inMemoryDb.delete(this.currentTable, whereCondition);
  }

  // For compatibility with existing tests
  then(onResolve: (value: any[]) => any, onReject?: (reason: any) => any) {
    return this.execute().then(onResolve, onReject);
  }
}

/**
 * Main Database Test Manager
 */
export class DatabaseTestManager {
  private inMemoryDb: InMemoryDatabase;
  private mockDb: any;
  private originalDb: any;

  constructor() {
    this.inMemoryDb = new InMemoryDatabase();
    this.setupMockDb();
  }

  private setupMockDb() {
    this.mockDb = {
      select: jest.fn(() => new MockQueryBuilder(this.inMemoryDb)),
      insert: jest.fn((table: any) => {
        const tableName = typeof table === 'string' ? table : table._.name || 'unknown';
        return new MockMutationBuilder(this.inMemoryDb, tableName);
      }),
      update: jest.fn((table: any) => {
        const tableName = typeof table === 'string' ? table : table._.name || 'unknown';
        return new MockMutationBuilder(this.inMemoryDb, tableName);
      }),
      delete: jest.fn((table: any) => {
        const tableName = typeof table === 'string' ? table : table._.name || 'unknown';
        return new MockMutationBuilder(this.inMemoryDb, tableName);
      }),
      transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
        // Simple transaction mock - just execute the callback with the same db
        return await callback(this.mockDb);
      }),
    };
  }

  async setup(config: DatabaseMockConfig = { useInMemory: true, mockQueries: true }): Promise<void> {
    if (config.useInMemory) {
      // Mock the database module
      jest.doMock('@/lib/db', () => ({
        db: this.mockDb,
        // Mock Drizzle operators
        eq: jest.fn((field: any, value: any) => (record: any) => record[field] === value),
        and: jest.fn((...conditions: any[]) => (record: any) => 
          conditions.every(cond => typeof cond === 'function' ? cond(record) : true)
        ),
        or: jest.fn((...conditions: any[]) => (record: any) => 
          conditions.some(cond => typeof cond === 'function' ? cond(record) : true)
        ),
        desc: jest.fn((field: any) => ({ field: String(field), direction: 'desc' })),
        asc: jest.fn((field: any) => ({ field: String(field), direction: 'asc' })),
        sql: jest.fn((strings: TemplateStringsArray, ...values: any[]) => ({
          strings,
          values,
        })),
      }));
    }

    if (config.seedData) {
      await this.seedTestData(config.seedData);
    }
  }

  async teardown(): Promise<void> {
    this.inMemoryDb.reset();
    jest.clearAllMocks();
  }

  async seedTestData(data: TestDataSeed): Promise<void> {
    this.inMemoryDb.seedData(data);
  }

  async clearTestData(): Promise<void> {
    this.inMemoryDb.reset();
  }

  getMockDb() {
    return this.mockDb;
  }

  getInMemoryDb() {
    return this.inMemoryDb;
  }

  // Helper methods for test assertions
  getTableData(table: string): any[] {
    return this.inMemoryDb.select(table);
  }

  getRecordById(table: string, id: number): any | undefined {
    return this.inMemoryDb.select(table, record => record.id === id)[0];
  }

  countRecords(table: string, where?: (record: any) => boolean): number {
    return this.inMemoryDb.count(table, where);
  }
}

// Global instance for easy access in tests
let globalDatabaseManager: DatabaseTestManager | null = null;

export function getDatabaseTestManager(): DatabaseTestManager {
  if (!globalDatabaseManager) {
    globalDatabaseManager = new DatabaseTestManager();
  }
  return globalDatabaseManager;
}

export function resetDatabaseTestManager(): void {
  globalDatabaseManager = null;
}
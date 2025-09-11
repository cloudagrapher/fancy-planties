// Migration utilities for Node.js scripts (without server-only)
import { db } from './script-connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Migration utilities
export class MigrationUtils {
  // Run all pending migrations
  static async runMigrations(): Promise<void> {
    try {
      console.log('Starting database migrations...');
      
      // Create migrations table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        );
      `);

      // Apply migration files from drizzle directory
      const migrationsPath = path.join(process.cwd(), 'drizzle');
      
      if (fs.existsSync(migrationsPath)) {
        const files = fs.readdirSync(migrationsPath);
        const sqlFiles = files
          .filter(file => file.endsWith('.sql') && !file.includes('rls-policies'))
          .sort(); // Ensure migrations are applied in order

        for (const file of sqlFiles) {
          const filePath = path.join(migrationsPath, file);
          const migrationSQL = fs.readFileSync(filePath, 'utf8');
          
          // Check if migration was already applied
          const [existing] = await db.execute(sql`
            SELECT COUNT(*) as count FROM __drizzle_migrations 
            WHERE hash = ${file}
          `);
          
          if (Number(existing?.count) === 0) {
            console.log(`  📋 Applying migration: ${file}`);
            
            // Split migration into individual statements
            const statements = migrationSQL
              .split('--> statement-breakpoint')
              .map(stmt => stmt.trim())
              .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            for (const statement of statements) {
              const cleanStatement = statement.trim();
              if (cleanStatement && !cleanStatement.startsWith('--')) {
                await db.execute(sql.raw(cleanStatement));
              }
            }
            
            // Record migration as applied
            await db.execute(sql`
              INSERT INTO __drizzle_migrations (hash, created_at) 
              VALUES (${file}, ${Date.now()})
            `);
            
            console.log(`  ✅ Applied migration: ${file}`);
          } else {
            console.log(`  ⏭️  Skipping already applied migration: ${file}`);
          }
        }
      }

      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error('Failed to run migrations');
    }
  }

  // Apply RLS policies
  static async applyRLSPolicies(): Promise<void> {
    try {
      console.log('Applying Row-Level Security policies...');
      
      const rlsPath = path.join(process.cwd(), 'drizzle', 'rls-policies.sql');
      
      if (fs.existsSync(rlsPath)) {
        const rlsSQL = fs.readFileSync(rlsPath, 'utf8');
        
        // Split by semicolon and filter out comments
        const statements = rlsSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => 
            stmt.length > 0 && 
            !stmt.startsWith('--') && 
            !stmt.match(/^\/\*.*\*\/$/)
          );

        for (const statement of statements) {
          const cleanStatement = statement.trim();
          if (cleanStatement && !cleanStatement.startsWith('--')) {
            try {
              await db.execute(sql.raw(cleanStatement));
            } catch (error) {
              // Log but don't fail on policy conflicts (they might already exist)
              if (error instanceof Error && error.message.includes('already exists')) {
                console.log(`Policy already exists, skipping: ${cleanStatement.substring(0, 50)}...`);
              } else {
                console.error(`Failed to execute statement: ${cleanStatement.substring(0, 50)}...`);
                throw error;
              }
            }
          }
        }
        
        console.log('RLS policies applied successfully');
      } else {
        console.warn('RLS policies file not found, skipping...');
      }
    } catch (error) {
      console.error('Failed to apply RLS policies:', error);
      throw new Error('Failed to apply RLS policies');
    }
  }

  // Check migration status
  static async getMigrationStatus(): Promise<{
    appliedMigrations: number;
    pendingMigrations: string[];
  }> {
    try {
      // Get applied migrations
      const appliedResults = await db.execute(sql`
        SELECT hash FROM __drizzle_migrations ORDER BY created_at
      `);
      
      const appliedMigrations = appliedResults.length;
      const appliedHashes = new Set(appliedResults.map(r => r.hash));
      
      // Get all migration files
      const migrationsPath = path.join(process.cwd(), 'drizzle');
      const pendingMigrations: string[] = [];
      
      if (fs.existsSync(migrationsPath)) {
        const files = fs.readdirSync(migrationsPath);
        const sqlFiles = files
          .filter(file => file.endsWith('.sql') && !file.includes('rls-policies'))
          .sort();
        
        // Find pending migrations
        for (const file of sqlFiles) {
          if (!appliedHashes.has(file)) {
            pendingMigrations.push(file);
          }
        }
      }

      return {
        appliedMigrations,
        pendingMigrations
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      throw new Error('Failed to get migration status');
    }
  }

  // Seed initial data (for development)
  static async seedInitialData(): Promise<void> {
    try {
      console.log('Seeding initial data...');
      
      // Check if we already have data
      const [userCount] = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      
      if (Number(userCount?.count) > 0) {
        console.log('Database already has data, skipping seed');
        return;
      }

      // Add some common plant taxonomy data
      const commonPlants = [
        {
          family: 'Araceae',
          genus: 'Monstera',
          species: 'deliciosa',
          commonName: 'Swiss Cheese Plant',
          careInstructions: 'Bright indirect light, water when top inch of soil is dry',
          isVerified: true
        },
        {
          family: 'Araceae',
          genus: 'Pothos',
          species: 'aureus',
          commonName: 'Golden Pothos',
          careInstructions: 'Low to bright indirect light, water when soil is dry',
          isVerified: true
        },
        {
          family: 'Asparagaceae',
          genus: 'Sansevieria',
          species: 'trifasciata',
          commonName: 'Snake Plant',
          careInstructions: 'Low light tolerant, water sparingly',
          isVerified: true
        },
        {
          family: 'Araceae',
          genus: 'Philodendron',
          species: 'hederaceum',
          commonName: 'Heartleaf Philodendron',
          careInstructions: 'Bright indirect light, keep soil lightly moist',
          isVerified: true
        }
      ];

      for (const plant of commonPlants) {
        await db.execute(sql`
          INSERT INTO plants (family, genus, species, cultivar, common_name, care_instructions, is_verified)
          VALUES (${plant.family}, ${plant.genus}, ${plant.species}, NULL, ${plant.commonName}, ${plant.careInstructions}, ${plant.isVerified})
          ON CONFLICT (family, genus, species, cultivar) DO NOTHING
        `);
      }

      console.log('Initial data seeded successfully');
    } catch (error) {
      console.error('Failed to seed initial data:', error);
      throw new Error('Failed to seed initial data');
    }
  }

  // Database health check
  static async healthCheck(): Promise<{
    connected: boolean;
    migrationsApplied: boolean;
    rlsEnabled: boolean;
    tablesExist: boolean;
  }> {
    try {
      // Check connection
      const connected = await db.execute(sql`SELECT 1`).then(() => true).catch(() => false);
      
      // Check if migrations table exists
      const [migrationTable] = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '__drizzle_migrations'
        ) as exists
      `);
      const migrationsApplied = Boolean(migrationTable?.exists) || false;

      // Check if main tables exist (including email verification)
      const [tablesCheck] = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('users', 'plants', 'plant_instances', 'propagations', 'sessions', 'email_verification_codes')) as table_count
      `);
      const tablesExist = Number(tablesCheck?.table_count) === 6;

      // Check if RLS is enabled on user tables
      const [rlsCheck] = await db.execute(sql`
        SELECT COUNT(*) as rls_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relrowsecurity = true 
        AND n.nspname = 'public'
        AND c.relname IN ('plant_instances', 'propagations', 'sessions', 'care_history', 'care_guides', 'email_verification_codes')
      `);
      const rlsEnabled = Number(rlsCheck?.rls_count) === 6;

      return {
        connected,
        migrationsApplied,
        rlsEnabled,
        tablesExist
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        connected: false,
        migrationsApplied: false,
        rlsEnabled: false,
        tablesExist: false
      };
    }
  }
}
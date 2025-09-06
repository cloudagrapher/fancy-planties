#!/usr/bin/env tsx

import { MigrationUtils, checkDatabaseConnection } from '../src/lib/db';

async function main() {
  const command = process.argv[2];

  try {
    console.log('🌱 Fancy Planties Database Setup');
    console.log('================================');

    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database');
      process.exit(1);
    }
    console.log('✅ Database connection established');

    switch (command) {
      case 'migrate':
        await MigrationUtils.runMigrations();
        await MigrationUtils.applyRLSPolicies();
        console.log('✅ Migrations and RLS policies applied');
        break;

      case 'seed':
        await MigrationUtils.seedInitialData();
        console.log('✅ Initial data seeded');
        break;

      case 'setup':
        await MigrationUtils.runMigrations();
        await MigrationUtils.applyRLSPolicies();
        await MigrationUtils.seedInitialData();
        console.log('✅ Database setup complete');
        break;

      case 'status':
        const status = await MigrationUtils.getMigrationStatus();
        console.log(`📊 Applied migrations: ${status.appliedMigrations}`);
        console.log(`📋 Pending migrations: ${status.pendingMigrations.length}`);
        if (status.pendingMigrations.length > 0) {
          console.log('   -', status.pendingMigrations.join('\n   - '));
        }
        break;

      case 'health':
        const health = await MigrationUtils.healthCheck();
        console.log('🏥 Database Health Check:');
        console.log(`   Connected: ${health.connected ? '✅' : '❌'}`);
        console.log(`   Tables exist: ${health.tablesExist ? '✅' : '❌'}`);
        console.log(`   Migrations applied: ${health.migrationsApplied ? '✅' : '❌'}`);
        console.log(`   RLS enabled: ${health.rlsEnabled ? '✅' : '❌'}`);
        break;

      default:
        console.log('Usage: npm run db:setup <command>');
        console.log('Commands:');
        console.log('  migrate  - Run migrations and apply RLS policies');
        console.log('  seed     - Seed initial data');
        console.log('  setup    - Run migrations, RLS, and seed data');
        console.log('  status   - Show migration status');
        console.log('  health   - Check database health');
        break;
    }

  } catch (error) {
    console.error('❌ Database operation failed:', error);
    process.exit(1);
  }
}

main();
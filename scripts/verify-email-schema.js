#!/usr/bin/env node

/**
 * Verification script for email verification schema
 * This script checks that all required tables and columns exist
 */

const { execSync } = require('child_process');

console.log('🔍 Verifying Email Verification Schema');
console.log('=====================================');

function checkSchema() {
  try {
    // Check if email_verification_codes table exists
    console.log('📋 Checking email_verification_codes table...');
    
    const tableCheck = execSync(`
      docker compose exec -T postgres psql -U postgres -d fancy_planties -t -c "
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'email_verification_codes'
        );"
    `, { encoding: 'utf8' }).trim();
    
    if (tableCheck.includes('t')) {
      console.log('✅ email_verification_codes table exists');
    } else {
      console.log('❌ email_verification_codes table missing');
      return false;
    }
    
    // Check table structure
    console.log('📋 Checking table structure...');
    
    const columns = execSync(`
      docker compose exec -T postgres psql -U postgres -d fancy_planties -t -c "
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'email_verification_codes' 
        ORDER BY ordinal_position;"
    `, { encoding: 'utf8' });
    
    console.log('📊 Table columns:');
    console.log(columns);
    
    // Check if users table has is_email_verified column
    console.log('📋 Checking users table for is_email_verified column...');
    
    const userColumn = execSync(`
      docker compose exec -T postgres psql -U postgres -d fancy_planties -t -c "
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'is_email_verified'
        );"
    `, { encoding: 'utf8' }).trim();
    
    if (userColumn.includes('t')) {
      console.log('✅ users.is_email_verified column exists');
    } else {
      console.log('❌ users.is_email_verified column missing');
      return false;
    }
    
    // Check indexes
    console.log('📋 Checking indexes...');
    
    const indexes = execSync(`
      docker compose exec -T postgres psql -U postgres -d fancy_planties -t -c "
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'email_verification_codes';"
    `, { encoding: 'utf8' });
    
    console.log('📊 Indexes:');
    console.log(indexes);
    
    // Check foreign key constraint
    console.log('📋 Checking foreign key constraints...');
    
    const fkeys = execSync(`
      docker compose exec -T postgres psql -U postgres -d fancy_planties -t -c "
        SELECT conname, confrelid::regclass 
        FROM pg_constraint 
        WHERE conrelid = 'email_verification_codes'::regclass 
        AND contype = 'f';"
    `, { encoding: 'utf8' });
    
    console.log('🔗 Foreign keys:');
    console.log(fkeys);
    
    console.log('✅ Email verification schema verification complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting schema verification...');
  
  // Check if database is running
  try {
    execSync('docker compose ps postgres', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Database is not running. Please start with: docker compose up postgres -d');
    process.exit(1);
  }
  
  const success = checkSchema();
  
  if (success) {
    console.log('🎉 All email verification schema components are properly set up!');
    process.exit(0);
  } else {
    console.log('💥 Schema verification failed. Please check the migration files.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
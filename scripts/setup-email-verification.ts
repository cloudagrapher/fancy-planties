#!/usr/bin/env tsx

/**
 * Email Verification Setup Script
 * 
 * This script ensures that the email verification schema is properly set up
 * in both new and existing databases. It can be run safely multiple times.
 */

import { db } from '../src/lib/db/script-connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function setupEmailVerification() {
  try {
    console.log('📧 Email Verification Setup');
    console.log('===========================');
    
    // 1. Check database connection
    console.log('🔌 Checking database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection established');
    
    // 2. Ensure migration tracking table exists
    console.log('📋 Ensuring migration tracking table exists...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);
    
    // 3. Check if email verification table exists
    console.log('📧 Checking email verification table...');
    const [emailTableExists] = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_verification_codes'
      ) as exists;
    `);
    
    if (!emailTableExists?.exists) {
      console.log('📋 Email verification table missing, applying migration...');
      
      // Apply the email verification migration
      const migrationPath = path.join(process.cwd(), 'drizzle', '0001_magical_proteus.sql');
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
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
          VALUES ('0001_magical_proteus.sql', ${Date.now()})
          ON CONFLICT DO NOTHING
        `);
        
        console.log('✅ Email verification migration applied');
      } else {
        throw new Error('Email verification migration file not found');
      }
    } else {
      console.log('✅ Email verification table already exists');
    }
    
    // 4. Check if users table has is_email_verified column
    console.log('👤 Checking users table for email verification column...');
    const [emailColumnExists] = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_email_verified'
      ) as exists;
    `);
    
    if (!emailColumnExists?.exists) {
      console.log('📋 Adding is_email_verified column to users table...');
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN is_email_verified boolean DEFAULT false NOT NULL;
      `);
      await db.execute(sql`
        CREATE INDEX users_email_verified_idx ON users(is_email_verified);
      `);
      console.log('✅ Email verification column added to users table');
    } else {
      console.log('✅ Users table already has email verification column');
    }
    
    // 5. Ensure RLS policies are applied
    console.log('🔒 Checking Row-Level Security policies...');
    const [rlsEnabled] = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'email_verification_codes'
      ) as exists;
    `);
    
    if (!rlsEnabled?.exists) {
      console.log('📋 Applying RLS policies for email verification...');
      
      // Enable RLS on email verification codes table
      await db.execute(sql`ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;`);
      
      // Create policies for email verification codes
      const policies = [
        `CREATE POLICY "Users can view their own verification codes" ON email_verification_codes
         FOR SELECT USING (user_id = get_current_user_id());`,
        
        `CREATE POLICY "Users can insert their own verification codes" ON email_verification_codes
         FOR INSERT WITH CHECK (user_id = get_current_user_id());`,
        
        `CREATE POLICY "Users can update their own verification codes" ON email_verification_codes
         FOR UPDATE USING (user_id = get_current_user_id());`,
        
        `CREATE POLICY "Users can delete their own verification codes" ON email_verification_codes
         FOR DELETE USING (user_id = get_current_user_id());`,
        
        `CREATE POLICY "System can manage verification codes for auth" ON email_verification_codes
         FOR ALL USING (get_current_user_id() = 0);`
      ];
      
      for (const policy of policies) {
        try {
          await db.execute(sql.raw(policy));
        } catch (error) {
          if (error instanceof Error && error.message.includes('already exists')) {
            console.log('  ⏭️  Policy already exists, skipping');
          } else {
            throw error;
          }
        }
      }
      
      console.log('✅ RLS policies applied for email verification');
    } else {
      console.log('✅ RLS policies already exist for email verification');
    }
    
    // 6. Final verification
    console.log('🔍 Running final verification...');
    
    const [finalCheck] = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'email_verification_codes') as email_table,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_email_verified') as email_column,
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'email_verification_codes') as rls_policies
    `);
    
    const emailTableOk = Number(finalCheck?.email_table) === 1;
    const emailColumnOk = Number(finalCheck?.email_column) === 1;
    const rlsPoliciesOk = Number(finalCheck?.rls_policies) >= 4;
    
    console.log(`📧 Email verification table: ${emailTableOk ? '✅' : '❌'}`);
    console.log(`👤 Users email verification column: ${emailColumnOk ? '✅' : '❌'}`);
    console.log(`🔒 RLS policies: ${rlsPoliciesOk ? '✅' : '❌'} (${finalCheck?.rls_policies} policies)`);
    
    if (emailTableOk && emailColumnOk && rlsPoliciesOk) {
      console.log('🎉 Email verification setup completed successfully!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('  1. Configure email service (Resend) environment variables');
      console.log('  2. Implement email verification API endpoints');
      console.log('  3. Create email verification frontend components');
      console.log('  4. Update authentication middleware');
    } else {
      throw new Error('Email verification setup verification failed');
    }
    
  } catch (error) {
    console.error('❌ Email verification setup failed:', error);
    process.exit(1);
  }
}

setupEmailVerification();
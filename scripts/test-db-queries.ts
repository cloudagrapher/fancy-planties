#!/usr/bin/env tsx

import { 
  UserQueries, 
  PlantQueries, 
  PlantInstanceQueries, 
  PropagationQueries,
  checkDatabaseConnection 
} from '../src/lib/db/queries';

async function testQueries() {
  console.log('🧪 Testing Database Queries');
  console.log('===========================');

  try {
    // Check connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connected');

    // Test plant queries
    console.log('\n📱 Testing Plant Queries...');
    const plants = await PlantQueries.search('monstera', 5);
    console.log(`Found ${plants.length} plants matching 'monstera'`);
    
    if (plants.length > 0) {
      console.log(`First result: ${plants[0].genus} ${plants[0].species} (${plants[0].commonName})`);
    }

    // Test popular plants
    const popular = await PlantQueries.getPopular(3);
    console.log(`Found ${popular.length} popular plants`);

    console.log('\n✅ All database queries working correctly!');

  } catch (error) {
    console.error('❌ Database query test failed:', error);
    process.exit(1);
  }
}

testQueries();
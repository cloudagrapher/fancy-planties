#!/usr/bin/env node

/**
 * Test Environment Setup Script
 * 
 * Configures the test environment for CI/CD and local development.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Environment configuration
const TEST_CONFIG = {
  CI: {
    NODE_ENV: 'test',
    CI: 'true',
    JEST_WORKERS: '2',
    TEST_TIMEOUT: '15000',
    COVERAGE_THRESHOLD: '80',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test_db',
  },
  LOCAL: {
    NODE_ENV: 'test',
    CI: 'false',
    JEST_WORKERS: '50%',
    TEST_TIMEOUT: '10000',
    COVERAGE_THRESHOLD: '70',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/fancy_planties_test',
  },
};

/**
 * Setup test environment based on context
 */
function setupTestEnvironment() {
  const isCI = process.env.CI === 'true';
  const config = isCI ? TEST_CONFIG.CI : TEST_CONFIG.LOCAL;
  
  console.log(`🔧 Setting up ${isCI ? 'CI' : 'local'} test environment...`);
  
  // Set environment variables
  Object.entries(config).forEach(([key, value]) => {
    process.env[key] = value;
    console.log(`   ${key}=${value}`);
  });
  
  // Create necessary directories
  const directories = [
    'coverage',
    'coverage/error-reports',
    '.jest-cache',
    'test-artifacts',
  ];
  
  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Setup test database if needed
  if (!isCI) {
    setupLocalTestDatabase();
  }
  
  // Generate test configuration files
  generateTestConfig(isCI);
  
  console.log('✅ Test environment setup complete!');
}

/**
 * Setup local test database
 */
function setupLocalTestDatabase() {
  console.log('🗄️  Setting up local test database...');
  
  try {
    // Check if PostgreSQL is running
    execSync('pg_isready -h localhost -p 5433', { stdio: 'ignore' });
    console.log('   PostgreSQL is running');
    
    // Create test database if it doesn't exist
    try {
      execSync('createdb -h localhost -p 5433 -U postgres fancy_planties_test', { stdio: 'ignore' });
      console.log('   Created test database');
    } catch (error) {
      // Database might already exist
      console.log('   Test database already exists');
    }
    
  } catch (error) {
    console.warn('⚠️  PostgreSQL not running locally. Tests will use mocked database.');
  }
}

/**
 * Generate test configuration files
 */
function generateTestConfig(isCI) {
  console.log('📝 Generating test configuration...');
  
  // Generate Jest performance config
  const jestPerformanceConfig = {
    testTimeout: parseInt(process.env.TEST_TIMEOUT),
    maxWorkers: process.env.JEST_WORKERS,
    cache: !isCI,
    cacheDirectory: '.jest-cache',
    coverageThreshold: {
      global: {
        branches: parseInt(process.env.COVERAGE_THRESHOLD),
        functions: parseInt(process.env.COVERAGE_THRESHOLD),
        lines: parseInt(process.env.COVERAGE_THRESHOLD),
        statements: parseInt(process.env.COVERAGE_THRESHOLD),
      },
    },
  };
  
  // Write performance config
  fs.writeFileSync(
    path.join(process.cwd(), 'jest.performance.json'),
    JSON.stringify(jestPerformanceConfig, null, 2)
  );
  
  console.log('   Generated jest.performance.json');
  
  // Generate test environment info
  const envInfo = {
    environment: isCI ? 'CI' : 'local',
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
    config: isCI ? TEST_CONFIG.CI : TEST_CONFIG.LOCAL,
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'test-environment.json'),
    JSON.stringify(envInfo, null, 2)
  );
  
  console.log('   Generated test-environment.json');
}

/**
 * Validate test environment
 */
function validateTestEnvironment() {
  console.log('🔍 Validating test environment...');
  
  const requiredFiles = [
    'jest.config.js',
    'jest.setup.js',
    'package.json',
  ];
  
  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(path.join(process.cwd(), file))
  );
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:', missingFiles);
    process.exit(1);
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.error(`❌ Node.js ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
    process.exit(1);
  }
  
  console.log(`✅ Node.js ${nodeVersion} is supported`);
  
  // Check npm dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['jest', '@testing-library/react', '@testing-library/jest-dom'];
    
    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.devDependencies[dep] && !packageJson.dependencies[dep]
    );
    
    if (missingDeps.length > 0) {
      console.error('❌ Missing required dependencies:', missingDeps);
      process.exit(1);
    }
    
    console.log('✅ All required dependencies are installed');
    
  } catch (error) {
    console.error('❌ Failed to read package.json:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Test environment validation complete!');
}

/**
 * Clean test environment
 */
function cleanTestEnvironment() {
  console.log('🧹 Cleaning test environment...');
  
  const cleanupPaths = [
    'coverage',
    '.jest-cache',
    'test-artifacts',
    'jest.performance.json',
    'test-environment.json',
  ];
  
  cleanupPaths.forEach(cleanupPath => {
    const fullPath = path.join(process.cwd(), cleanupPath);
    if (fs.existsSync(fullPath)) {
      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      console.log(`   Removed: ${cleanupPath}`);
    }
  });
  
  console.log('✅ Test environment cleaned!');
}

/**
 * Generate test performance report
 */
function generatePerformanceReport() {
  console.log('📊 Generating test performance report...');
  
  const reportPath = path.join(process.cwd(), 'coverage', 'performance-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('⚠️  No performance data found');
    return;
  }
  
  try {
    const performanceData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log('\n📈 Test Performance Summary:');
    console.log(`   Total Tests: ${performanceData.totalTests || 0}`);
    console.log(`   Average Duration: ${performanceData.averageDuration || 0}ms`);
    console.log(`   Slowest Test: ${performanceData.slowestTest || 'N/A'}`);
    console.log(`   Memory Peak: ${performanceData.memoryPeak || 0}MB`);
    
  } catch (error) {
    console.error('❌ Failed to read performance report:', error.message);
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'setup':
    validateTestEnvironment();
    setupTestEnvironment();
    break;
  
  case 'validate':
    validateTestEnvironment();
    break;
  
  case 'clean':
    cleanTestEnvironment();
    break;
  
  case 'report':
    generatePerformanceReport();
    break;
  
  default:
    console.log('Usage: node setup-test-environment.js <command>');
    console.log('Commands:');
    console.log('  setup    - Setup test environment');
    console.log('  validate - Validate test environment');
    console.log('  clean    - Clean test environment');
    console.log('  report   - Generate performance report');
    process.exit(1);
}
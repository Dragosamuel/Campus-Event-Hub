// Simple status check for the application
const fs = require('fs');
const path = require('path');

console.log('=== Campus Event Hub Application Status Check ===\n');

// Check if required files exist
const requiredFiles = [
  'server.js',
  'package.json',
  'utils/database.js',
  'utils/cache.js',
  'utils/email.js',
  'services/eventService.js',
  'services/userService.js'
];

console.log('1. Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${file}: ${exists ? '✓ Found' : '✗ Missing'}`);
});

// Check if required directories exist
const requiredDirs = [
  'views',
  'public',
  'utils',
  'services',
  'routes',
  'controllers',
  'models'
];

console.log('\n2. Checking required directories:');
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(path.join(__dirname, dir));
  console.log(`   ${dir}: ${exists ? '✓ Found' : '✗ Missing'}`);
});

// Check package.json dependencies
console.log('\n3. Checking key dependencies in package.json:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const keyDependencies = [
    'express',
    'mongodb',
    'jsonwebtoken',
    'bcrypt',
    'ejs'
  ];
  
  keyDependencies.forEach(dep => {
    const version = packageJson.dependencies[dep];
    console.log(`   ${dep}: ${version ? `✓ v${version}` : '✗ Missing'}`);
  });
} catch (error) {
  console.log('   ✗ Error reading package.json:', error.message);
}

// Check environment variables
console.log('\n4. Checking environment configuration:');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✓ .env file found');
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredEnvVars = [
      'MONGODB_URI',
      'PORT',
      'JWT_SECRET'
    ];
    
    requiredEnvVars.forEach(envVar => {
      const hasVar = envContent.includes(envVar);
      console.log(`   ${envVar}: ${hasVar ? '✓ Configured' : '⚠ Not found'}`);
    });
  } catch (error) {
    console.log('   ✗ Error reading .env file:', error.message);
  }
} else {
  console.log('   ⚠ .env file not found (may use defaults)');
}

console.log('\n=== Status Check Complete ===');
console.log('\nTo start the application, ensure MongoDB is running and execute:');
console.log('npm start');
console.log('or');
console.log('node server.js');
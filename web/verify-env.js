#!/usr/bin/env node
/**
 * Environment Verification Script
 * Checks if all required NextAuth environment variables are properly set
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 NextAuth Environment Verification\n');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('📋 Checking environment files...\n');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local NOT FOUND');
  console.log('   Required file: .env.local');
  console.log('   Create it with: cp .env.example .env.local\n');
  process.exit(1);
}

console.log('✅ .env.local exists');

// Read .env.local
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'));

console.log('\n🔑 Environment Variables:\n');

const requiredVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GITHUB_ID',
  'GITHUB_SECRET',
];

let allVarsSet = true;
requiredVars.forEach(varName => {
  const line = envLines.find(l => l.startsWith(varName + '='));
  if (!line) {
    console.log(`❌ ${varName} - NOT SET`);
    allVarsSet = false;
  } else {
    const value = line.split('=')[1];
    if (!value || value.trim() === '') {
      console.log(`❌ ${varName} - EMPTY VALUE`);
      allVarsSet = false;
    } else {
      console.log(`✅ ${varName} - Set (${value.length} chars)`);
    }
  }
});

if (!allVarsSet) {
  console.log('\n⚠️  Some required variables are missing or empty!');
  console.log('\n📝 Edit .env.local and add:\n');
  console.log('   NEXTAUTH_URL=http://localhost:3000');
  console.log('   NEXTAUTH_SECRET=your-random-secret-key-here');
  console.log('   GITHUB_ID=your-github-app-client-id');
  console.log('   GITHUB_SECRET=your-github-app-client-secret\n');
  process.exit(1);
}

console.log('\n✅ All required environment variables are set!\n');
console.log('🚀 Ready to start NextAuth\n');

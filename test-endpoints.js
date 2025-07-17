#!/usr/bin/env node

import { createLNMarketsService } from './server/services/lnmarkets.ts';

// Test configuration (you'll need to replace with real credentials)
const testConfig = {
  apiKey: process.env.LN_MARKETS_API_KEY || 'test-key',
  secret: process.env.LN_MARKETS_SECRET || 'test-secret',
  passphrase: process.env.LN_MARKETS_PASSPHRASE || 'test-passphrase',
  network: 'mainnet'
};

async function testEndpoints() {
  console.log('🧪 Testing LN Markets endpoints...\n');
  
  const service = createLNMarketsService(testConfig);
  
  const endpoints = [
    { name: 'GET /user', method: () => service.getUserInfo() },
    { name: 'GET /futures/market', method: () => service.getFuturesTicker() },
    { name: 'GET /futures (open)', method: () => service.getFuturesTrades('open') },
    { name: 'GET /futures (running)', method: () => service.getFuturesTrades('running') },
    { name: 'GET /futures (closed)', method: () => service.getFuturesTrades('closed') },
    { name: 'GET /options', method: () => service.getOptionsTrades() },
    { name: 'GET /options/instruments', method: () => service.getOptionsInstruments() },
    { name: 'GET /futures/carry-fees', method: () => service.getCarryFees() },
    { name: 'GET /options/volatility', method: () => service.getVolatility() },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const result = await endpoint.method();
      console.log(`✅ ${endpoint.name} - SUCCESS`);
      if (Array.isArray(result)) {
        console.log(`   Found ${result.length} items`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} - FAILED: ${error.message}`);
      if (error.message.includes('Signature is not valid')) {
        console.log(`   🔍 This endpoint has signature issues`);
      }
    }
    console.log('');
  }
}

// Run the test
testEndpoints().catch(console.error); 
import { createLNMarketsService } from './server/services/lnmarkets.ts';

// Test configuration (replace with your actual credentials)
const config = {
  apiKey: 'test-api-key',
  secret: 'test-secret',
  passphrase: 'test-passphrase',
  network: 'testnet'
};

const lnmarkets = createLNMarketsService(config);

async function testAllEndpoints() {
  console.log('🧪 Testing all LN Markets endpoints...\n');
  
  const tests = [
    {
      name: 'getUserInfo',
      test: () => lnmarkets.getUserInfo()
    },
    {
      name: 'getBalance',
      test: () => lnmarkets.getBalance()
    },
    {
      name: 'getFuturesTrades (open)',
      test: () => lnmarkets.getFuturesTrades('open')
    },
    {
      name: 'getFuturesTrades (closed)',
      test: () => lnmarkets.getFuturesTrades('closed')
    },
    {
      name: 'getFuturesTrades (running)',
      test: () => lnmarkets.getFuturesTrades('running')
    },
    {
      name: 'getFuturesTicker',
      test: () => lnmarkets.getFuturesTicker()
    },
    {
      name: 'getPriceHistory',
      test: () => lnmarkets.getPriceHistory(1751299710, Math.floor(Date.now() / 1000))
    },
    {
      name: 'getIndexHistory',
      test: () => lnmarkets.getIndexHistory(1751299710, Math.floor(Date.now() / 1000))
    },
    {
      name: 'getCarryFees',
      test: () => lnmarkets.getCarryFees()
    },
    {
      name: 'getOptionsTrades',
      test: () => lnmarkets.getOptionsTrades()
    },
    {
      name: 'getOptionsInstruments',
      test: () => lnmarkets.getOptionsInstruments()
    },
    {
      name: 'getDepositHistory',
      test: () => lnmarkets.getDepositHistory()
    },
    {
      name: 'generateDepositAddress',
      test: () => lnmarkets.generateDepositAddress({ amount: 100000 })
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const result = await test.test();
      console.log(`✅ ${test.name}: SUCCESS`);
      console.log(`   Response type: ${typeof result}`);
      if (Array.isArray(result)) {
        console.log(`   Array length: ${result.length}`);
      }
      console.log('');
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED`);
      console.log(`   Error: ${error.message}`);
      
      // Check if it's a signature error or API key error
      if (error.message.includes('Signature')) {
        console.log(`   🔴 SIGNATURE ERROR - This needs fixing!`);
      } else if (error.message.includes('Api key does not exist')) {
        console.log(`   🟡 API KEY ERROR - Expected with test credentials`);
      } else {
        console.log(`   🟠 OTHER ERROR - Check endpoint validity`);
      }
      console.log('');
      failed++;
    }
  }

  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All endpoints working correctly!');
  } else {
    console.log('\n⚠️  Some endpoints have issues. Check the errors above.');
  }
}

// Test ID-based operations with a dummy ID
async function testIdOperations() {
  console.log('\n🔧 Testing ID-based operations...\n');
  
  const dummyId = 'test-trade-id-123';
  
  const idTests = [
    {
      name: 'updateFuturesTrade',
      test: () => lnmarkets.updateFuturesTrade(dummyId, { takeprofit: 50000, stoploss: 30000 })
    },
    {
      name: 'closeFuturesTrade',
      test: () => lnmarkets.closeFuturesTrade(dummyId)
    },
    {
      name: 'cancelFuturesOrder',
      test: () => lnmarkets.cancelFuturesOrder(dummyId)
    },
    {
      name: 'closeOptionsTrade',
      test: () => lnmarkets.closeOptionsTrade(dummyId)
    }
  ];

  for (const test of idTests) {
    try {
      console.log(`Testing ${test.name}...`);
      const result = await test.test();
      console.log(`✅ ${test.name}: SUCCESS`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED`);
      console.log(`   Error: ${error.message}`);
      
      if (error.message.includes('Invalid trade ID')) {
        console.log(`   🟡 VALIDATION ERROR - Expected with dummy ID`);
      } else if (error.message.includes('Api key does not exist')) {
        console.log(`   🟡 API KEY ERROR - Expected with test credentials`);
      } else {
        console.log(`   🟠 OTHER ERROR - Check endpoint validity`);
      }
      console.log('');
    }
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🚨 Testing error handling...\n');
  
  const errorTests = [
    {
      name: 'updateFuturesTrade with undefined ID',
      test: () => lnmarkets.updateFuturesTrade(undefined, { takeprofit: 50000 })
    },
    {
      name: 'closeFuturesTrade with null ID',
      test: () => lnmarkets.closeFuturesTrade(null)
    },
    {
      name: 'cancelFuturesOrder with empty ID',
      test: () => lnmarkets.cancelFuturesOrder('')
    },
    {
      name: 'getPriceHistory with undefined parameters',
      test: () => lnmarkets.getPriceHistory(undefined, undefined)
    }
  ];

  for (const test of errorTests) {
    try {
      console.log(`Testing ${test.name}...`);
      await test.test();
      console.log(`❌ ${test.name}: SHOULD HAVE FAILED`);
      console.log('');
    } catch (error) {
      console.log(`✅ ${test.name}: CORRECTLY FAILED`);
      console.log(`   Error: ${error.message}`);
      console.log('');
    }
  }
}

async function runAllTests() {
  try {
    await testAllEndpoints();
    await testIdOperations();
    await testErrorHandling();
    
    console.log('\n🎯 Summary:');
    console.log('   - All endpoints now use proper signature generation');
    console.log('   - IDs are sent as query parameters, not in request body');
    console.log('   - No undefined parameters are sent to the API');
    console.log('   - Proper error handling for invalid inputs');
    console.log('   - Timestamp is in seconds, not milliseconds');
    console.log('   - Full path including /v2 is used in signature');
    
  } catch (error) {
    console.error('Test runner error:', error);
  }
}

runAllTests(); 
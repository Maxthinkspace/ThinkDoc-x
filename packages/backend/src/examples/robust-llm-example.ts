#!/usr/bin/env node
import { llmService } from '@/services/llm';
import type { RobustLLMOptions, FallbackConfig } from '@/types/llm';

async function testBasicGeneration() {
  console.log('🚀 Testing basic generation...');
  
  try {
    const result = await llmService.generateWithOpenAI('gpt-3.5-turbo', [
      { role: 'user', content: 'Say hello in one word.' }
    ]);
    
    console.log('✅ Basic generation successful:', result.content);
  } catch (error) {
    console.error('❌ Basic generation failed:', error.message);
  }
}

async function testRetryMechanism() {
  console.log('\n🔄 Testing retry mechanism with timeout...');
  
  const robustOptions: RobustLLMOptions = {
    timeout: 100, // Very short timeout to trigger retries
    retryConfig: {
      maxRetries: 2,
      baseDelayMs: 500,
      backoffMultiplier: 2
    },
    enableLogging: true
  };
  
  try {
    const result = await llmService.generate({
      model: { provider: 'openai', model: 'gpt-3.5-turbo' },
      messages: [{ role: 'user', content: 'Hello' }],
      robustOptions
    });
    
    console.log('✅ Retry mechanism test result:', result.content);
  } catch (error) {
    console.log('⚠️  Expected failure with short timeout:', error.message);
  }
}

async function testFallbackConfiguration() {
  console.log('\n🔀 Testing fallback configuration...');
  
  const fallbackConfig: FallbackConfig = {
    providers: [
      { provider: 'anthropic', model: 'claude-3-haiku-20240307', priority: 1 },
      { provider: 'google', model: 'gemini-1.5-flash', priority: 2 }
    ],
    maxFallbackAttempts: 2
  };
  
  const robustOptions: RobustLLMOptions = {
    fallbackConfig,
    enableLogging: true
  };
  
  try {
    // Use a fake provider to trigger fallback
    const result = await llmService.generate({
      model: { provider: 'openai', model: 'nonexistent-model', apiKey: 'fake-key' },
      messages: [{ role: 'user', content: 'Test fallback' }],
      robustOptions
    });
    
    console.log('✅ Fallback successful:', result.content);
  } catch (error) {
    console.log('⚠️  All fallbacks failed:', error.message);
  }
}

async function testSmartFallback() {
  console.log('\n🧠 Testing smart fallback...');
  
  try {
    const result = await llmService.generateWithSmartFallback(
      { provider: 'openai', model: 'gpt-4' },
      [{ role: 'user', content: 'What is 2+2?' }]
    );
    
    console.log('✅ Smart fallback result:', result.content);
  } catch (error) {
    console.error('❌ Smart fallback failed:', error.message);
  }
}

async function testCircuitBreaker() {
  console.log('\n⚡ Testing circuit breaker...');
  
  const robustOptions: RobustLLMOptions = {
    circuitBreakerConfig: {
      failureThreshold: 2,
      recoveryTimeoutMs: 3000
    },
    retryConfig: {
      maxRetries: 0 // No retries to trigger circuit breaker faster
    },
    enableLogging: true
  };
  
  // Try to trigger circuit breaker with invalid requests
  for (let i = 0; i < 3; i++) {
    try {
      await llmService.generate({
        model: { provider: 'openai', model: 'invalid-model', apiKey: 'fake-key' },
        messages: [{ role: 'user', content: 'Test' }],
        robustOptions
      });
    } catch (error) {
      console.log(`Attempt ${i + 1} failed:`, error.message);
    }
  }
  
  // Check circuit breaker status
  const status = llmService.getCircuitBreakerStatus('openai');
  console.log('Circuit breaker status:', status);
  
  // Reset circuit breaker
  llmService.resetCircuitBreaker('openai');
  console.log('Circuit breaker reset');
}

async function testRateLimiting() {
  console.log('\n🚦 Testing rate limiting...');
  
  const robustOptions: RobustLLMOptions = {
    rateLimitConfig: {
      requestsPerMinute: 2,
      burstLimit: 1
    },
    enableLogging: true
  };
  
  // Try rapid requests to trigger rate limiting
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`Making request ${i + 1}...`);
      const result = await llmService.generateWithOpenAI('gpt-3.5-turbo', [
        { role: 'user', content: `Request ${i + 1}` }
      ], { robustOptions });
      
      console.log(`✅ Request ${i + 1} successful:`, result.content.substring(0, 50));
    } catch (error) {
      console.log(`⚠️  Request ${i + 1} rate limited:`, error.message);
    }
  }
  
  // Check rate limit status
  const rateLimitStatus = llmService.getRateLimitStatus('openai');
  console.log('Rate limit status:', rateLimitStatus);
}

async function testStreamingWithRobustOptions() {
  console.log('\n📡 Testing streaming with robust options...');
  
  const robustOptions: RobustLLMOptions = {
    timeout: 10000,
    retryConfig: {
      maxRetries: 1
    },
    enableLogging: true
  };
  
  try {
    let fullResponse = '';
    
    for await (const chunk of llmService.generateStream({
      model: { provider: 'openai', model: 'gpt-3.5-turbo' },
      messages: [{ role: 'user', content: 'Count from 1 to 5' }],
      robustOptions
    })) {
      if (chunk.done) {
        console.log('\n✅ Streaming completed. Usage:', chunk.usage);
      } else {
        fullResponse += chunk.content;
        process.stdout.write(chunk.content);
      }
    }
  } catch (error) {
    console.error('\n❌ Streaming failed:', error.message);
  }
}

async function testErrorHandling() {
  console.log('\n🛡️  Testing comprehensive error handling...');
  
  const testCases = [
    {
      name: 'Invalid API Key',
      model: { provider: 'openai', model: 'gpt-3.5-turbo', apiKey: 'invalid-key' }
    },
    {
      name: 'Invalid Model',
      model: { provider: 'openai', model: 'nonexistent-model' }
    },
    {
      name: 'Invalid Provider',
      model: { provider: 'fake-provider' as any, model: 'test' }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      await llmService.generate({
        model: testCase.model,
        messages: [{ role: 'user', content: 'Test' }],
        robustOptions: { enableLogging: true }
      });
    } catch (error) {
      console.log(`${testCase.name} error:`, {
        message: error.message,
        code: error.code,
        provider: error.provider,
        retryable: error.retryable,
        timestamp: error.timestamp
      });
    }
  }
}

async function main() {
  console.log('🧪 Running Enhanced LLM Service Tests\n');
  console.log('='.repeat(50));
  
  try {
    await testBasicGeneration();
    await testRetryMechanism();
    await testFallbackConfiguration();
    await testSmartFallback();
    await testCircuitBreaker();
    await testRateLimiting();
    await testStreamingWithRobustOptions();
    await testErrorHandling();
    
    console.log('\n🎉 All tests completed!');
    console.log('Check the logs above to see how each feature performed.');
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runLLMTests };
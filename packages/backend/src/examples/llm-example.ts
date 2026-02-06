import { llmService } from '@/services/llm';

// Example usage of the LLM service
async function testLLMService() {
  console.log('Testing LLM Service...\n');

  const testMessages = [
    { role: 'system' as const, content: 'You are a helpful assistant.' },
    { role: 'user' as const, content: 'What is the capital of France?' },
  ];

  try {
    // Test OpenAI (if API key is available)
    if (process.env.OPENAI_API_KEY) {
      console.log('🔵 Testing OpenAI...');
      const openaiResult = await llmService.generateWithOpenAI(
        'gpt-3.5-turbo',
        testMessages,
        { temperature: 0.7, maxTokens: 100 }
      );
      console.log('OpenAI Response:', openaiResult.content);
      console.log('Usage:', openaiResult.usage);
      console.log('');
    }

    // Test Anthropic (if API key is available)
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('🟠 Testing Anthropic...');
      const anthropicResult = await llmService.generateWithAnthropic(
        'claude-3-haiku-20240307',
        testMessages,
        { temperature: 0.7, maxTokens: 100 }
      );
      console.log('Anthropic Response:', anthropicResult.content);
      console.log('Usage:', anthropicResult.usage);
      console.log('');
    }

    // Test Google (if API key is available)
    if (process.env.GOOGLE_API_KEY) {
      console.log('🔴 Testing Google...');
      const googleResult = await llmService.generateWithGoogle(
        'gemini-1.0-pro',
        testMessages,
        { temperature: 0.7, maxTokens: 100 }
      );
      console.log('Google Response:', googleResult.content);
      console.log('Usage:', googleResult.usage);
      console.log('');
    }

    // Test OpenRouter (if API key is available)
    if (process.env.OPENROUTER_API_KEY) {
      console.log('🟣 Testing OpenRouter...');
      const openrouterResult = await llmService.generateWithOpenRouter(
        'openai/gpt-3.5-turbo',
        testMessages,
        { temperature: 0.7, maxTokens: 100 }
      );
      console.log('OpenRouter Response:', openrouterResult.content);
      console.log('Usage:', openrouterResult.usage);
      console.log('');
    }

    // Test Ollama (if running locally)
    try {
      console.log('🟢 Testing Ollama...');
      const ollamaResult = await llmService.generateWithOllama(
        'llama3.1',
        testMessages,
        { temperature: 0.7, maxTokens: 100 }
      );
      console.log('Ollama Response:', ollamaResult.content);
      console.log('Usage:', ollamaResult.usage);
      console.log('');
    } catch (error) {
      console.log('Ollama not available (make sure Ollama is running locally)');
      console.log('');
    }

  } catch (error) {
    console.error('Error testing LLM service:', error);
  }
}

// Test streaming functionality
async function testStreamingLLM() {
  console.log('Testing LLM Streaming...\n');

  const testMessages = [
    { role: 'system' as const, content: 'You are a helpful assistant.' },
    { role: 'user' as const, content: 'Write a short poem about AI.' },
  ];

  if (process.env.OPENAI_API_KEY) {
    console.log('🔵 Testing OpenAI streaming...');
    
    try {
      const streamOptions = {
        model: {
          provider: 'openai' as const,
          model: 'gpt-3.5-turbo',
        },
        messages: testMessages,
        temperature: 0.8,
        maxTokens: 200,
      };

      for await (const chunk of llmService.generateStream(streamOptions)) {
        if (chunk.done) {
          console.log('\n✅ Stream completed');
          console.log('Final usage:', chunk.usage);
        } else {
          process.stdout.write(chunk.content);
        }
      }
      console.log('\n');
    } catch (error) {
      console.error('Streaming error:', error);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testLLMService()
    .then(() => testStreamingLLM())
    .catch(console.error);
}

export { testLLMService, testStreamingLLM };
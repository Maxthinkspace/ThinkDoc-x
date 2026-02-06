export type Provider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'ollama' | 'azure';

export interface ModelConfig {
  provider: Provider;
  model: string;
  deployment?: string;
  apiKey?: string;
  baseUrl?: string;
}

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GenerateOptions = {
  model: ModelConfig;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  robustOptions?: RobustLLMOptions;
};

export type LLMResponse = {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type StreamResponse = AsyncIterable<{
  content: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}>;

export type LLMError = {
  message: string;
  code?: string;
  provider: Provider;
  retryable?: boolean;
  statusCode?: number;
  timestamp?: Date;
};

export type RetryConfig = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrorCodes?: string[];
};

export type CircuitBreakerConfig = {
  failureThreshold?: number;
  recoveryTimeoutMs?: number;
  monitoringPeriodMs?: number;
};

export type RateLimitConfig = {
  requestsPerMinute?: number;
  burstLimit?: number;
};

export type FallbackConfig = {
  providers: {
    provider: Provider;
    model: string;
    priority: number;
  }[];
  maxFallbackAttempts?: number;
};

export type RobustLLMOptions = {
  timeout?: number;
  retryConfig?: RetryConfig;
  circuitBreakerConfig?: CircuitBreakerConfig;
  rateLimitConfig?: RateLimitConfig;
  fallbackConfig?: FallbackConfig;
  enableLogging?: boolean;
};
import { generateText, streamText } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { AzureOpenAI } from "openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ollama } from "ollama-ai-provider";

import type {
  Provider,
  ModelConfig,
  GenerateOptions,
  LLMResponse,
  StreamResponse,
  LLMError,
  Message,
  RetryConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  FallbackConfig,
  RobustLLMOptions,
} from "../types/llm";
import { llmConfig } from "../config/llm";

interface CircuitBreakerState {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

interface RateLimitState {
  requests: number[];
  lastReset: number;
}

export class LLMService {
  private circuitBreakers: Map<Provider, CircuitBreakerState> = new Map();
  private rateLimiters: Map<Provider, RateLimitState> = new Map();
  private logger = console; // Can be replaced with proper logger

  private defaultRetryConfig: Required<RetryConfig> = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrorCodes: [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "rate_limit_exceeded",
    ],
  };

  private defaultCircuitBreakerConfig: Required<CircuitBreakerConfig> = {
    failureThreshold: 5,
    recoveryTimeoutMs: 60000,
    monitoringPeriodMs: 300000,
  };

  private defaultRateLimitConfig: Required<RateLimitConfig> = {
    requestsPerMinute: 60,
    burstLimit: 10,
  };

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private isRetryableError(error: any, retryableErrorCodes: string[]): boolean {
    if (error.code && retryableErrorCodes.includes(error.code)) return true;
    if (error.message) {
      const message = error.message.toLowerCase();
      return retryableErrorCodes.some((code) =>
        message.includes(code.toLowerCase())
      );
    }
    return false;
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retryConfig: Required<RetryConfig>,
    provider: Provider
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(
            retryConfig.baseDelayMs *
              Math.pow(retryConfig.backoffMultiplier, attempt - 1),
            retryConfig.maxDelayMs
          );

          this.logger.debug(
            `Retrying ${provider} request (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}) after ${delay}ms delay`
          );
          await this.sleep(delay);
        }

        return await fn();
      } catch (error) {
        lastError = error;

        if (
          attempt === retryConfig.maxRetries ||
          !this.isRetryableError(error, retryConfig.retryableErrorCodes)
        ) {
          break;
        }

        this.logger.warn(
          `Attempt ${attempt + 1} failed for ${provider}:`,
          (error as Error).message
        );
      }
    }

    throw lastError;
  }

  private getCircuitBreakerState(provider: Provider): CircuitBreakerState {
    if (!this.circuitBreakers.has(provider)) {
      this.circuitBreakers.set(provider, {
        state: "CLOSED",
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      });
    }
    return this.circuitBreakers.get(provider)!;
  }

  private updateCircuitBreaker(
    provider: Provider,
    success: boolean,
    config: Required<CircuitBreakerConfig>
  ): void {
    const state = this.getCircuitBreakerState(provider);
    const now = Date.now();

    if (success) {
      if (state.state === "HALF_OPEN") {
        state.state = "CLOSED";
        state.failureCount = 0;
        this.logger.info(
          `Circuit breaker for ${provider} closed after successful request`
        );
      } else if (state.state === "CLOSED") {
        state.failureCount = Math.max(0, state.failureCount - 1);
      }
    } else {
      state.failureCount++;
      state.lastFailureTime = now;

      if (
        state.state === "CLOSED" &&
        state.failureCount >= config.failureThreshold
      ) {
        state.state = "OPEN";
        state.nextAttemptTime = now + config.recoveryTimeoutMs;
        this.logger.warn(
          `Circuit breaker for ${provider} opened after ${state.failureCount} failures`
        );
      } else if (state.state === "HALF_OPEN") {
        state.state = "OPEN";
        state.nextAttemptTime = now + config.recoveryTimeoutMs;
        this.logger.warn(
          `Circuit breaker for ${provider} reopened after failed half-open attempt`
        );
      }
    }
  }

  private async checkCircuitBreaker(
    provider: Provider,
    config: Required<CircuitBreakerConfig>
  ): Promise<void> {
    const state = this.getCircuitBreakerState(provider);
    const now = Date.now();

    if (state.state === "OPEN") {
      if (now >= state.nextAttemptTime) {
        state.state = "HALF_OPEN";
        this.logger.info(
          `Circuit breaker for ${provider} half-opened for testing`
        );
      } else {
        throw new Error(
          `Circuit breaker is OPEN for ${provider}. Next attempt in ${state.nextAttemptTime - now}ms`
        );
      }
    }
  }

  private async checkRateLimit(
    provider: Provider,
    config: Required<RateLimitConfig>
  ): Promise<void> {
    if (!this.rateLimiters.has(provider)) {
      this.rateLimiters.set(provider, {
        requests: [],
        lastReset: Date.now(),
      });
    }

    const state = this.rateLimiters.get(provider)!;
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    // Remove old requests outside the window
    state.requests = state.requests.filter(
      (timestamp) => now - timestamp < windowMs
    );

    // Check burst limit
    if (state.requests.length >= config.burstLimit) {
      const oldestRequest = Math.min(...state.requests);
      const waitTime = windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        this.logger.warn(
          `Rate limit hit for ${provider}, waiting ${waitTime}ms`
        );
        await this.sleep(waitTime);
      }
    }

    // Check requests per minute
    if (state.requests.length >= config.requestsPerMinute) {
      const oldestRequest = Math.min(...state.requests);
      const waitTime = windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        throw new Error(
          `Rate limit exceeded for ${provider}. Try again in ${waitTime}ms`
        );
      }
    }

    state.requests.push(now);
  }

  private async executeWithFallback(
    primaryFn: () => Promise<LLMResponse>,
    fallbackConfig: FallbackConfig | undefined,
    originalOptions: GenerateOptions
  ): Promise<LLMResponse> {
    try {
      return await primaryFn();
    } catch (primaryError) {
      if (!fallbackConfig || !fallbackConfig.providers.length) {
        throw primaryError;
      }

      this.logger.warn(
        "Primary provider failed, attempting fallbacks:",
        (primaryError as Error).message
      );

      const sortedProviders = fallbackConfig.providers
        .sort((a, b) => a.priority - b.priority)
        .slice(
          0,
          fallbackConfig.maxFallbackAttempts || fallbackConfig.providers.length
        );

      let lastError = primaryError;

      for (const fallback of sortedProviders) {
        try {
          this.logger.info(
            `Attempting fallback to ${fallback.provider}:${fallback.model}`
          );

          const fallbackOptions: GenerateOptions = {
            ...originalOptions,
            model: {
              provider: fallback.provider,
              model: fallback.model,
              ...(originalOptions.model.apiKey && { apiKey: originalOptions.model.apiKey }),
              ...(originalOptions.model.baseUrl && { baseUrl: originalOptions.model.baseUrl }),
            },
          };

          return await this.executeProviderRequest(fallbackOptions, false); // No nested fallbacks
        } catch (error) {
          lastError = error;
          this.logger.warn(
            `Fallback ${fallback.provider}:${fallback.model} failed:`,
            (error as Error).message
          );
        }
      }

      throw lastError;
    }
  }

  private getProvider(config: ModelConfig) {
    switch (config.provider) {
      case "openai":
        const openaiApiKey = config.apiKey || llmConfig.OPENAI_API_KEY;
        if (!openaiApiKey) {
          throw new Error("OpenAI API key is required");
        }
        const openaiConfig = {
          apiKey: openaiApiKey,
          ...(config.baseUrl && { baseURL: config.baseUrl }),
        };
        return createOpenAI(openaiConfig)(config.model);

      case "anthropic":
        const anthropicApiKey = config.apiKey || llmConfig.ANTHROPIC_API_KEY;
        if (!anthropicApiKey) {
          throw new Error("Anthropic API key is required");
        }
        const anthropicConfig = {
          apiKey: anthropicApiKey,
          ...(config.baseUrl && { baseURL: config.baseUrl }),
        };
        return createAnthropic(anthropicConfig)(config.model);

      case "google":
        const googleApiKey = config.apiKey || llmConfig.GOOGLE_API_KEY;
        if (!googleApiKey) {
          throw new Error("Google API key is required");
        }
        const googleConfig = {
          apiKey: googleApiKey,
          ...(config.baseUrl && { baseURL: config.baseUrl }),
        };
        return createGoogleGenerativeAI(googleConfig)(config.model);

      case "openrouter":
        const openRouterApiKey = config.apiKey || llmConfig.OPENROUTER_API_KEY;
        if (!openRouterApiKey) {
          throw new Error("OpenRouter API key is required");
        }
        const openRouterConfig = {
          apiKey: openRouterApiKey,
          ...(config.baseUrl && { baseURL: config.baseUrl }),
        };
        return createOpenRouter(openRouterConfig)(config.model);

      case "azure":
        // Azure is handled separately in executeProviderRequest
        // Return null - we'll detect this and use direct Azure API
        return null;

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  private async executeProviderRequest(
    options: GenerateOptions,
    allowFallbacks: boolean = true
  ): Promise<LLMResponse> {
    const { model, robustOptions = {} } = options;
    const {
      timeout = 300_000, // set timeout to 5m
      retryConfig = {},
      circuitBreakerConfig = {},
      rateLimitConfig = {},
      fallbackConfig,
      enableLogging = true,
    } = robustOptions;

    const finalRetryConfig = { ...this.defaultRetryConfig, ...retryConfig };
    const finalCircuitBreakerConfig = {
      ...this.defaultCircuitBreakerConfig,
      ...circuitBreakerConfig,
    };
    const finalRateLimitConfig = {
      ...this.defaultRateLimitConfig,
      ...rateLimitConfig,
    };

    if (enableLogging) {
      this.logger.debug(
        `Executing LLM request to ${model.provider}:${model.model}`
      );
    }

    const executeRequest = async (): Promise<LLMResponse> => {
      // Check circuit breaker
      await this.checkCircuitBreaker(model.provider, finalCircuitBreakerConfig);

      // Check rate limits
      await this.checkRateLimit(model.provider, finalRateLimitConfig);

      // Execute the actual request
      const requestFn = async (): Promise<LLMResponse> => {
        this.validateConfig(model);

        // Handle Azure separately using @azure/openai SDK
        if (model.provider === 'azure') {
          const azureApiKey = model.apiKey || llmConfig.AZURE_OPENAI_API_KEY;
          const azureEndpoint = model.baseUrl || llmConfig.AZURE_OPENAI_ENDPOINT;
          const apiVersion = llmConfig.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
          const deployment = model.deployment || model.model;

          if (!azureApiKey || !azureEndpoint) {
            throw new Error('Azure OpenAI API key and endpoint are required');
          }

          const azureClient = new AzureOpenAI({
            apiKey: azureApiKey,
            endpoint: azureEndpoint,
            apiVersion,
          });

          const messages = options.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
          }));

          const isReasoningModel = deployment.includes('o3') || deployment.includes('o1');
          
          const result = await azureClient.chat.completions.create({
            model: deployment,
            messages,
            ...(options.temperature !== undefined && !isReasoningModel && { temperature: options.temperature }),
            ...(options.maxTokens && { 
              [isReasoningModel ? 'max_completion_tokens' : 'max_tokens']: options.maxTokens 
            }),
          });

          const response: LLMResponse = {
            content: result.choices[0]?.message?.content || '',
          };

          if (result.usage) {
            response.usage = {
              promptTokens: result.usage.prompt_tokens,
              completionTokens: result.usage.completion_tokens,
              totalTokens: result.usage.total_tokens,
            };
          }

          return response;
        }

        // For all other providers, use the AI SDK
        const provider = this.getProvider(model);
        if (!provider) {
          throw new Error(`Provider ${model.provider} returned null`);
        }
        const modelInstance = provider;

        const result = await generateText({
          model: modelInstance,
          messages: options.messages as any,
          ...(options.temperature !== undefined && {
            temperature: options.temperature,
          }),
          ...(options.maxTokens && { maxTokens: options.maxTokens }),
        });

        const response: LLMResponse = {
          content: result.text,
        };
        
        if (result.usage) {
          const usageData = result.usage as any;
          response.usage = {
            promptTokens: usageData.promptTokens ?? usageData.inputTokens ?? 0,
            completionTokens: usageData.completionTokens ?? usageData.outputTokens ?? 0,
            totalTokens: usageData.totalTokens ?? 0,
          };
        }
        
        return response;
      };

      let result: LLMResponse;
      let requestError: any = null;

      try {
        if (timeout > 0) {
          result = await this.withTimeout(requestFn(), timeout);
        } else {
          result = await requestFn();
        }

        // Update circuit breaker on success
        this.updateCircuitBreaker(
          model.provider,
          true,
          finalCircuitBreakerConfig
        );

        if (enableLogging) {
          this.logger.debug(
            `Successfully completed request to ${model.provider}:${model.model}`
          );
        }

        return result;
      } catch (error) {
        // requestError = error;

        // Update circuit breaker on failure
        this.updateCircuitBreaker(
          model.provider,
          false,
          finalCircuitBreakerConfig
        );

        throw this.handleError(error, model.provider);
      }
    };

    if (allowFallbacks && fallbackConfig) {
      return this.executeWithFallback(
        () =>
          this.executeWithRetry(
            executeRequest,
            finalRetryConfig,
            model.provider
          ),
        fallbackConfig,
        options
      );
    } else {
      return this.executeWithRetry(
        executeRequest,
        finalRetryConfig,
        model.provider
      );
    }
  }

  async generate(options: GenerateOptions): Promise<LLMResponse> {
    return this.executeProviderRequest(options);
  }

  private validateConfig(config: ModelConfig): void {
    const requiredKeys: Record<Provider, string | null> = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      google: "GOOGLE_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
      azure: "AZURE_OPENAI_API_KEY",
      ollama: null, // Ollama doesn't require API key
    };

    const requiredKey = requiredKeys[config.provider];
    if (
      requiredKey &&
      !config.apiKey &&
      !llmConfig[requiredKey as keyof typeof llmConfig]
    ) {
      throw new Error(`API key required for ${config.provider} provider`);
    }
  }

  async *generateStream(options: GenerateOptions): StreamResponse {
    const { model, robustOptions = {} } = options;
    const {
      timeout = 300_000, // set timeout to 5m
      retryConfig = {},
      circuitBreakerConfig = {},
      rateLimitConfig = {},
      enableLogging = true,
    } = robustOptions;

    const finalRetryConfig = { ...this.defaultRetryConfig, ...retryConfig };
    const finalCircuitBreakerConfig = {
      ...this.defaultCircuitBreakerConfig,
      ...circuitBreakerConfig,
    };
    const finalRateLimitConfig = {
      ...this.defaultRateLimitConfig,
      ...rateLimitConfig,
    };

    if (enableLogging) {
      this.logger.debug(
        `Executing streaming LLM request to ${model.provider}:${model.model}`
      );
    }

    const executeStreamRequest = async function* (
      this: LLMService
    ): StreamResponse {
      // Check circuit breaker
      await this.checkCircuitBreaker(model.provider, finalCircuitBreakerConfig);

      // Check rate limits
      await this.checkRateLimit(model.provider, finalRateLimitConfig);

      try {
        this.validateConfig(model);
        
        // Handle Azure streaming separately
        if (model.provider === 'azure') {
          const azureApiKey = model.apiKey || llmConfig.AZURE_OPENAI_API_KEY;
          const azureEndpoint = model.baseUrl || llmConfig.AZURE_OPENAI_ENDPOINT;
          const apiVersion = llmConfig.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
          const deployment = model.deployment || model.model;

          if (!azureApiKey || !azureEndpoint) {
            throw new Error('Azure OpenAI API key and endpoint are required');
          }

          const azureClient = new AzureOpenAI({
            apiKey: azureApiKey,
            endpoint: azureEndpoint,
            apiVersion,
          });

          const messages = options.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
          }));

          const isReasoningModel = deployment.includes('o3') || deployment.includes('o1');
          
          const stream = await azureClient.chat.completions.create({
            model: deployment,
            messages,
            stream: true,
            ...(options.temperature !== undefined && !isReasoningModel && { temperature: options.temperature }),
            ...(options.maxTokens && { 
              [isReasoningModel ? 'max_completion_tokens' : 'max_tokens']: options.maxTokens 
            }),
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              yield {
                content,
                done: false,
              };
            }
          }

          yield {
            content: '',
            done: true,
          };

          // Update circuit breaker on success
          this.updateCircuitBreaker(
            model.provider,
            true,
            finalCircuitBreakerConfig
          );

          if (enableLogging) {
            this.logger.debug(
              `Successfully completed Azure streaming request`
            );
          }

          return;
        }

        const provider = this.getProvider(model);
        if (!provider) {
          throw new Error(`Provider ${model.provider} returned null`);
        }
        const modelInstance = provider;

        const result = streamText({
          model: modelInstance,
          messages: options.messages as any,
          ...(options.temperature !== undefined && {
            temperature: options.temperature,
          }),
          ...(options.maxTokens && { maxTokens: options.maxTokens }),
        });

        for await (const chunk of result.textStream) {
          yield {
            content: chunk,
            done: false,
          };
        }

        const usage = await result.usage;
        if (usage) {
          const usageData = usage as any;
          yield {
            content: "",
            done: true,
            usage: {
              promptTokens: usageData.promptTokens ?? usageData.inputTokens ?? 0,
              completionTokens: usageData.completionTokens ?? usageData.outputTokens ?? 0,
              totalTokens: usageData.totalTokens ?? ((usageData.promptTokens ?? usageData.inputTokens ?? 0) + (usageData.completionTokens ?? usageData.outputTokens ?? 0)),
            },
          };
        } else {
          yield {
            content: "",
            done: true,
          };
        }

        // Update circuit breaker on success
        this.updateCircuitBreaker(
          model.provider,
          true,
          finalCircuitBreakerConfig
        );

        if (enableLogging) {
          this.logger.debug(
            `Successfully completed streaming request to ${model.provider}:${model.model}`
          );
        }
      } catch (error) {
        // Update circuit breaker on failure
        this.updateCircuitBreaker(
          model.provider,
          false,
          finalCircuitBreakerConfig
        );
        throw this.handleError(error, model.provider);
      }
    }.bind(this);

    // Apply retry logic to streaming (note: streaming retry is complex, so we'll do basic retry)
    for (let attempt = 0; attempt <= finalRetryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(
            finalRetryConfig.baseDelayMs *
              Math.pow(finalRetryConfig.backoffMultiplier, attempt - 1),
            finalRetryConfig.maxDelayMs
          );

          this.logger.debug(
            `Retrying streaming ${model.provider} request (attempt ${attempt + 1}/${finalRetryConfig.maxRetries + 1}) after ${delay}ms delay`
          );
          await this.sleep(delay);
        }

        yield* executeStreamRequest();
        return; // Success, exit retry loop
      } catch (error) {
        if (
          attempt === finalRetryConfig.maxRetries ||
          !this.isRetryableError(error, finalRetryConfig.retryableErrorCodes)
        ) {
          throw error;
        }

        this.logger.warn(
          `Streaming attempt ${attempt + 1} failed for ${model.provider}:`,
          (error as any).message
        );
      }
    }
  }

  private handleError(error: unknown, provider: Provider): LLMError {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const timestamp = new Date();

    // Determine if error is retryable
    let retryable = false;
    let statusCode: number | undefined;
    let code = "LLM_ERROR";

    if (error instanceof Error) {
      // Check for common retryable errors
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("ETIMEDOUT")
      ) {
        retryable = true;
        code = "TIMEOUT_ERROR";
      } else if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        retryable = true;
        code = "RATE_LIMIT_ERROR";
        statusCode = 429;
      } else if (
        errorMessage.includes("503") ||
        errorMessage.includes("service unavailable")
      ) {
        retryable = true;
        code = "SERVICE_UNAVAILABLE";
        statusCode = 503;
      } else if (
        errorMessage.includes("502") ||
        errorMessage.includes("bad gateway")
      ) {
        retryable = true;
        code = "BAD_GATEWAY";
        statusCode = 502;
      } else if (
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ENOTFOUND")
      ) {
        retryable = true;
        code = "CONNECTION_ERROR";
      }
    }

    const llmError: LLMError = {
      message: errorMessage,
      code,
      provider,
      retryable,
      ...(statusCode && { statusCode }),
      timestamp,
    };

    this.logger.error(`LLM Error [${provider}]:`, {
      message: errorMessage,
      code,
      retryable,
      statusCode,
      timestamp,
    });

    return llmError;
  }

  // Enhanced convenience methods with robust options
  async generateWithOpenAI(
    model: string,
    messages: Message[],
    options?: Partial<GenerateOptions> & { robustOptions?: RobustLLMOptions }
  ): Promise<LLMResponse> {
    return this.generate({
      model: { provider: "openai", model },
      messages,
      ...options,
    });
  }

  async generateWithAnthropic(
    model: string,
    messages: Message[],
    options?: Partial<GenerateOptions> & { robustOptions?: RobustLLMOptions }
  ): Promise<LLMResponse> {
    return this.generate({
      model: { provider: "anthropic", model },
      messages,
      ...options,
    });
  }

  async generateWithGoogle(
    model: string,
    messages: Message[],
    options?: Partial<GenerateOptions> & { robustOptions?: RobustLLMOptions }
  ): Promise<LLMResponse> {
    return this.generate({
      model: { provider: "google", model },
      messages,
      ...options,
    });
  }

  async generateWithOpenRouter(
    model: string,
    messages: Message[],
    options?: Partial<GenerateOptions> & { robustOptions?: RobustLLMOptions }
  ): Promise<LLMResponse> {
    return this.generate({
      model: { provider: "openrouter", model },
      messages,
      ...options,
    });
  }

  async generateWithOllama(
    model: string,
    messages: Message[],
    options?: Partial<GenerateOptions> & { robustOptions?: RobustLLMOptions }
  ): Promise<LLMResponse> {
    return this.generate({
      model: { provider: "ollama", model },
      messages,
      ...options,
    });
  }

  // Utility methods for monitoring and control
  getCircuitBreakerStatus(provider: Provider): {
    state: string;
    failureCount: number;
    nextAttemptTime?: number;
  } {
    const state = this.getCircuitBreakerState(provider);
    return {
      state: state.state,
      failureCount: state.failureCount,
      ...(state.state === "OPEN" && { nextAttemptTime: state.nextAttemptTime }),
    };
  }

  resetCircuitBreaker(provider: Provider): void {
    this.circuitBreakers.set(provider, {
      state: "CLOSED",
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    });
    this.logger.info(`Circuit breaker for ${provider} manually reset`);
  }

  getRateLimitStatus(provider: Provider): {
    requestCount: number;
    lastReset: number;
  } {
    const state = this.rateLimiters.get(provider);
    if (!state) {
      return { requestCount: 0, lastReset: Date.now() };
    }

    // Clean old requests
    const now = Date.now();
    const windowMs = 60000;
    state.requests = state.requests.filter(
      (timestamp) => now - timestamp < windowMs
    );

    return {
      requestCount: state.requests.length,
      lastReset: state.lastReset,
    };
  }

  // Generate with smart fallback configuration
  async generateWithSmartFallback(
    primaryModel: ModelConfig,
    messages: Message[],
    options?: Partial<GenerateOptions>
  ): Promise<LLMResponse> {
    const smartFallbackConfig: FallbackConfig = {
      providers: [
        // Try faster/cheaper models first
        { provider: "openai" as const, model: "gpt-3.5-turbo", priority: 1 },
        {
          provider: "anthropic" as const,
          model: "claude-3-haiku-20240307",
          priority: 2,
        },
        { provider: "google" as const, model: "gemini-1.5-flash", priority: 3 },
        // More powerful models as last resort
        { provider: "openai" as const, model: "gpt-4o", priority: 4 },
        {
          provider: "anthropic" as const,
          model: "claude-3-5-sonnet-20241022",
          priority: 5,
        },
      ].filter((f) => f.provider !== primaryModel.provider), // Exclude primary provider
      maxFallbackAttempts: 2,
    };

    return this.generate({
      model: primaryModel,
      messages,
      ...options,
      robustOptions: {
        ...options?.robustOptions,
        fallbackConfig: smartFallbackConfig,
      },
    });
  }
}

export const llmService = new LLMService();

/**
 * Generating text with automatic JSON parsing
 */
export async function generateWithJsonParsing(config: {
  systemPrompt: string;
  userMessage: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure';
  model: string;
}): Promise<any> {
  const llm = new LLMService();
  
  const response = await llm.generate({
    model: {
      provider: config.provider,
      model: config.model,
    },
    messages: [
      {
        role: 'system',
        content: config.systemPrompt,
      },
      {
        role: 'user',
        content: config.userMessage,
      },
    ],
    temperature: 0.1,
    robustOptions: {
      enableLogging: false,
    },
  });

  // Try to parse JSON from the response
  try {
    const responseText = (response as any).text || (response as any).content || '';
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to parse JSON from LLM response:', error);
    console.error('Response:', response);
    return { terms: [], result: [] };
  }
}

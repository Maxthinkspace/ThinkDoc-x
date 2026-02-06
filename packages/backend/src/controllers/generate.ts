import { jsonrepair } from "jsonrepair";
import { llmService } from "@/services/llm";

interface GenerateOptions {
  model?: string;
  deployment?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: 'azure' | 'openai' | 'anthropic' | 'google' | 'openrouter' | 'ollama';
}

// Default configuration
const DEFAULTS = {
  provider: 'azure' as const,
  model: 'gpt-4o',
  deployment: 'gpt-4o',
};

export const generateTextDirect = async (
  systemPrompt: string, 
  content: string,
  options: GenerateOptions = {}
): Promise<string> => {
  const {
    provider = DEFAULTS.provider,
    model = DEFAULTS.model,
    deployment = options.model || DEFAULTS.deployment,
    temperature,
    maxTokens,
  } = options;

  const response = await llmService.generate({
    model: {
      provider,
      model,
      deployment,
    },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content },
    ],
    ...(temperature !== undefined && { temperature }),
    ...(maxTokens !== undefined && { maxTokens }),
  });

  return response.content;
};

export const parseJsonResponse = (content: string): any => {
  try {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = codeBlockMatch ? codeBlockMatch[1] : content;

    try {
      if (!jsonString) {
        throw new Error("JSON string is missing");
      }
      const repairedJson = jsonrepair(jsonString);
      return JSON.parse(repairedJson);
    } catch (parseError) {
      console.error("JSON repair/parse error:", parseError);
      throw new Error("Failed to parse valid JSON from content");
    }
  } catch (error) {
    console.error("Error extracting JSON:", error);
    throw new Error("Failed to extract JSON from AI response");
  }
};

export const generateTextWithJsonParsing = async (
  systemPrompt: string,
  content: string,
  options: GenerateOptions = {}
): Promise<any> => {
  const response = await generateTextDirect(systemPrompt, content, options);
  return parseJsonResponse(response);
};
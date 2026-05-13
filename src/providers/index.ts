import type { commitloomConfig, LLMProvider } from "../types.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAIProvider } from "./openai.js";
import { OpenRouterProvider } from "./openrouter.js";
import { AnthropicProvider } from "./anthropic.js";

export function createProvider(config: commitloomConfig): LLMProvider {
  switch (config.provider.toLowerCase()) {
    case "ollama":
      return new OllamaProvider();
    case "openai":
      return new OpenAIProvider();
    case "openrouter":
      return new OpenRouterProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      throw new Error(
        `Unknown provider "${config.provider}". Supported: ollama, openai, openrouter, anthropic.`
      );
  }
}

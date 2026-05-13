import { describe, it, expect } from "vitest";
import { createProvider } from "../src/providers/index.js";
import { OllamaProvider } from "../src/providers/ollama.js";
import { OpenAIProvider } from "../src/providers/openai.js";
import { OpenRouterProvider } from "../src/providers/openrouter.js";
import { AnthropicProvider } from "../src/providers/anthropic.js";
import type { commitpilotConfig } from "../src/types.js";

const base: commitpilotConfig = { provider: "ollama", model: "test-model" };

describe("createProvider", () => {
  it("returns OllamaProvider for 'ollama'", () => {
    expect(createProvider({ ...base, provider: "ollama" })).toBeInstanceOf(OllamaProvider);
  });

  it("returns OpenAIProvider for 'openai'", () => {
    expect(createProvider({ ...base, provider: "openai" })).toBeInstanceOf(OpenAIProvider);
  });

  it("returns OpenRouterProvider for 'openrouter'", () => {
    expect(createProvider({ ...base, provider: "openrouter" })).toBeInstanceOf(OpenRouterProvider);
  });

  it("returns AnthropicProvider for 'anthropic'", () => {
    expect(createProvider({ ...base, provider: "anthropic" })).toBeInstanceOf(AnthropicProvider);
  });

  it("is case-insensitive", () => {
    expect(createProvider({ ...base, provider: "Ollama" })).toBeInstanceOf(OllamaProvider);
    expect(createProvider({ ...base, provider: "OPENAI" })).toBeInstanceOf(OpenAIProvider);
    expect(createProvider({ ...base, provider: "OpenRouter" })).toBeInstanceOf(OpenRouterProvider);
    expect(createProvider({ ...base, provider: "Anthropic" })).toBeInstanceOf(AnthropicProvider);
  });

  it("throws for unknown provider with helpful message", () => {
    expect(() => createProvider({ ...base, provider: "groq" })).toThrow(
      'Unknown provider "groq"'
    );
  });

  it("OpenRouterProvider is a subclass of OpenAIProvider", () => {
    const provider = createProvider({ ...base, provider: "openrouter" });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });
});

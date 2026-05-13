import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMRequest } from "../types.js";

export class AnthropicProvider implements LLMProvider {
  async generate(request: LLMRequest): Promise<string> {
    const { system, user, config } = request;
    const apiKey = config.apiKey ?? process.env["ANTHROPIC_API_KEY"];

    if (!apiKey) {
      throw new Error(
        "Anthropic API key is required. Set apiKey in .commitloom.yml or ANTHROPIC_API_KEY env var."
      );
    }

    const baseURL = config.baseUrl?.replace(/\/$/, "");
    const client = new Anthropic({ apiKey, baseURL, timeout: config.timeoutMs ?? 30000 });

    let response;
    try {
      response = await client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens ?? 512,
        temperature: config.temperature ?? 0.2,
        system,
        messages: [{ role: "user", content: user }],
      });
    } catch (err) {
      throw new Error(`Anthropic error: ${(err as Error).message}`);
    }

    const block = response.content.find((c) => c.type === "text");
    return block?.type === "text" ? block.text.trim() : "";
  }
}

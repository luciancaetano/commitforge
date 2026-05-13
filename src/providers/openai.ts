import OpenAI from "openai";
import type { LLMProvider, LLMRequest } from "../types.js";

export class OpenAIProvider implements LLMProvider {
  protected readonly defaultBaseUrl: string = "https://api.openai.com/v1";
  protected readonly providerName: string = "OpenAI";
  protected readonly envKey: string = "OPENAI_API_KEY";

  async generate(request: LLMRequest): Promise<string> {
    const { prompt, config } = request;
    const apiKey = config.apiKey ?? process.env[this.envKey];

    if (!apiKey) {
      throw new Error(
        `${this.providerName} API key is required. Set apiKey in .commitloom.yml or ${this.envKey} env var.`
      );
    }

    const baseURL = (config.baseUrl ?? this.defaultBaseUrl).replace(/\/$/, "");
    const client = new OpenAI({ apiKey, baseURL, timeout: config.timeoutMs ?? 30000 });

    let response;
    try {
      response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: config.temperature ?? 0.2,
        max_tokens: config.maxTokens ?? 512,
      });
    } catch (err) {
      throw new Error(`${this.providerName} error: ${(err as Error).message}`);
    }

    return (response.choices[0]?.message?.content ?? "").trim();
  }
}

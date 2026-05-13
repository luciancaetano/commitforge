import { Ollama } from "ollama";
import type { LLMProvider, LLMRequest } from "../types.js";

export class OllamaProvider implements LLMProvider {
  async generate(request: LLMRequest): Promise<string> {
    const { system, user, config } = request;
    const host = (config.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");

    const client = new Ollama({ host });

    let response;
    try {
      response = await client.chat({
        model: config.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
        options: {
          temperature: config.temperature ?? 0.2,
          num_predict: config.maxTokens ?? 512,
        },
      });
    } catch (err) {
      const msg = (err as Error).message;
      throw new Error(`Ollama error (${host}): ${msg}`);
    }

    return (response.message.content ?? "").trim();
  }
}

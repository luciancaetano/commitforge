export interface commitloomConfig {
  provider: string;
  model: string;
  baseUrl?: string;
  apiKey?: string | null;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface GitContext {
  diff: string;
  stat: string;
  recentLog: string;
  branch: string | null;
  repoRoot: string;
}

export interface LLMRequest {
  prompt: string;
  config: commitloomConfig;
}

export interface LLMProvider {
  generate(request: LLMRequest): Promise<string>;
}

export interface GenerateOptions {
  config?: string;
  instructions?: string;
  verbose?: boolean;
}

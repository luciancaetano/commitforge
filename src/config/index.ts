import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { commitloomConfig } from "../types.js";

const CONFIG_FILE = ".commitloom.yml";
const INSTRUCTIONS_FILE = ".commitloom.md";

const DEFAULTS: commitloomConfig = {
  provider: "ollama",
  model: "qwen2.5-coder:7b",
  baseUrl: undefined,
  apiKey: null,
  timeoutMs: 30000,
  temperature: 0.2,
  maxTokens: 512,
};

export function loadConfig(repoRoot: string, overridePath?: string): commitloomConfig {
  const configPath = overridePath ?? path.join(repoRoot, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULTS };
  }

  let raw: unknown;
  try {
    raw = yaml.load(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse ${configPath}: ${(err as Error).message}`);
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`Invalid config file at ${configPath}: expected a YAML mapping.`);
  }

  const file = raw as Record<string, unknown>;

  return {
    provider: typeof file["provider"] === "string" ? file["provider"] : DEFAULTS.provider,
    model: typeof file["model"] === "string" ? file["model"] : DEFAULTS.model,
    baseUrl: typeof file["baseUrl"] === "string" ? file["baseUrl"] : DEFAULTS.baseUrl,
    apiKey:
      file["apiKey"] === null || file["apiKey"] === undefined
        ? null
        : typeof file["apiKey"] === "string"
          ? file["apiKey"]
          : null,
    timeoutMs: typeof file["timeoutMs"] === "number" ? file["timeoutMs"] : DEFAULTS.timeoutMs,
    temperature:
      typeof file["temperature"] === "number" ? file["temperature"] : DEFAULTS.temperature,
    maxTokens:
      typeof file["maxTokens"] === "number" ? file["maxTokens"] : DEFAULTS.maxTokens,
  };
}

export function loadInstructions(repoRoot: string, overridePath?: string): string | null {
  const instructionsPath = overridePath ?? path.join(repoRoot, INSTRUCTIONS_FILE);

  if (!fs.existsSync(instructionsPath)) {
    return null;
  }

  try {
    return fs.readFileSync(instructionsPath, "utf8").trim();
  } catch (err) {
    throw new Error(`Failed to read ${instructionsPath}: ${(err as Error).message}`);
  }
}

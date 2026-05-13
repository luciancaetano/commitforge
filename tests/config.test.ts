import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadConfig, loadInstructions } from "../src/config/index.js";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-config-test-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns defaults when no file exists", () => {
    const cfg = loadConfig(dir);
    expect(cfg.provider).toBe("ollama");
    expect(cfg.model).toBe("qwen2.5-coder:7b");
    expect(cfg.timeoutMs).toBe(30000);
    expect(cfg.temperature).toBe(0.2);
    expect(cfg.maxTokens).toBe(512);
    expect(cfg.apiKey).toBeNull();
    expect(cfg.baseUrl).toBeUndefined();
  });

  it("parses all fields from a valid YAML file", () => {
    fs.writeFileSync(
      path.join(dir, ".commitloom.yml"),
      [
        "provider: openai",
        "model: gpt-4o-mini",
        "apiKey: sk-test",
        "baseUrl: https://api.openai.com/v1",
        "timeoutMs: 5000",
        "temperature: 0.7",
        "maxTokens: 256",
      ].join("\n")
    );
    const cfg = loadConfig(dir);
    expect(cfg.provider).toBe("openai");
    expect(cfg.model).toBe("gpt-4o-mini");
    expect(cfg.apiKey).toBe("sk-test");
    expect(cfg.baseUrl).toBe("https://api.openai.com/v1");
    expect(cfg.timeoutMs).toBe(5000);
    expect(cfg.temperature).toBe(0.7);
    expect(cfg.maxTokens).toBe(256);
  });

  it("uses defaults for missing fields", () => {
    fs.writeFileSync(path.join(dir, ".commitloom.yml"), "provider: anthropic\n");
    const cfg = loadConfig(dir);
    expect(cfg.provider).toBe("anthropic");
    expect(cfg.model).toBe("qwen2.5-coder:7b");
    expect(cfg.timeoutMs).toBe(30000);
  });

  it("treats yaml null as null for apiKey", () => {
    fs.writeFileSync(path.join(dir, ".commitloom.yml"), "apiKey: null\n");
    expect(loadConfig(dir).apiKey).toBeNull();
  });

  it("treats missing apiKey as null", () => {
    fs.writeFileSync(path.join(dir, ".commitloom.yml"), "provider: ollama\n");
    expect(loadConfig(dir).apiKey).toBeNull();
  });

  it("throws on malformed YAML", () => {
    fs.writeFileSync(path.join(dir, ".commitloom.yml"), ": bad: yaml: [\n");
    expect(() => loadConfig(dir)).toThrow();
  });

  it("throws when config root is not a mapping", () => {
    fs.writeFileSync(path.join(dir, ".commitloom.yml"), "- item1\n- item2\n");
    expect(() => loadConfig(dir)).toThrow("expected a YAML mapping");
  });

  it("uses override path instead of repo root", () => {
    const custom = path.join(dir, "custom.yml");
    fs.writeFileSync(custom, "provider: openrouter\nmodel: mistral\n");
    const cfg = loadConfig("/nonexistent", custom);
    expect(cfg.provider).toBe("openrouter");
    expect(cfg.model).toBe("mistral");
  });

  it("ignores non-string values for provider and model", () => {
    fs.writeFileSync(
      path.join(dir, ".commitloom.yml"),
      "provider: 123\nmodel: true\n"
    );
    const cfg = loadConfig(dir);
    expect(cfg.provider).toBe("ollama");
    expect(cfg.model).toBe("qwen2.5-coder:7b");
  });
});

describe("loadInstructions", () => {
  it("returns null when no file exists", () => {
    expect(loadInstructions(dir)).toBeNull();
  });

  it("returns trimmed file content", () => {
    fs.writeFileSync(path.join(dir, ".commitloom.md"), "  # My rules\n\n");
    expect(loadInstructions(dir)).toBe("# My rules");
  });

  it("uses override path instead of repo root", () => {
    const custom = path.join(dir, "rules.md");
    fs.writeFileSync(custom, "custom instructions");
    expect(loadInstructions("/nonexistent", custom)).toBe("custom instructions");
  });
});

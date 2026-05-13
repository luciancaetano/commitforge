import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

vi.mock("../src/git/index.js", () => ({ findRepoRoot: vi.fn() }));

import { findRepoRoot } from "../src/git/index.js";
import { runInit } from "../src/commands/init.js";

const mockRoot = vi.mocked(findRepoRoot);

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-init-test-"));
  mockRoot.mockReturnValue(dir);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("runInit — file creation", () => {
  it("creates .commitloom.yml", () => {
    runInit();
    expect(fs.existsSync(path.join(dir, ".commitloom.yml"))).toBe(true);
  });

  it("creates .commitloom.md", () => {
    runInit();
    expect(fs.existsSync(path.join(dir, ".commitloom.md"))).toBe(true);
  });

  it("generated .commitloom.yml contains required fields", () => {
    runInit();
    const content = fs.readFileSync(path.join(dir, ".commitloom.yml"), "utf8");
    expect(content).toContain("provider:");
    expect(content).toContain("model:");
    expect(content).toContain("timeoutMs:");
    expect(content).toContain("temperature:");
  });

  it("generated .commitloom.md contains Conventional Commits spec", () => {
    runInit();
    const content = fs.readFileSync(path.join(dir, ".commitloom.md"), "utf8");
    expect(content).toContain("Conventional Commits");
    expect(content).toContain("feat");
    expect(content).toContain("fix");
    expect(content).toContain("BREAKING CHANGE");
  });
});

describe("runInit — idempotency", () => {
  it("does not overwrite existing .commitloom.md", () => {
    const mdPath = path.join(dir, ".commitloom.md");
    fs.writeFileSync(mdPath, "my custom rules");
    runInit();
    expect(fs.readFileSync(mdPath, "utf8")).toBe("my custom rules");
  });

  it("does not overwrite existing .commitloom.yml", () => {
    const ymlPath = path.join(dir, ".commitloom.yml");
    fs.writeFileSync(ymlPath, "provider: openai\n");
    runInit();
    expect(fs.readFileSync(ymlPath, "utf8")).toBe("provider: openai\n");
  });

  it("is safe to run multiple times", () => {
    runInit();
    const yml = fs.readFileSync(path.join(dir, ".commitloom.yml"), "utf8");
    const md = fs.readFileSync(path.join(dir, ".commitloom.md"), "utf8");
    runInit();
    expect(fs.readFileSync(path.join(dir, ".commitloom.yml"), "utf8")).toBe(yml);
    expect(fs.readFileSync(path.join(dir, ".commitloom.md"), "utf8")).toBe(md);
  });
});

describe("runInit — .gitignore", () => {
  it("creates .gitignore with /.commitloom.yml when none exists", () => {
    runInit();
    const content = fs.readFileSync(path.join(dir, ".gitignore"), "utf8");
    expect(content).toContain("/.commitloom.yml");
  });

  it("appends to an existing .gitignore without removing other entries", () => {
    const gitignorePath = path.join(dir, ".gitignore");
    fs.writeFileSync(gitignorePath, "node_modules/\ndist/\n");
    runInit();
    const content = fs.readFileSync(gitignorePath, "utf8");
    expect(content).toContain("node_modules/");
    expect(content).toContain("dist/");
    expect(content).toContain("/.commitloom.yml");
  });

  it("does not duplicate the entry if already present", () => {
    const gitignorePath = path.join(dir, ".gitignore");
    fs.writeFileSync(gitignorePath, "/.commitloom.yml\n");
    runInit();
    const lines = fs
      .readFileSync(gitignorePath, "utf8")
      .split("\n")
      .filter((l) => l.includes(".commitloom.yml"));
    expect(lines).toHaveLength(1);
  });

  it("does not duplicate when entry exists without leading slash", () => {
    const gitignorePath = path.join(dir, ".gitignore");
    fs.writeFileSync(gitignorePath, ".commitloom.yml\n");
    runInit();
    const lines = fs
      .readFileSync(gitignorePath, "utf8")
      .split("\n")
      .filter((l) => l.includes(".commitloom.yml"));
    expect(lines).toHaveLength(1);
  });
});

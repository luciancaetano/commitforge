import { describe, it, expect } from "vitest";
import { buildPrompt } from "../src/prompt.js";
import type { GitContext } from "../src/types.js";

const base: GitContext = {
  diff: 'diff --git a/foo.ts b/foo.ts\n+const x = 1',
  branch: "main",
  repoRoot: "/tmp/repo",
};

describe("buildPrompt", () => {
  it("includes the branch name", () => {
    expect(buildPrompt(base, null)).toContain("Current branch: main");
  });

  it('shows "unknown" when branch is null', () => {
    expect(buildPrompt({ ...base, branch: null }, null)).toContain(
      "Current branch: unknown"
    );
  });

  it("includes the diff content", () => {
    expect(buildPrompt(base, null)).toContain(base.diff);
  });

  it("uses provided instructions when given", () => {
    const prompt = buildPrompt(base, "Always use emoji prefixes.");
    expect(prompt).toContain("Always use emoji prefixes.");
  });

  it("falls back to default instructions when none provided", () => {
    const prompt = buildPrompt(base, null);
    expect(prompt).toContain("Conventional Commits");
  });

  it("falls back to default instructions for empty string", () => {
    const prompt = buildPrompt(base, "");
    expect(prompt).toContain("Conventional Commits");
  });

  it("labels the diff section as staged", () => {
    expect(buildPrompt(base, null)).toContain("git diff --cached");
  });

  it("includes the output-only instruction", () => {
    expect(buildPrompt(base, null)).toContain(
      "Output only the commit message"
    );
  });
});

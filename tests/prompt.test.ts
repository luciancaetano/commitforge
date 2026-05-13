import { describe, it, expect } from "vitest";
import { buildPrompt, sanitizeMessage } from "../src/prompt.js";
import type { GitContext } from "../src/types.js";

const base: GitContext = {
  diff: 'diff --git a/foo.ts b/foo.ts\n+const x = 1',
  stat: " foo.ts | 1 +\n 1 file changed, 1 insertion(+)",
  recentLog: "abc1234 feat(auth): add login\ndef5678 fix: handle edge case",
  branch: "main",
  repoRoot: "/tmp/repo",
};

describe("buildPrompt", () => {
  it("returns system and user parts", () => {
    const result = buildPrompt(base, null);
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
  });

  it("uses default system message when no instructions given", () => {
    const { system } = buildPrompt(base, null);
    expect(system).toContain("commit message generator");
  });

  it("uses custom system from frontmatter", () => {
    const instructions = "---\nsystem: \"You are a senior engineer.\"\nlanguage: en\n---\nWrite commits.";
    const { system } = buildPrompt(base, instructions);
    expect(system).toBe("You are a senior engineer.");
  });

  it("includes the branch name in user message", () => {
    expect(buildPrompt(base, null).user).toContain("Branch: main");
  });

  it('shows "unknown" when branch is null', () => {
    expect(buildPrompt({ ...base, branch: null }, null).user).toContain("Branch: unknown");
  });

  it("includes the diff content in user message", () => {
    expect(buildPrompt(base, null).user).toContain(base.diff);
  });

  it("includes the stat summary in user message", () => {
    const { user } = buildPrompt(base, null);
    expect(user).toContain("Changed files");
    expect(user).toContain("foo.ts");
  });

  it("includes recent log with indentation in user message", () => {
    const { user } = buildPrompt(base, null);
    expect(user).toContain("Recent commits:");
    expect(user).toContain("  abc1234 feat(auth): add login");
  });

  it("omits recent log section when log is empty", () => {
    const { user } = buildPrompt({ ...base, recentLog: "" }, null);
    expect(user).not.toContain("Recent commits:");
  });

  it("omits stat section when stat is empty", () => {
    const { user } = buildPrompt({ ...base, stat: "" }, null);
    expect(user).not.toContain("Changed files");
  });

  it("uses provided instructions when given", () => {
    const instructions = "---\nlanguage: en\n---\n\nAlways use emoji prefixes.";
    expect(buildPrompt(base, instructions).user).toContain("Always use emoji prefixes.");
  });

  it("falls back to default instructions when none provided", () => {
    expect(buildPrompt(base, null).user).toContain("Conventional Commits");
  });

  it("falls back to default instructions for empty string", () => {
    expect(buildPrompt(base, "").user).toContain("Conventional Commits");
  });

  it("labels the diff section with -M flag", () => {
    expect(buildPrompt(base, null).user).toContain("git diff --cached -M");
  });

  it("includes the output-only instruction", () => {
    expect(buildPrompt(base, null).user).toContain("Output only the commit message");
  });

  it("injects test type hint when all files are test files", () => {
    const testCtx: GitContext = {
      ...base,
      stat: " foo.test.ts | 2 ++\n 1 file changed",
    };
    expect(buildPrompt(testCtx, null).user).toContain("strongly prefer type `test`");
  });

  it("injects docs type hint when all files are markdown", () => {
    const docsCtx: GitContext = {
      ...base,
      stat: " README.md | 5 +++++\n 1 file changed",
      diff: 'diff --git a/README.md b/README.md\n+# new section',
    };
    expect(buildPrompt(docsCtx, null).user).toContain("strongly prefer type `docs`");
  });

  it("does not inject type hint for mixed files", () => {
    const { user } = buildPrompt(base, null);
    expect(user).not.toContain("strongly prefer type");
  });
});

describe("sanitizeMessage", () => {
  it("returns plain message unchanged", () => {
    expect(sanitizeMessage("feat(cli): add feature")).toBe("feat(cli): add feature");
  });

  it("strips surrounding backticks", () => {
    expect(sanitizeMessage("`feat(cli): add feature`")).toBe("feat(cli): add feature");
  });

  it("strips fenced code block", () => {
    expect(sanitizeMessage("```\nfeat(cli): add feature\n```")).toBe("feat(cli): add feature");
  });

  it("strips 'commit message:' prefix", () => {
    expect(sanitizeMessage("commit message: feat(cli): add feature")).toBe("feat(cli): add feature");
  });

  it("strips 'Here is the commit:' prefix", () => {
    expect(sanitizeMessage("Here is the commit: fix(parser): handle null")).toBe("fix(parser): handle null");
  });

  it("takes only the first non-empty line", () => {
    expect(sanitizeMessage("feat(cli): add feature\n\nSome explanation")).toBe("feat(cli): add feature");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeMessage("  feat(cli): add feature  ")).toBe("feat(cli): add feature");
  });
});

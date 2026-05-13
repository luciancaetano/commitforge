import * as yaml from "js-yaml";
import type { GitContext, LLMRequest, PromptMeta, commitloomConfig } from "./types.js";

const DEFAULT_SYSTEM = "You are a git commit message generator.";

const DEFAULT_INSTRUCTIONS = `Generate a concise, descriptive git commit message following the Conventional Commits format.
Use one of these types: feat, fix, docs, style, refactor, test, chore, perf, ci, build.
Write in the imperative mood (e.g., "add feature" not "added feature").
Keep the subject line under 72 characters.
Do not include explanations or markdown — output only the commit message.`;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseFrontmatter(raw: string): { meta: PromptMeta; body: string; found: boolean } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: raw, found: false };
  try {
    const meta = (yaml.load(match[1]) as PromptMeta) ?? {};
    return { meta, body: match[2].trim(), found: true };
  } catch {
    return { meta: {}, body: raw, found: false };
  }
}

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{([\w-]+)\}\}/g, (match, key: string) => params[key] ?? match);
}

const TEST_FILE_RE = /\.(test|spec)\.[jt]sx?$|[/\\]__tests__[/\\]/;
const DOCS_FILE_RE = /\.(md|mdx|rst|txt)$/i;
const CI_FILE_RE = /^\.github[/\\]|^\.gitlab-ci|^Jenkinsfile|^\.circleci[/\\]/i;
const LOCK_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"]);

function detectTypeHint(stat: string, diff: string): string | null {
  const files = stat
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((l) => l.trim().split("|")[0].trim())
    .filter(Boolean);

  if (files.length === 0) return null;

  if (files.every((f) => TEST_FILE_RE.test(f)))
    return "All changed files are test files — strongly prefer type `test`.";

  if (files.every((f) => DOCS_FILE_RE.test(f)))
    return "All changed files are documentation — strongly prefer type `docs`.";

  if (files.every((f) => CI_FILE_RE.test(f)))
    return "All changed files are CI/CD configuration — strongly prefer type `ci`.";

  if (files.every((f) => LOCK_FILES.has(f) || f === "package.json")) {
    if (diff.includes('"version"') && files.length === 1 && files[0] === "package.json")
      return "Only package.json changed with a version bump — strongly prefer type `chore(package)`.";
    return "Only dependency lock/manifest files changed — strongly prefer type `chore(deps)`.";
  }

  return null;
}

export function sanitizeMessage(raw: string): string {
  let msg = raw.trim();

  // Strip fenced code blocks
  const fenced = msg.match(/^```[^\n]*\n?([\s\S]*?)\n?```$/m);
  if (fenced) msg = fenced[1].trim();

  // Strip surrounding single backticks
  if (msg.startsWith("`") && msg.endsWith("`") && msg.length > 2)
    msg = msg.slice(1, -1).trim();

  // Strip common prose prefixes
  msg = msg.replace(
    /^(commit message|here[''']?s|here is)(?: the| your)?(?: commit(?: message)?)?[:\s]+/i,
    ""
  ).trim();

  // Take the first non-empty line
  return msg.split("\n").find((l) => l.trim().length > 0)?.trim() ?? msg;
}

export function buildPrompt(
  gitContext: GitContext,
  instructions: string | null,
  params: Record<string, string> = {}
): { system: string; user: string } {
  const { meta, body, found } = parseFrontmatter(instructions?.trim() ?? "");

  if (instructions && !found) {
    throw new Error(
      ".commitloom.md is missing the YAML frontmatter header.\n\n" +
      "Add a frontmatter block at the top of the file:\n\n" +
      "  ---\n" +
      "  system: \"You are a git commit message generator.\"\n" +
      "  language: en\n" +
      "  ---\n\n" +
      "Run `cloom init` in a new repo to see a full example."
    );
  }

  const system = meta.system ?? DEFAULT_SYSTEM;

  const rawBody = body || DEFAULT_INSTRUCTIONS;
  const effectiveBody = Object.keys(params).length > 0 ? interpolate(rawBody, params) : rawBody;

  const languageNote = meta.language
    ? `IMPORTANT: Write the commit message in ${meta.language}.`
    : "IMPORTANT: Write the commit message in the exact same language as the instructions above.";

  const finalLine = meta.final
    ?? (meta.language
      ? `Generate the commit message now in ${meta.language}. Output only the commit message — a single line, no explanation.`
      : "Generate the commit message now in the same language as the instructions. Output only the commit message — a single line, no explanation.");

  const parts: string[] = [
    "## Instructions",
    effectiveBody,
    "",
    languageNote,
  ];

  if (Object.keys(params).length > 0) {
    parts.push("", "## Context variables");
    for (const [key, value] of Object.entries(params)) {
      parts.push(`${key}: ${value}`);
    }
  }

  const typeHint = detectTypeHint(gitContext.stat ?? "", gitContext.diff);
  if (typeHint) {
    parts.push("", "## Type hint", typeHint);
  }

  parts.push(
    "",
    "## Repository Context",
    `Branch: ${gitContext.branch ?? "unknown"}`,
  );

  if (gitContext.recentLog) {
    parts.push("Recent commits:");
    parts.push(
      gitContext.recentLog
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
    );
  }

  if (gitContext.stat) {
    parts.push("", "## Changed files", gitContext.stat);
  }

  parts.push(
    "",
    "## Staged changes (git diff --cached -M):",
    "```diff",
    gitContext.diff,
    "```",
    "",
    finalLine
  );

  return { system, user: parts.join("\n") };
}

export function buildRegeneratePrompt(
  base: { system: string; user: string },
  current: string,
  feedback: string
): { system: string; user: string } {
  const user = [
    base.user,
    "---",
    `Previously generated message: ${current}`,
    `User feedback: ${feedback}`,
    "Generate a new commit message incorporating this feedback. Single line only. Use the same language as the instructions.",
  ].join("\n\n");

  return { system: base.system, user };
}

// Re-export for providers that need a plain LLMRequest
export function toRequest(
  built: { system: string; user: string },
  config: commitloomConfig
): LLMRequest {
  return { system: built.system, user: built.user, config };
}

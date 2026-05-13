import type { GitContext } from "./types.js";

const DEFAULT_INSTRUCTIONS = `Generate a concise, descriptive git commit message following the Conventional Commits format.
Use one of these types: feat, fix, docs, style, refactor, test, chore, perf, ci, build.
Write in the imperative mood (e.g., "add feature" not "added feature").
Keep the subject line under 72 characters.
Do not include explanations or markdown — output only the commit message.`;

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{([\w-]+)\}\}/g, (match, key: string) => params[key] ?? match);
}

export function buildPrompt(
  gitContext: GitContext,
  instructions: string | null,
  params: Record<string, string> = {}
): string {
  const raw = instructions?.trim() || DEFAULT_INSTRUCTIONS;
  const effectiveInstructions = Object.keys(params).length > 0 ? interpolate(raw, params) : raw;

  const parts: string[] = [
    "You are a git commit message generator.",
    "",
    "## Instructions",
    effectiveInstructions,
  ];

  if (Object.keys(params).length > 0) {
    parts.push("", "## Context variables");
    for (const [key, value] of Object.entries(params)) {
      parts.push(`${key}: ${value}`);
    }
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
    parts.push("");
    parts.push("## Changed files");
    parts.push(gitContext.stat);
  }

  parts.push(
    "",
    "## Staged changes (git diff --cached -M):",
    "```diff",
    gitContext.diff,
    "```",
    "",
    "Generate the commit message now. Output only the commit message — a single line, no explanation."
  );

  return parts.join("\n");
}

import * as readline from "readline";
import { execSync } from "child_process";
import type { GenerateOptions, commitloomConfig, GitContext, LLMProvider } from "../types.js";
import { collectGitContext } from "../git/index.js";
import { loadConfig, loadInstructions } from "../config/index.js";
import { buildPrompt, buildRegeneratePrompt, sanitizeMessage } from "../prompt.js";
import { createProvider } from "../providers/index.js";

// ── input helpers ──────────────────────────────────────────────────────────────

function pressKey(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stderr.write(prompt);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.once("data", (chunk: string) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      const key = chunk[0] ?? "";
      process.stderr.write(key === "\r" || key === "\n" ? "" : key + "\n");
      resolve(key.toLowerCase());
    });
  });
}

function readLine(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function editLine(current: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });
    rl.question("Edit: ", (answer) => {
      rl.close();
      resolve(answer.length > 0 ? answer : current);
    });
    rl.write(current);
  });
}

// ── llm refinement ─────────────────────────────────────────────────────────────

async function regenerate(
  provider: LLMProvider,
  config: commitloomConfig,
  gitContext: GitContext,
  instructions: string | null,
  params: Record<string, string>,
  current: string
): Promise<string> {
  const feedback = await readLine("What should change? ");
  if (!feedback) return current;

  const base = buildPrompt(gitContext, instructions, params);
  const regen = buildRegeneratePrompt(base, current, feedback);

  process.stderr.write("Regenerating...\n");
  const raw = await provider.generate({ ...regen, config });
  return sanitizeMessage(raw) || current;
}

// ── git ────────────────────────────────────────────────────────────────────────

function doCommit(repoRoot: string, message: string): void {
  execSync("git commit -F -", {
    cwd: repoRoot,
    input: message,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

// ── main ───────────────────────────────────────────────────────────────────────

function printMessage(message: string): void {
  const bar = "─".repeat(60);
  process.stderr.write(`\n${bar}\n`);
  process.stdout.write(message + "\n");
  process.stderr.write(`${bar}\n`);
}

export async function runCommitCommand(options: GenerateOptions): Promise<void> {
  const gitContext = collectGitContext();
  const config = loadConfig(gitContext.repoRoot, options.config);
  const instructions = loadInstructions(gitContext.repoRoot, options.instructions);
  const params = options.params ?? {};

  if (options.verbose) {
    process.stderr.write(`Provider: ${config.provider} / ${config.model}\n`);
    process.stderr.write(`Branch: ${gitContext.branch ?? "unknown"}\n`);
    process.stderr.write(`Staged diff: ${gitContext.diff.length} chars\n`);
    if (Object.keys(params).length > 0) {
      process.stderr.write(`Params: ${JSON.stringify(params)}\n`);
    }
  }

  process.stderr.write("Generating commit message...\n");

  const provider = createProvider(config);
  const built = buildPrompt(gitContext, instructions, params);
  const raw = await provider.generate({ ...built, config });
  let message = sanitizeMessage(raw);

  if (!message) {
    throw new Error("LLM returned an empty response. Check your provider configuration.");
  }

  while (true) {
    printMessage(message);
    process.stderr.write("\n[y] commit  [e] edit  [r] regenerate  [n] abort\n");

    const key = await pressKey("> ");

    if (key === "y") {
      doCommit(gitContext.repoRoot, message);
      return;
    }

    if (key === "n" || key === "q" || key === "") {
      process.stderr.write("Aborted.\n");
      process.exit(0);
    }

    if (key === "e") {
      process.stderr.write("\n");
      message = await editLine(message);
      continue;
    }

    if (key === "r") {
      process.stderr.write("\n");
      message = await regenerate(provider, config, gitContext, instructions, params, message);
      continue;
    }
  }
}

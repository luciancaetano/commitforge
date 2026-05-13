#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runCommitCommand } from "./commands/commit.js";
import { runInstall, runUninstall } from "./commands/install.js";
import type { GenerateOptions } from "./types.js";

const MASCOT = `
         ✦   ˚   ✦
        ╭─────────╮
        │  ◕   ◕  │
        ╰────┬────╯
  ◉━━━━━━━━━━┻━━━━━━━━━━◉
  ┃   ╭─────────────╮   ┃
  ┃   │ ●  ───────  │   ┃
  ┃   │    ───────  │   ┃
  ┃   │    ─────    │   ┃
  ┃   │ ●  ───────  │   ┃
  ┃   ╰─────────────╯   ┃
  ◉━━━━━━━━━━━━━━━━━━━━━◉

    commitloom · git loom · weave your commits
`;

function parseExtraParams(args: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const raw = args[i];
    if (!raw.startsWith("-")) continue;
    const stripped = raw.replace(/^-+/, "");
    if (stripped.includes("=")) {
      const eq = stripped.indexOf("=");
      params[stripped.slice(0, eq)] = stripped.slice(eq + 1);
    } else {
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        params[stripped] = next;
        i++;
      } else {
        params[stripped] = "true";
      }
    }
  }
  return params;
}

// Known flags/options for the commit command — everything else is a context param.
const COMMIT_KNOWN_FLAGS = new Set([
  "--config", "-c",
  "--instructions", "-i",
  "--verbose", "-v",
  "--help", "-h",
  "--version", "-V",
]);
const COMMIT_OPTS_WITH_VALUE = new Set(["--config", "-c", "--instructions", "-i"]);

function splitArgv(rawArgv: string[]): { argv: string[]; params: Record<string, string> } {
  // Explicit -- separator takes priority.
  const ddIdx = rawArgv.indexOf("--");
  if (ddIdx >= 0) {
    return {
      argv: rawArgv.slice(0, ddIdx),
      params: parseExtraParams(rawArgv.slice(ddIdx + 1)),
    };
  }

  // Only intercept when the commit subcommand is being invoked.
  const cmdIdx = rawArgv.findIndex((a, i) => i >= 2 && (a === "c" || a === "commit"));
  if (cmdIdx < 0) return { argv: rawArgv, params: {} };

  const before = rawArgv.slice(0, cmdIdx + 1);
  const rest = rawArgv.slice(cmdIdx + 1);

  const clean: string[] = [];
  const extra: string[] = [];
  let i = 0;
  while (i < rest.length) {
    const arg = rest[i];
    if (arg.startsWith("-") && !COMMIT_KNOWN_FLAGS.has(arg)) {
      extra.push(arg);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        extra.push(next);
        i += 2;
        continue;
      }
    } else {
      clean.push(arg);
      if (COMMIT_OPTS_WITH_VALUE.has(arg) && rest[i + 1] !== undefined) {
        clean.push(rest[i + 1]);
        i += 2;
        continue;
      }
    }
    i++;
  }

  return { argv: [...before, ...clean], params: parseExtraParams(extra) };
}

const { argv, params: extraParams } = splitArgv(process.argv);

const program = new Command();

program
  .name("commitloom")
  .description("AI-powered git commit message generator")
  .version("1.0.0")
  .addHelpText("before", MASCOT)
  .addHelpText(
    "after",
    `
Get started:
  cloom install              register 'git loom' as a native git subcommand
  cloom init                 create .commitloom.yml and .commitloom.md
  git loom                   generate and confirm a commit

Context variables:
  Pass arbitrary key/value pairs after -- to inject runtime context into the
  LLM prompt. Use {{key}} placeholders in .commitloom.md to reference them.

  Examples:
    git loom -- --task-id 1001
    git loom -- --ticket PROJ-42 --scope auth
    git loom -- --task-id=1001 --reviewer alice

  Boolean flags (no value) are passed as "true":
    git loom -- --breaking-change`
  )
  .action(() => {
    program.help({ error: false });
  });

program
  .command("init")
  .description("Initialize commitloom in the current repository")
  .action(() => {
    try {
      runInit();
    } catch (err) {
      process.stderr.write(`Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program
  .command("commit")
  .alias("c")
  .description("Generate a commit message, confirm, and run git commit (also: git loom)")
  .option("-c, --config <path>", "Path to .commitloom.yml config file")
  .option("-i, --instructions <path>", "Path to .commitloom.md instructions file")
  .option("-v, --verbose", "Print debug info to stderr")
  .addHelpText(
    "after",
    `
Tip: after 'cloom install', use 'git loom' instead of 'cloom c'.

Context variables:
  Append -- followed by --key value pairs to pass runtime context to the LLM.
  These are injected as a "Context variables" section in the prompt and can
  also be used as {{key}} placeholders inside .commitloom.md.

  Syntax:
    git loom -- --<key> <value>      key/value pair
    git loom -- --<key>=<value>      alternative syntax
    git loom -- --<flag>             boolean flag (value = "true")

  Examples:
    git loom -- --task-id 1001
    git loom -- --ticket PROJ-42 --scope payments
    git loom -- --task-id=1001 --breaking-change

  .commitloom.md template example:
    This commit is related to task #{{task-id}}.
    Scope: {{scope}}.`
  )
  .action(async (options: GenerateOptions) => {
    try {
      await runCommitCommand({ ...options, params: extraParams });
    } catch (err) {
      process.stderr.write(`Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program
  .command("install")
  .description("Register 'git loom' as a native git subcommand")
  .action(() => {
    try {
      runInstall();
    } catch (err) {
      process.stderr.write(`Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program
  .command("uninstall")
  .description("Remove the git-loom script installed by 'cloom install'")
  .action(() => {
    try {
      runUninstall();
    } catch (err) {
      process.stderr.write(`Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program.parseAsync(argv).catch((err: Error) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});

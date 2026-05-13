#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runCommitCommand } from "./commands/commit.js";
import { GenerateOptions } from "./types.js";

const program = new Command();

program
  .name("commitforge")
  .description("AI-powered git commit message generator")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize CommitForge in the current repository")
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
  .description("Generate a commit message, confirm, and run git commit")
  .option("-c, --config <path>", "Path to .commitforge.yml config file")
  .option("-i, --instructions <path>", "Path to .commitforge.md instructions file")
  .option("-v, --verbose", "Print debug info to stderr")
  .action(async (options: GenerateOptions) => {
    try {
      await runCommitCommand(options);
    } catch (err) {
      process.stderr.write(`Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((err: Error) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});

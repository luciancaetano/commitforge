import { execSync } from "child_process";
import type { GitContext } from "../types.js";

function exec(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

export function findRepoRoot(): string {
  try {
    return exec("git rev-parse --show-toplevel", process.cwd());
  } catch {
    throw new Error("Not inside a git repository. Run this command from within a git repo.");
  }
}

export function getCurrentBranch(repoRoot: string): string | null {
  try {
    const branch = exec("git rev-parse --abbrev-ref HEAD", repoRoot);
    return branch === "HEAD" ? null : branch;
  } catch {
    return null;
  }
}

export function getStagedDiff(repoRoot: string): string {
  try {
    return exec("git diff --cached -M", repoRoot);
  } catch {
    return "";
  }
}

export function getStagedStat(repoRoot: string): string {
  try {
    return exec("git diff --cached --stat", repoRoot);
  } catch {
    return "";
  }
}

export function getRecentLog(repoRoot: string): string {
  try {
    return exec("git log --oneline -5", repoRoot);
  } catch {
    return "";
  }
}

export function collectGitContext(): GitContext {
  const repoRoot = findRepoRoot();
  const branch = getCurrentBranch(repoRoot);
  const diff = getStagedDiff(repoRoot);

  if (!diff) {
    throw new Error("No staged changes found. Run `git add <files>` before using commitloom.");
  }

  return {
    diff,
    stat: getStagedStat(repoRoot),
    recentLog: getRecentLog(repoRoot),
    branch,
    repoRoot,
  };
}

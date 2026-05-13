import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";

const IS_WINDOWS = process.platform === "win32";
const SCRIPT_NAME = IS_WINDOWS ? "git-loom.cmd" : "git-loom";
const PATH_SEP = IS_WINDOWS ? ";" : ":";

const SCRIPT_CONTENT = IS_WINDOWS
  ? `@echo off\r\ncloom c %*\r\n`
  : `#!/bin/sh\nexec cloom c "$@"\n`;

function candidateDirs(): string[] {
  if (IS_WINDOWS) {
    const candidates: string[] = [];
    const appdata = process.env.APPDATA;
    if (appdata) candidates.push(path.join(appdata, "npm"));
    candidates.push(path.join(os.homedir(), "AppData", "Roaming", "npm"));
    return candidates;
  }
  if (process.platform === "darwin") {
    return [
      "/opt/homebrew/bin",   // Apple Silicon
      "/usr/local/bin",      // Intel / Homebrew legacy
      path.join(os.homedir(), ".local", "bin"),
    ];
  }
  return [
    path.join(os.homedir(), ".local", "bin"),
    "/usr/local/bin",
    "/usr/bin",
  ];
}

function findInstalled(): string | null {
  for (const dir of candidateDirs()) {
    const p = path.join(dir, SCRIPT_NAME);
    if (fs.existsSync(p)) return p;
  }
  try {
    // Redirect stderr to null to suppress "not found" messages from where/which.
    const cmd = IS_WINDOWS ? "where git-loom 2>nul" : "which git-loom 2>/dev/null";
    const result = execSync(cmd, { encoding: "utf8" }).trim().split(/\r?\n/)[0];
    if (result) return result;
  } catch {
    // not found
  }
  return null;
}

function pickInstallDir(): string {
  const entries = (process.env.PATH ?? "").split(PATH_SEP);
  // Windows PATH is case-insensitive and may have trailing slashes — normalize both sides.
  const normalize = IS_WINDOWS
    ? (p: string) => path.resolve(p).toLowerCase().replace(/[/\\]+$/, "")
    : (p: string) => p;
  const pathSet = new Set(entries.map(normalize));
  for (const dir of candidateDirs()) {
    if (pathSet.has(normalize(dir))) return dir;
  }
  return candidateDirs()[0];
}

function isAccessible(): boolean {
  try {
    const cmd = IS_WINDOWS ? "where git-loom 2>nul" : "which git-loom 2>/dev/null";
    const result = execSync(cmd, { encoding: "utf8" }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

export function runInstall(): void {
  const existing = findInstalled();
  if (existing) {
    process.stderr.write(`  git-loom already installed at ${existing}\n`);
    process.stderr.write("  Run 'cloom uninstall' to remove it first.\n");
    return;
  }

  const dir = pickInstallDir();
  const target = path.join(dir, SCRIPT_NAME);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    process.stderr.write(`  created ${dir}\n`);
  }

  const writeOpts = IS_WINDOWS
    ? { encoding: "utf8" as const }
    : { encoding: "utf8" as const, mode: 0o755 };

  fs.writeFileSync(target, SCRIPT_CONTENT, writeOpts);
  process.stderr.write(`  installed ${target}\n`);

  if (!isAccessible()) {
    if (IS_WINDOWS) {
      process.stderr.write(`\n  ${dir} is not in your PATH.\n`);
      process.stderr.write("  Add it via: System Properties > Environment Variables > Path\n");
    } else {
      process.stderr.write(`\n  ${dir} is not in your PATH. Add to your shell profile:\n`);
      process.stderr.write(`    export PATH="$PATH:${dir}"\n`);
      process.stderr.write("  Then reload: source ~/.bashrc\n");
    }
  } else {
    process.stderr.write("\nDone. Try: git loom\n");
  }
}

export function runUninstall(): void {
  const existing = findInstalled();
  if (!existing) {
    process.stderr.write("  git-loom is not installed.\n");
    return;
  }

  fs.unlinkSync(existing);
  process.stderr.write(`  removed ${existing}\n\nDone.\n`);
}

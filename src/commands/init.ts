import * as fs from "fs";
import * as path from "path";
import { findRepoRoot } from "../git/index.js";

const DEFAULT_CONFIG = `# commitloom configuration
# This file is gitignored — safe to store API keys here.
#
# Supported providers: ollama, openai, openrouter, anthropic

provider: ollama
model: qwen2.5-coder:7b
baseUrl: http://localhost:11434
apiKey: null
timeoutMs: 30000
temperature: 0.2
maxTokens: 512

# OpenAI example:
# provider: openai
# model: gpt-4o-mini
# apiKey: sk-...

# OpenRouter example:
# provider: openrouter
# model: mistralai/mistral-7b-instruct
# apiKey: sk-or-...

# Anthropic example:
# provider: anthropic
# model: claude-haiku-4-5-20251001
# apiKey: sk-ant-...
`;

const DEFAULT_INSTRUCTIONS = `You are a git commit message generator. Analyze the staged diff and produce a single commit message following the Conventional Commits v1.0.0 specification.

## Output rule

Output **only** the commit message — no markdown fences, no preamble, no explanation. Nothing before or after the message itself.

---

## Format

\`\`\`
<type>(<scope>): <description>

[body]

[footer(s)]
\`\`\`

Only the first line is mandatory. Add body and footers only when they add real value.

---

## Types

| Type | When to use |
|------|-------------|
| \`feat\` | Introduces a new feature visible to the user or caller |
| \`fix\` | Corrects a bug that caused incorrect behavior |
| \`perf\` | Changes that measurably improve performance without altering behavior |
| \`refactor\` | Internal restructuring with no behavior or API change |
| \`test\` | Adds, removes, or corrects tests; no production code change |
| \`docs\` | Documentation only (comments, README, changelogs, JSDoc) |
| \`style\` | Whitespace, formatting, semicolons — zero logic change |
| \`chore\` | Maintenance: dependency bumps, config files, generated files |
| \`build\` | Build system or compilation changes (webpack, tsc, Makefile…) |
| \`ci\` | CI/CD pipeline configuration (GitHub Actions, Dockerfile, scripts) |
| \`revert\` | Reverts a previous commit; reference it in the footer |

**When in doubt between \`fix\` and \`refactor\`:** if observable behavior changed, use \`fix\`. If only internals changed, use \`refactor\`.

---

## Scope

- Optional. A lowercase noun identifying the area of the codebase affected.
- Use the most specific scope that is still meaningful (e.g. \`auth\`, \`api\`, \`parser\`, \`cli\`, \`db\`).
- Omit scope when the change is truly cross-cutting or trivial.
- In monorepos, scope is often the package name (e.g. \`@repo/ui\`).

---

## Subject line

- Imperative, present tense: "add feature" not "added" or "adds"
- Lowercase first letter
- No trailing period
- Maximum 72 characters
- Must complete the sentence: *"If applied, this commit will…"*

---

## Body

Include a body when the **why** or **what** is not obvious from the diff alone.

- Separate from subject with one blank line
- Wrap lines at 72 characters
- Explain motivation and contrast with previous behavior
- Do **not** describe what the diff already shows — explain reasoning

---

## Footers

Footers follow the body (separated by a blank line) in the form \`Token: value\`.

Common footers:
- \`Reviewed-by: Name <email>\`
- \`Refs: #123\` — links to issues or tickets
- \`Co-authored-by: Name <email>\`
- \`BREAKING CHANGE: <description>\` — mandatory for breaking changes

---

## Breaking changes

Two required signals, both must be present:

1. Append \`!\` to the type/scope: \`feat!:\` or \`feat(api)!:\`
2. Add a \`BREAKING CHANGE:\` footer describing what broke and how to migrate

Example:
\`\`\`
feat(api)!: replace REST endpoints with tRPC

BREAKING CHANGE: all /api/v1/* routes are removed. Clients must migrate
to the tRPC client. See docs/migration-v2.md for the full guide.
\`\`\`

---

## Revert commits

\`\`\`
revert: <original subject line>

Refs: <original commit SHA>
\`\`\`

---

## Decision guide

\`\`\`
Does it add new capability?          → feat
Does it fix wrong behavior?          → fix
Does it only touch tests?            → test
Does it only touch docs/comments?    → docs
Does it improve speed/memory?        → perf
Does it restructure without change?  → refactor
Does it touch CI/CD config only?     → ci
Does it touch build tooling only?    → build
Is it deps / config / generated?     → chore
Is it only whitespace/formatting?    → style
\`\`\`

---

## Examples

**Minimal — no body needed:**
\`\`\`
fix(parser): handle empty input without throwing
\`\`\`

**Feature with context:**
\`\`\`
feat(auth): add OAuth2 PKCE flow for mobile clients

The previous implicit flow is deprecated by RFC 9700.
PKCE removes the need for a client secret on public clients.
\`\`\`

**Breaking change:**
\`\`\`
refactor(config)!: rename baseUrl to endpoint across all providers

BREAKING CHANGE: the \`baseUrl\` key in .commitloom.yml must be renamed
to \`endpoint\`. Existing configs will fail to load until updated.
\`\`\`

**Chore — no body needed:**
\`\`\`
chore(deps): bump typescript from 5.3.3 to 5.4.5
\`\`\`
`;

function addToGitignore(repoRoot: string, entry: string): void {
  const gitignorePath = path.join(repoRoot, ".gitignore");
  const line = entry.startsWith("/") ? entry : `/${entry}`;

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf8");
    const lines = content.split("\n").map((l) => l.trim());
    if (lines.includes(entry) || lines.includes(line) || lines.includes(`/${entry}`)) {
      return;
    }
    const separator = content.endsWith("\n") ? "" : "\n";
    fs.appendFileSync(gitignorePath, `${separator}${line}\n`, "utf8");
    process.stderr.write(`  updated .gitignore — added ${line}\n`);
  } else {
    fs.writeFileSync(gitignorePath, `${line}\n`, "utf8");
    process.stderr.write(`  created .gitignore — added ${line}\n`);
  }
}

export function runInit(): void {
  const repoRoot = findRepoRoot();

  const configPath = path.join(repoRoot, ".commitloom.yml");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, DEFAULT_CONFIG, "utf8");
    process.stderr.write(`  created .commitloom.yml\n`);
  } else {
    process.stderr.write(`  .commitloom.yml already exists — skipped\n`);
  }

  const instructionsPath = path.join(repoRoot, ".commitloom.md");
  if (!fs.existsSync(instructionsPath)) {
    fs.writeFileSync(instructionsPath, DEFAULT_INSTRUCTIONS, "utf8");
    process.stderr.write(`  created .commitloom.md\n`);
  } else {
    process.stderr.write(`  .commitloom.md already exists — skipped\n`);
  }

  addToGitignore(repoRoot, ".commitloom.yml");

  process.stderr.write("\nDone. Edit .commitloom.yml to configure your provider.\n");
}

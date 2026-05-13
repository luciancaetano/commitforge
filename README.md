# CommitLoom

**AI-powered git commit message generator.** Reads your staged diff, follows your rules, and outputs a clean [Conventional Commit](https://www.conventionalcommits.org/) — then asks before it commits.

---

## Install

```bash
npm install -g commitloom
cloom install            # register git loom as a native git subcommand
```

## Quick start

```bash
cloom init      # creates .commitloom.yml and .commitloom.md in your repo
git add .
git loom        # generate and confirm commit
```

---

## Usage

`git loom` works like any built-in git command — no aliases, no shell config:

```bash
git loom                          # generate and confirm commit
git loom -- --ticket PROJ-42      # inject context variables
git loom -- --scope auth --breaking-change
```

`cloom install` creates a `git-loom` executable in `~/.local/bin` (or `/usr/local/bin`). Git finds commands named `git-<name>` in the `PATH` automatically.

To remove it:

```bash
cloom uninstall
```

---

## Commands

| Command | Description |
|---------|-------------|
| `cloom install` | Register `git loom` as a native git subcommand |
| `cloom uninstall` | Remove the `git loom` subcommand |
| `cloom init` | Initialize config and instruction files in the current repo |
| `cloom c` | Same as `git loom` (direct alias) |
| `cloom c --config <path>` | Override config file for this run |
| `cloom c --instructions <path>` | Override instruction file for this run |
| `cloom c --verbose` | Show prompt and raw LLM response |

---

## Configuration (`.commitloom.yml`)

Gitignored by default — safe to store API keys here.

```yaml
provider: ollama
model: qwen2.5-coder:7b
baseUrl: http://localhost:11434
apiKey: null
timeoutMs: 30000
temperature: 0.2
maxTokens: 512
```

### Providers

| Provider | `provider` value | Notes |
|----------|-----------------|-------|
| [Ollama](https://ollama.com) | `ollama` | Local, free, no key needed |
| [OpenAI](https://platform.openai.com) | `openai` | Needs `apiKey` or `OPENAI_API_KEY` |
| [OpenRouter](https://openrouter.ai) | `openrouter` | Needs `apiKey` or `OPENROUTER_API_KEY` |
| [Anthropic](https://www.anthropic.com) | `anthropic` | Needs `apiKey` or `ANTHROPIC_API_KEY` |

**Provider examples:**

```yaml
# Ollama (local)
provider: ollama
model: qwen2.5-coder:7b

# OpenAI
provider: openai
model: gpt-4o-mini
apiKey: sk-...

# Anthropic
provider: anthropic
model: claude-haiku-4-5-20251001
apiKey: sk-ant-...
```

---

## Customizing rules (`.commitloom.md`)

Committed to your repo and shared with the team. Contains the instructions sent to the LLM on every run. Requires a YAML frontmatter block:

```markdown
---
system: "You are a git commit message generator."
language: en
final: "Generate the commit message now. Only the message, no explanation."
---

Follow Conventional Commits. Keep the subject under 72 characters.
```

| Field | Required | Description |
|-------|----------|-------------|
| `system` | No | Overrides the LLM system role |
| `language` | No | Forces output language (`en`, `pt-BR`, `es`, `fr`…) |
| `final` | No | Overrides the closing instruction appended after the diff |

---

## Context variables

Inject runtime values into the LLM prompt by passing them after `--`:

```bash
git loom -- --task-id 1001
git loom -- --ticket PROJ-42 --scope payments
```

Use `{{key}}` placeholders in `.commitloom.md` to interpolate them:

```markdown
This commit is related to task #{{task-id}}.
```

---

## Ollama setup (local, free)

```bash
# Install: https://ollama.com/download
ollama pull qwen2.5-coder:7b   # default model (~8 GB RAM)
```

Other models (all local via Ollama):

| Model | Pull command | RAM | GPU VRAM | CPU? | Quality |
|-------|-------------|-----|----------|------|---------|
| `qwen2.5-coder:7b` ⭐ | `ollama pull qwen2.5-coder:7b` | 8 GB | 6 GB | ✅ slow | Good |
| `qwen2.5-coder:14b` | `ollama pull qwen2.5-coder:14b` | 12 GB | 10 GB | ✅ very slow | Better |
| `qwen2.5-coder:32b` | `ollama pull qwen2.5-coder:32b` | 24 GB | 20 GB | ⚠️ impractical | Excellent |
| `qwen3:8b` | `ollama pull qwen3:8b` | 8 GB | 6 GB | ✅ slow | Better |
| `qwen3:14b` | `ollama pull qwen3:14b` | 12 GB | 10 GB | ✅ very slow | Very good |
| `qwen3:32b` | `ollama pull qwen3:32b` | 24 GB | 20 GB | ⚠️ impractical | Excellent |
| `deepseek-coder-v2:16b` | `ollama pull deepseek-coder-v2:16b` | 16 GB | 12 GB | ⚠️ very slow | Very good |
| `codellama:13b` | `ollama pull codellama:13b` | 12 GB | 10 GB | ✅ slow | Good |
| `devstral` | `ollama pull devstral` | 16 GB | 14 GB | ❌ not recommended | Excellent |

> Models ≤ 8B são usáveis em CPU (3–10 tokens/s). Apple Silicon lida melhor com modelos maiores por usar memória unificada.

---

## Requirements

- Node.js 18+
- Git
- A running LLM (Ollama locally, or an API key for cloud providers)

---

## License

MIT © [Lucian Caetano](https://github.com/lucian-caetano)

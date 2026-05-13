# CommitLoom

```sh
         ✦   ˚   ✦
        ╭─────────╮
        │  ◕   ◕ │
        ╰────┬────╯
  ◉━━━━━━━━━━┻━━━━━━━━━━◉
  ┃   ╭─────────────╮    ┃
  ┃   │ ●  ───────  │    ┃
  ┃   │    ───────  │    ┃
  ┃   │    ─────    │    ┃
  ┃   │ ●  ───────  │    ┃
  ┃   ╰─────────────╯    ┃
  ◉━━━━━━━━━━━━━━━━━━━━━◉
```

**Stop burning tokens on commit messages.**

AI-powered git commit message generator that runs locally or against any LLM provider. Reads your staged diff, follows your rules, and outputs a clean [Conventional Commit](https://www.conventionalcommits.org/) — then asks before it commits.

---

## Install

```bash
npm install -g commitloom
```

---

## Quick start

```bash
# 1. Initialize commitloom in your repo
commitloom init

# 2. Edit .commitloom.yml to point at your provider
#    (it's already gitignored — safe for API keys)

# 3. Stage your changes and generate a commit
git add .
commitloom c   # or: cloom c
```

---

## Commands

### `commitloom init` · alias `cloom init`

Sets up commitloom in the current repository.

- Creates `.commitloom.yml` with provider configuration
- Creates `.commitloom.md` with Conventional Commits instructions
- Adds `.commitloom.yml` to `.gitignore` automatically
- Never overwrites `.commitloom.md` if it already exists

```bash
commitloom init   # or: cloom init
```

### `commitloom commit` · alias `commitloom c` · alias `cloom c`

Reads your staged diff, generates a commit message via your configured LLM, shows it to you, and asks for confirmation before running `git commit`.

```bash
commitloom commit
commitloom c        # short alias
cloom c             # shortest alias

# Override config or instructions for a single run
cloom c --config path/to/.commitloom.yml
cloom c --instructions path/to/rules.md
cloom c --verbose

# Pass context variables to the LLM (see "Context variables" below)
cloom c -- --task-id 1001
cloom c -- --ticket PROJ-42 --scope payments
```

---

## Context variables

Pass arbitrary key/value pairs after `--` to inject runtime context into the LLM prompt. This is useful when your `.commitloom.md` has templates that require values only known at commit time — like a task ID, ticket number, or reviewer name.

### Syntax

```bash
cloom c -- --<key> <value>       # key/value pair
cloom c -- --<key>=<value>       # alternative syntax
cloom c -- --<flag>              # boolean flag (passed as "true")
```

### Examples

```bash
cloom c -- --task-id 1001
cloom c -- --ticket PROJ-42 --scope payments
cloom c -- --task-id=1001 --reviewer alice --breaking-change
```

### How it works

Each pair is injected into the LLM prompt in two ways:

1. **Template interpolation** — `{{key}}` placeholders in `.commitloom.md` are replaced with the provided values before the prompt is sent.
2. **Context section** — a `## Context variables` block is appended to the prompt so the LLM always sees the values, even without explicit placeholders.

### `.commitloom.md` template example

```
Follow Conventional Commits.
This commit is related to task #{{task-id}}.
{{scope}} — use this as the commit scope if provided.
```

Running `cloom c -- --task-id 1001 --scope payments` would send:

```
Follow Conventional Commits.
This commit is related to task #1001.
payments — use this as the commit scope if provided.
```

---

## Configuration (`.commitloom.yml`)

This file is **gitignored by default** — safe to store API keys.

```yaml
provider: ollama
model: qwen2.5-coder:7b
baseUrl: http://localhost:11434
apiKey: null
timeoutMs: 30000
temperature: 0.2
maxTokens: 512
```

### Supported providers

| Provider                               | `provider` value | Default `baseUrl`              |
|----------------------------------------|------------------|--------------------------------|
| [Ollama](https://ollama.com) (local)   | `ollama`         | `http://localhost:11434`       |
| [OpenAI](https://platform.openai.com)  | `openai`         | `https://api.openai.com/v1`    |
| [OpenRouter](https://openrouter.ai)    | `openrouter`     | `https://openrouter.ai/api/v1` |
| [Anthropic](https://www.anthropic.com) | `anthropic`      | `https://api.anthropic.com`    |

#### Ollama (local, no cost)

```yaml
provider: ollama
model: qwen2.5-coder:7b
baseUrl: http://localhost:11434
```

#### OpenAI

```yaml
provider: openai
model: gpt-4o-mini
apiKey: sk-...
```

#### OpenRouter

```yaml
provider: openrouter
model: mistralai/mistral-7b-instruct
apiKey: sk-or-...
```

#### Anthropic

```yaml
provider: anthropic
model: claude-haiku-4-5-20251001
apiKey: sk-ant-...
```

API keys can also be set via environment variables:
`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`

---

## Customizing commit rules (`.commitloom.md`)

This file is committed to your repo and shared with your team. It contains the instructions sent to the LLM on every run. Edit it to enforce your project's conventions.

The default template follows the full [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) spec, including:

- All standard types (`feat`, `fix`, `refactor`, `chore`, `perf`, `ci`…)
- Scope guidelines
- Subject line rules (imperative, lowercase, 72 chars)
- Body and footer usage
- Breaking change format (`feat!:` + `BREAKING CHANGE:` footer)
- A decision guide and concrete examples

---

## Setting up Ollama (local, free, no API key)

Ollama lets you run LLMs fully offline on your own machine. It's the default provider for commitloom.

### Install Ollama

**macOS**
```bash
# Download the app from the official site and drag to Applications
# https://ollama.com/download
```
Or via Homebrew:
```bash
brew install ollama
```

**Linux**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows**

Download the `.exe` installer from [ollama.com/download](https://ollama.com/download), run it, and follow the prompts. The `ollama` command will be available in PowerShell/CMD after installation.

---

### Pull the recommended model

```bash
ollama pull qwen2.5-coder:7b
```

This is the default model in `.commitloom.yml`. It's fast, lightweight, and purpose-built for code understanding.

---

### Alternative models

Pick a model based on your hardware. All run locally with Ollama.

| Model                   | Pull command                        | RAM needed | GPU VRAM | Runs on CPU?      | Quality   |
|-------------------------|-------------------------------------|------------|----------|-------------------|-----------|
| `qwen2.5-coder:7b` ⭐    | `ollama pull qwen2.5-coder:7b`      | 8 GB       | 6 GB     | ✅ slow            | Good      |
| `qwen2.5-coder:14b`     | `ollama pull qwen2.5-coder:14b`     | 12 GB      | 10 GB    | ✅ very slow       | Better    |
| `qwen2.5-coder:32b`     | `ollama pull qwen2.5-coder:32b`     | 24 GB      | 20 GB    | ⚠️ impractical     | Excellent |
| `qwen3:8b`              | `ollama pull qwen3:8b`              | 8 GB       | 6 GB     | ✅ slow            | Better    |
| `qwen3:14b`             | `ollama pull qwen3:14b`             | 12 GB      | 10 GB    | ✅ very slow       | Very good |
| `qwen3:32b`             | `ollama pull qwen3:32b`             | 24 GB      | 20 GB    | ⚠️ impractical     | Excellent |
| `deepseek-coder-v2:16b` | `ollama pull deepseek-coder-v2:16b` | 16 GB      | 12 GB    | ⚠️ very slow       | Very good |
| `codellama:13b`         | `ollama pull codellama:13b`         | 12 GB      | 10 GB    | ✅ slow            | Good      |
| `devstral`              | `ollama pull devstral`              | 16 GB      | 14 GB    | ❌ not recommended | Excellent |

**CPU-only notes:**
- Models **≤ 8B** are usable on CPU (expect 3–10 tokens/sec on a modern machine)
- Models **14B** are tolerable on CPU with 32 GB RAM (1–3 tokens/sec)
- Models **32B+** are impractical without a GPU — responses take minutes per commit
- Apple Silicon (M1/M2/M3) uses unified memory, so it handles larger models much better than x86 CPU-only

**To use a different model**, edit `.commitloom.yml`:
```yaml
provider: ollama
model: qwen3:14b        # ← swap here
baseUrl: http://localhost:11434
```

---

## How it works

```
git add <files>
       │
       ▼
commitloom commit
       │
       ├─ reads .commitloom.yml   → provider + model config
       ├─ reads .commitloom.md    → commit rules for the LLM
       ├─ runs git diff --cached   → staged changes only
       │
       ▼
    LLM prompt
       │
       ▼
  generated message
       │
  shown to user
       │
  [y/n] confirm?
       │
       ▼
  git commit -m "..."
```

Only staged changes are used — what you `git add` is what gets described.

---

## Requirements

- Node.js 18+
- Git
- A running LLM provider (Ollama locally, or an API key for cloud providers)

---

## License

MIT © [Lucian Caetano](https://github.com/lucian-caetano)

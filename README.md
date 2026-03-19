# gashapon

> A tool dispenser for AI agents. MCP servers and existing CLIs, served as lean shell commands.

## Why

MCP servers are powerful, but loading them all into an AI agent's context has a real cost. Every connected MCP server adds tool definitions to the system prompt — and tool definitions are tokens. At scale, a workspace with a dozen MCP servers can add thousands of tokens of overhead to *every single request*, regardless of whether those tools are relevant to what the agent is actually doing.

**gashapon** takes a different approach: instead of connecting MCP servers directly to your AI client, it wraps them as standalone CLI binaries on your machine. The agent calls them like any other shell command — no persistent connection, no context overhead, no tool list bloat.

But gashapon isn't only for MCP servers. You probably already have powerful CLI tools installed — `jira`, `confluence`, `gh`, `kubectl`, custom internal tools — that your AI agent has no idea exist. gashapon dispenses those too: register any existing CLI and it gets the same minimal skill file, so the agent knows it's available and can discover how to use it on demand.

The pattern is the same for both:
- MCP server tools become subcommands of a named `_capsule` binary (e.g. `slack_capsule search messages`)
- Existing CLIs are registered as-is under their own name (e.g. `jira`, `confluence`)
- A minimal skill file tells Claude Code and Codex CLI each tool exists; the rest is self-discovered by running `--help`
- Zero token overhead until the agent actually needs the tool

---

## Requirements

- Node.js ≥ 20
- Git

---

## Installation

Clone and link globally:

```sh
git clone https://github.com/evchee/gashapon.git
cd gashapon
npm install
npm link
```

Verify:

```sh
gashapon --version
```

Add the generated wrappers directory to your PATH (one-time setup):

```sh
gashapon init         # writes export to ~/.zshrc / ~/.bashrc / fish config
source ~/.zshrc       # or restart your shell
```

---

## Concepts

| Term | What it is |
|---|---|
| **server** | An MCP server registered in gashapon config |
| **capsule** | A generated `<name>_capsule` shell script that wraps an MCP server as a CLI binary |
| **tool** | An existing CLI binary registered for skill management |
| **skill** | A minimal `SKILL.md` file that tells Claude Code or Codex CLI a capsule or tool exists |

---

## Managing MCP servers

### 1. Register a server

**stdio** (local process):
```sh
gashapon add myserver -- npx -y @my/mcp-server
gashapon add myserver --command python --args "-m,myserver"
```

**HTTP** (remote, no auth):
```sh
gashapon add myserver --url https://mcp.example.com
```

**HTTP with OAuth**:
```sh
gashapon add myserver --url https://mcp.example.com --oauth --oauth-client-id <id>
```

**Well-known servers** (auto-configured, no flags needed):
```sh
gashapon add slack     # reads credentials from Claude Desktop automatically
```

### 2. Authenticate (OAuth servers only)

```sh
gashapon auth slack    # opens browser, completes OAuth flow, stores tokens
```

### 3. Install (connect, discover tools, write wrapper)

```sh
gashapon install slack
```

This connects to the MCP server, discovers all available tools, and writes a **capsule** — a `slack_capsule` binary in `~/.gashapon/bin/`. The tool schema is cached locally so subsequent invocations don't reconnect.

### 4. Use the capsule

```sh
slack_capsule --help                          # list all available commands
slack_capsule search messages --query "foo"   # invoke a tool
slack_capsule --capabilities                  # machine-readable tool manifest (JSON)
```

### 5. Keep it fresh

```sh
gashapon sync slack    # re-discover tools and update cache
gashapon sync --all    # sync all installed servers
```

### 6. Remove

```sh
gashapon uninstall slack   # remove wrapper + cache (keeps config)
gashapon remove slack      # remove from config entirely
```

---

## Dispensing existing CLI tools

You don't need an MCP server to benefit from gashapon. If a CLI already exists on your machine, register it and gashapon will manage its skill file — making it visible to your AI agent with zero extra setup.

```sh
gashapon register-cli confluence -d "Confluence page management"
gashapon register-cli jira -d "Jira issue tracking" --help-hint "jira issue --help"
gashapon register-cli gh -d "GitHub CLI"
gashapon register-cli kubectl -d "Kubernetes cluster management"
```

The agent will be told the tool exists and exactly which command to run to learn more. `--help-hint` lets you point it at the most useful entry point (defaults to `<name> --help`).

Run `gashapon install-skills` afterward to write the skill files for the current project.

To remove:
```sh
gashapon unregister-cli jira
```

---

## Agent skills (Claude Code & Codex CLI)

Skills tell Claude Code and Codex CLI that a tool exists. They are intentionally minimal — one file, a description, and a pointer to `--help`. The agent discovers the full command surface on demand by running the binary.

Generate skill files for all installed servers and registered tools:

```sh
gashapon install-skills                        # writes to .claude/skills/ + .agents/skills/
gashapon install-skills --target claude        # Claude Code only (.claude/skills/)
gashapon install-skills --target codex         # Codex CLI only (.agents/skills/)
gashapon install-skills slack                  # single server or tool
gashapon install-skills --dest /custom/path    # custom destination (overrides --target)
gashapon install-skills --force                # overwrite existing
```

A generated skill for a capsule looks like:

```markdown
---
name: slack_capsule
description: Slack MCP server
---

`slack_capsule` is available for interacting with slack. Run `slack_capsule --help` to discover available commands.
```

For registered CLI tools:

```markdown
---
name: jira
description: Jira issue tracking
---

`jira` is available on this machine. Run `jira issue --help` to discover available commands.
```

---

## For AI agents

Two commands are designed specifically for agent use:

**`gashapon agent-help`** — prints a full markdown guide covering the config schema, all commands, and the current configured state. Feed this to an agent to bootstrap its understanding of the local setup.

**`gashapon context`** — outputs a concise inventory of installed servers and registered tools in JSON or human-readable format.

```sh
gashapon agent-help      # full guide (markdown)
gashapon context         # current inventory
gashapon context --json  # machine-readable
```

---

## Config

Config lives at `~/.config/gashapon/config.json` (respects `$XDG_CONFIG_HOME`).

```json
{
  "version": "1",
  "bin_dir": "~/.gashapon/bin",
  "servers": {
    "slack": {
      "transport": "http",
      "url": "https://mcp.slack.com/mcp",
      "oauth": {
        "grant_type": "authorization_code",
        "client_id": "...",
        "callback_port": 3118
      },
      "installed": true,
      "description": "Slack MCP server"
    }
  },
  "tools": {
    "jira": {
      "description": "Jira issue tracking",
      "help_hint": "jira issue --help"
    }
  }
}
```

OAuth tokens are stored separately at `~/.config/gashapon/tokens/<name>.json`.

---

## Command reference

| Command | Description |
|---|---|
| `gashapon init` | Write `export PATH` for the bin dir to your shell config |
| `gashapon add <name>` | Register an MCP server |
| `gashapon auth <name>` | OAuth login for an HTTP server |
| `gashapon install <name>` | Discover tools and write capsule binary |
| `gashapon uninstall <name>` | Remove capsule and cache |
| `gashapon remove <name>` | Remove server from config |
| `gashapon sync [name\|--all]` | Re-discover tools and refresh cache |
| `gashapon list` | List configured servers |
| `gashapon register-cli <name>` | Register an existing CLI tool |
| `gashapon unregister-cli <name>` | Remove a registered CLI tool |
| `gashapon install-skills [name]` | Write skill files (Claude Code + Codex CLI) |
| `gashapon context` | Show inventory of managed tools |
| `gashapon agent-help` | Print agent onboarding guide |

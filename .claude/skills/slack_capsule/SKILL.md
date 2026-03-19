---
name: slack_capsule
description: Use slack_capsule to interact with Slack MCP server. Invoke this skill when the user asks about slack.
---

# slack_capsule

`slack_capsule` is a CLI tool that wraps the **slack** MCP server. Use it when the user asks you to interact with slack.

## When to use

Use `slack_capsule` when the user asks you to read, search, send, or otherwise interact with slack.

## Available commands

- `slack_capsule slack send message`: Sends a message to a Slack channel or user. To DM a user, use their user_id as channel_id. If the us
- `slack_capsule slack schedule message`: Schedules a message for future delivery to a Slack channel. Does NOT send immediately — use slack_se
- `slack_capsule slack create canvas`: Creates a Slack Canvas document from Markdown content. Return the canvas link to the user.
- `slack_capsule slack update canvas`: Updates a Slack Canvas with markdown content. Actions: append (add to end), prepend (add to beginnin
- `slack_capsule slack search public`: Searches for messages, files in public Slack channels ONLY. Current logged in user's user_id is U012
- `slack_capsule slack search public and private`: Searches for messages, files in ALL Slack channels, including public channels, private channels, DMs
- `slack_capsule slack search channels`: Search for Slack channels by name or description. Returns channel names, IDs, topics, purposes, and 
- `slack_capsule slack search users`: Search for Slack users by name, email, or profile attributes (department, role, title).
- `slack_capsule slack read channel`: Reads messages from a Slack channel in reverse chronological order (newest first). To read DM histor
- `slack_capsule slack read thread`: Reads messages from a specific Slack thread (parent message + all replies). Read-only.
- `slack_capsule slack read canvas`: Retrieves the markdown content and section ID mapping of a Slack Canvas document. Read-only.
- `slack_capsule slack read user profile`: Retrieves detailed profile information for a Slack user: contact info, status, timezone, organizatio
- `slack_capsule slack send message draft`: Creates a draft message in a Slack channel. The draft is saved to the user's "Drafts & Sent" in Slac

## Usage

```sh
slack_capsule <command> [flags]
slack_capsule --help
```

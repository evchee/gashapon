---
name: slack_capsule
description: "Slack MCP server"
---

`slack_capsule` is available for interacting with slack.

## Discovery

Run `slack_capsule --capabilities` to get a full JSON manifest of all commands and their flags (required/optional, types, descriptions). This is the fastest way to know what flags to pass.

Run `slack_capsule <command> --help` (e.g. `slack_capsule channels list --help`) for a per-command flag reference.

## Invocation styles

Both styles are equivalent:

```
slack_capsule <command> --flag_name value --other_flag value
slack_capsule <command> '{"flag_name": "value", "other_flag": "value"}'
```

Flag names match the schema exactly (e.g. `--channel_id`, not `--channel-id`).

## Error handling

Errors are JSON on stdout with `success: false` and an `error.suggestions` array listing available flags — use suggestions to self-correct without needing an extra discovery call.

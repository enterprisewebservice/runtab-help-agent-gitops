# The Runtab help desk's enforced tool list (set by hand on 20 Nov 2026)

The agent `runtab-help` is offered and may call exactly six tools:

- `read`, fenced to its own workspace folder (it reads its skill file with it);
- `governed__runtab_account`, `governed__runtab_link`, `governed__runtab_activity`,
  `governed__runtab_release`, `governed__runtab_knowledge`.

Before this, every new conversation was offered 224 tools: OpenClaw's built-ins (a shell and file
editing inside the gateway pod, web fetch, browser, sub-agents) and every tool on the platform's tool
gateway. `spec.tools.allow` in `base/agentworkstation.yaml` never was a limit: the operator reads it
as a list of things to switch on.

## Why this is in a folder called hand-applied

Operator v1.7.85 has no field for an enforced list, so the setting lives only in the gateway's
`openclaw.json` on its volume (`agents.list[runtab-help].tools`). The operator's merge keeps keys it
does not render, so it survives reconciles. It does NOT survive a rebuilt volume or a removed and
re-created agent entry: then all tools are back, silently. Check after either:

```bash
oc exec deploy/runtab-help -n agent-office -c openclaw -- openclaw config get agents.list
```

The declared version is `spec.tools.restrictTo`, planned for operator v1.7.86. When that field is in
`base/agentworkstation.yaml` and rendered, delete this folder.

## Apply it again

Away from the minutes when the operator rewrites the gateway's settings (look at the times of
`~/.openclaw/openclaw.json.bak*` in the pod):

```bash
oc exec -i deploy/runtab-help -n agent-office -c openclaw -- node - runtab-help read,governed__runtab_account,governed__runtab_link,governed__runtab_activity,governed__runtab_release,governed__runtab_knowledge < set-tool-list.js
```

```bash
oc exec deploy/runtab-help -n agent-office -c openclaw -- openclaw config patch --file /tmp/zz-toollist-runtab-help.patch.json --dry-run
```

```bash
oc exec deploy/runtab-help -n agent-office -c openclaw -- openclaw config patch --file /tmp/zz-toollist-runtab-help.patch.json
```

It applies without a restart. The Discord persona `runtab-community` on the same gateway keeps its own
three-tool list; the patch carries its entry unchanged.

## Check it

Start a test conversation and read what the gateway recorded for it (`toolCount` must be 6):

```bash
oc exec deploy/runtab-help -n agent-office -c openclaw -- openclaw agent --agent runtab-help --session-id zz-toollimit-check --timeout 150 --json -m "Platform check, no customer is waiting. Call the release tool and give me the current Runtab for Mac version in one line."
```

```bash
oc exec deploy/runtab-help -n agent-office -c openclaw -- grep -o '"toolCount":[0-9]*' /home/node/.openclaw/agents/runtab-help/sessions/zz-toollimit-check.trajectory.jsonl
```

The session's `*.trajectory.jsonl` cuts every list at 64 entries; `toolCount` in its `session.started`
line is the true number.

## Remove it

```bash
oc exec -i deploy/runtab-help -n agent-office -c openclaw -- node - runtab-help - < set-tool-list.js
```

```bash
oc exec deploy/runtab-help -n agent-office -c openclaw -- openclaw config patch --file /tmp/zz-toollist-runtab-help.patch.json
```

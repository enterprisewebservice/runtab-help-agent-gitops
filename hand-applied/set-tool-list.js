// Sets (or removes) the enforced tool list of ONE agent on an OpenClaw gateway by hand.
// Stopgap until the operator renders spec.tools.restrictTo (planned for operator v1.7.86).
// Runs INSIDE the gateway container and only writes a patch file; the patch is applied in a second step:
//
//   oc exec -i deploy/<gateway> -n agent-office -c openclaw -- node - <agent> <tool,tool,...> < set-tool-list.js
//   oc exec deploy/<gateway> -n agent-office -c openclaw -- openclaw config patch --file /tmp/zz-toollist-<agent>.patch.json --dry-run
//   oc exec deploy/<gateway> -n agent-office -c openclaw -- openclaw config patch --file /tmp/zz-toollist-<agent>.patch.json
//
// Pass "-" instead of the tool list to build the patch that removes the limit again.
// `config patch` replaces arrays whole, so the patch carries the full agents.list with every other entry unchanged.
// Why it survives the operator: its merge is { ...existingEntry, ...renderedEntry } and it renders no `tools` key.
const fs = require('fs');
const [agent, toolsArg] = process.argv.slice(2);
if (!agent || !toolsArg) { console.log('usage: node - <agent> <tool,tool,...|->'); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(process.env.HOME + '/.openclaw/openclaw.json', 'utf8'));
const list = (cfg.agents || {}).list || [];
const i = list.findIndex((a) => a && a.id === agent);
if (i < 0) { console.log('agent not found on this gateway: ' + agent); process.exit(1); }
const next = list.map((a, k) => {
  if (k !== i) return a;
  const copy = { ...a };
  delete copy.tools;
  if (toolsArg !== '-') copy.tools = { allow: toolsArg.split(',').filter(Boolean), fs: { workspaceOnly: true } };
  return copy;
});
const out = '/tmp/zz-toollist-' + agent + '.patch.json';
fs.writeFileSync(out, JSON.stringify({ agents: { list: next } }, null, 2));
console.log('agents in patch: ' + next.map((a) => a.id + (a.tools ? ' [tools.allow ' + (a.tools.allow || []).length + ', workspaceOnly ' + ((a.tools.fs || {}).workspaceOnly === true) + ']' : ' [no tools block]')).join(', '));
console.log('written ' + out);

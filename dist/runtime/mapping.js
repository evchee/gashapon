const VERBS = new Set([
    'list', 'get', 'create', 'update', 'delete', 'search', 'send', 'archive',
    'read', 'write', 'set', 'remove', 'find', 'add', 'edit', 'count', 'check',
    'export', 'import', 'sync', 'run', 'start', 'stop', 'cancel', 'close',
    'open', 'enable', 'disable', 'move', 'copy', 'merge', 'validate', 'publish',
    'fetch', 'push', 'pull', 'post', 'put', 'patch', 'submit', 'approve',
    'reject', 'restore', 'reset', 'refresh', 'reload', 'download', 'upload',
]);
function parseToolName(toolName) {
    const tokens = toolName.split('_').filter(Boolean);
    if (tokens.length === 0)
        return null;
    // Check position 0 (most common: verb_noun)
    if (VERBS.has(tokens[0])) {
        const verb = tokens[0];
        const nounTokens = tokens.slice(1);
        if (nounTokens.length === 0) {
            return { verb, noun: '' }; // single-token verb command
        }
        return { verb, noun: nounTokens.join('-') };
    }
    // Check last position (noun_verb)
    if (tokens.length > 1 && VERBS.has(tokens[tokens.length - 1])) {
        const verb = tokens[tokens.length - 1];
        const nounTokens = tokens.slice(0, -1);
        return { verb, noun: nounTokens.join('-') };
    }
    return null;
}
function toolToInfo(tool) {
    return {
        mcpName: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: tool.annotations,
    };
}
export function buildMapping(tools) {
    const forward = {};
    const reverse = {};
    const tree = {};
    // Track used keys for conflict detection
    const usedKeys = new Set();
    const conflicts = new Set();
    for (const tool of tools) {
        const parsed = parseToolName(tool.name);
        let nounVerbKey;
        if (parsed === null) {
            // No verb found — use the raw tool name as root-level command
            nounVerbKey = tool.name.replace(/_/g, '-');
        }
        else if (parsed.noun === '') {
            // Single verb, no noun — root-level
            nounVerbKey = parsed.verb;
        }
        else {
            nounVerbKey = `${parsed.noun} ${parsed.verb}`;
        }
        // Conflict detection
        if (usedKeys.has(nounVerbKey)) {
            conflicts.add(nounVerbKey);
        }
        usedKeys.add(nounVerbKey);
    }
    for (const tool of tools) {
        const parsed = parseToolName(tool.name);
        let nounVerbKey;
        let noun;
        let verb;
        if (parsed === null) {
            nounVerbKey = tool.name.replace(/_/g, '-');
            noun = '_root';
            verb = nounVerbKey;
        }
        else if (parsed.noun === '') {
            nounVerbKey = parsed.verb;
            noun = '_root';
            verb = parsed.verb;
        }
        else {
            nounVerbKey = `${parsed.noun} ${parsed.verb}`;
            noun = parsed.noun;
            verb = parsed.verb;
        }
        // Fall back to raw hyphenated name on conflict
        if (conflicts.has(nounVerbKey) && forward[nounVerbKey]) {
            // Already added a conflicting tool — use raw names for both
            const existingMcp = forward[nounVerbKey];
            const existingRaw = existingMcp.replace(/_/g, '-');
            // Re-map the existing one
            delete forward[nounVerbKey];
            forward[existingRaw] = existingMcp;
            reverse[existingMcp] = existingRaw;
            // Remap tree
            if (tree[noun]?.[verb]) {
                tree['_root'] ??= {};
                tree['_root'][existingRaw] = tree[noun][verb];
                delete tree[noun][verb];
            }
            nounVerbKey = tool.name.replace(/_/g, '-');
            noun = '_root';
            verb = nounVerbKey;
        }
        forward[nounVerbKey] = tool.name;
        reverse[tool.name] = nounVerbKey;
        tree[noun] ??= {};
        tree[noun][verb] = toolToInfo(tool);
    }
    return { forward, reverse, tree };
}

export function buildReceipt(operation, target, undoCmd) {
    return {
        success: true,
        operation,
        target,
        timestamp: new Date().toISOString(),
        ...(undoCmd ? { undo_command: undoCmd } : {}),
    };
}

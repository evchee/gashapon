export interface Receipt {
  success: true
  operation: string
  target: string
  timestamp: string
  undo_command?: string
}

export function buildReceipt(
  operation: string,
  target: string,
  undoCmd?: string,
): Receipt {
  return {
    success: true,
    operation,
    target,
    timestamp: new Date().toISOString(),
    ...(undoCmd ? { undo_command: undoCmd } : {}),
  }
}

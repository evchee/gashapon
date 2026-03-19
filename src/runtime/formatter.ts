import type { CallToolResult } from '../mcp/client.js'
import type { ToolInfo } from './mapping.js'
import { isTTY } from '../util/tty.js'
import { buildReceipt } from '../output/receipt.js'

interface FormatOpts {
  quiet: boolean
  json: boolean
  serverName: string
  toolName: string
}

export class OutputFormatter {
  format(result: CallToolResult, toolInfo: ToolInfo, opts: FormatOpts): void {
    if (result.isError) {
      const msg = extractText(result.content)
      const errObj = {
        success: false,
        error: {
          code: 'TOOL_ERROR',
          message: msg,
          suggestions: [],
          retryable: false,
        },
      }
      process.stdout.write(JSON.stringify(errObj, null, 2) + '\n')
      return
    }

    const data = extractData(result.content)

    // Mutation detection: readOnlyHint === false means it mutates
    const isMutation = toolInfo.annotations?.readOnlyHint === false

    let output: unknown
    if (isMutation) {
      output = buildReceipt(opts.toolName, opts.serverName, undefined)
      // Merge tool result data into receipt
      output = { ...(output as object), result: data }
    } else {
      output = data
    }

    this.emit(output, opts)
  }

  private emit(data: unknown, opts: FormatOpts): void {
    if (opts.quiet) {
      this.emitBare(data)
    } else if (opts.json || !isTTY()) {
      process.stdout.write(JSON.stringify(data, null, 2) + '\n')
    } else {
      process.stdout.write(JSON.stringify(data, null, 2) + '\n')
    }
  }

  private emitBare(data: unknown): void {
    if (Array.isArray(data)) {
      for (const item of data) process.stdout.write(String(item) + '\n')
    } else if (data !== null && typeof data === 'object') {
      const vals = Object.values(data)
      if (vals.length === 1) process.stdout.write(String(vals[0]) + '\n')
      else process.stdout.write(JSON.stringify(data) + '\n')
    } else {
      process.stdout.write(String(data) + '\n')
    }
  }
}

function extractText(content: CallToolResult['content']): string {
  return content
    .filter(c => c.type === 'text')
    .map(c => c.text ?? '')
    .join('\n')
}

function extractData(content: CallToolResult['content']): unknown {
  const textBlocks = content.filter(c => c.type === 'text')
  if (textBlocks.length === 0) return content

  // Try parsing each text block as JSON
  if (textBlocks.length === 1) {
    try { return JSON.parse(textBlocks[0].text ?? '') } catch { /* fall through */ }
    return textBlocks[0].text
  }

  // Multiple text blocks: return array
  return textBlocks.map(b => {
    try { return JSON.parse(b.text ?? '') } catch { return b.text }
  })
}

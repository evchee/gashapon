export interface Receipt {
    success: true;
    operation: string;
    target: string;
    timestamp: string;
    undo_command?: string;
}
export declare function buildReceipt(operation: string, target: string, undoCmd?: string): Receipt;

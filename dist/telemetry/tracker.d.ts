interface TelemetryEvent {
    timestamp: string;
    server: string;
    command: string;
    exitCode: number;
    durationMs: number;
    correlationId?: string;
}
export declare function trackEvent(event: TelemetryEvent): Promise<void>;
export {};

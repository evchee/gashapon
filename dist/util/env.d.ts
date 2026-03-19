/**
 * Interpolates ${VAR} references in a string using process.env.
 * Throws if a referenced variable is not set.
 */
export declare function interpolateEnv(value: string): string;
/**
 * Interpolates all values in a Record<string, string>.
 */
export declare function interpolateEnvMap(record: Record<string, string> | undefined): Record<string, string>;

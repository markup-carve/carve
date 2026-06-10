#!/usr/bin/env node
/** Injectable I/O so `run` is testable without real fs / stdin / exit. */
export interface CliIO {
    /** Read all of stdin as UTF-8. */
    readStdin: () => Promise<string>;
    /** Write to stdout. */
    write: (s: string) => void;
    /** Write to stderr (diagnostics, skipped-warning reports). */
    writeErr: (s: string) => void;
    /** Read a file as UTF-8; may throw (caught and reported per file). */
    readFile: (path: string) => string;
    /** Write a file as UTF-8. */
    writeFile: (path: string, content: string) => void;
}
/**
 * Dispatch a `carve` invocation. `argv` is the argument list *after* `node`
 * and the script path (i.e. `process.argv.slice(2)`). Returns the intended
 * process exit code.
 */
export declare function run(argv: string[], io: CliIO): Promise<number>;
//# sourceMappingURL=cli.d.ts.map
import type { CarveExtension } from './extension.js';
/** Options for the {@link codeGroup} extension. */
export interface CodeGroupOptions {
    /** CSS class on the wrapper. Default `'code-group'`. */
    wrapperClass?: string;
    /** CSS class on each code panel. Default `'code-group-panel'`. */
    panelClass?: string;
    /** CSS class on each tab label. Default `'code-group-label'`. */
    labelClass?: string;
    /** CSS class on each radio input. Default `'code-group-radio'`. */
    radioClass?: string;
    /** Prefix for generated ids/names. Default `'codegroup'`. */
    idPrefix?: string;
    /**
     * Optional syntax highlighter. Receives the code text and language; returns
     * the full HTML for the code (replacing the default `<pre><code>` markup).
     */
    highlighter?: (code: string, lang: string | undefined) => string;
}
export declare function codeGroup(opts?: CodeGroupOptions): CarveExtension;
//# sourceMappingURL=code-group.d.ts.map
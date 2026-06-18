import type { CarveExtension } from './extension.js';
/** Output mode for {@link tabs}: CSS-only radios or ARIA roles + JS. */
export type TabsMode = 'css' | 'aria';
/** Options for the {@link tabs} extension. */
export interface TabsOptions {
    /** `'css'` (default, no JS) or `'aria'` (semantic roles, requires JS). */
    mode?: TabsMode;
    /** CSS class on the tabs container. Default `'tabs'`. */
    wrapperClass?: string;
    /** CSS class on each tab panel. Default `'tabs-panel'`. */
    tabClass?: string;
    /** CSS class on each tab label/button. Default `'tabs-label'`. */
    labelClass?: string;
    /** CSS class on each radio input (CSS mode only). Default `'tabs-radio'`. */
    radioClass?: string;
    /** Prefix for generated ids. Default `'tabset'`. */
    idPrefix?: string;
}
export declare function tabs(opts?: TabsOptions): CarveExtension;
//# sourceMappingURL=tabs.d.ts.map
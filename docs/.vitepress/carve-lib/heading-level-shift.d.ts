import type { CarveExtension } from './extension.js';
/** Options for the {@link headingLevelShift} extension. */
export interface HeadingLevelShiftOptions {
    /**
     * Number of levels to shift every heading down (h1 -> h2, etc.). Clamped
     * to the range 0-5; a negative value becomes 0, a value above 5 becomes 5.
     * Default 1.
     */
    shift?: number;
}
/**
 * Shift every heading level down by a fixed offset, ported from carve-php's
 * HeadingLevelShiftExtension. Useful when h1 is reserved for the page title
 * and document headings should start at h2 or lower.
 *
 * A `beforeRender` transform: h1 -> h1+shift, capped at h6. Levels are
 * clamped to the range 0-5; the `<section>` id and other heading attributes
 * are preserved (only the level number changes).
 *
 * ```ts
 * carveToHtml('# Title', { extensions: [headingLevelShift({ shift: 1 })] })
 * // <section id="title"><h2>Title</h2></section>
 * ```
 */
export declare function headingLevelShift(opts?: HeadingLevelShiftOptions): CarveExtension;
//# sourceMappingURL=heading-level-shift.d.ts.map
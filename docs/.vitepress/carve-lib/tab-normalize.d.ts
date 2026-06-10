import type { CarveExtension } from './extension.js';
/**
 * Normalize tabs to spaces in code content on output.
 *
 * Carve preserves literal tabs in code blocks and inline code by default
 * (djot/CommonMark-aligned; tab display is a CSS `tab-size` concern). Add this
 * extension to expand each tab to a fixed number of spaces before rendering --
 * useful for fixed-width output without CSS (email, RSS, plain HTML).
 *
 * Flat replacement: every tab becomes exactly `width` spaces (no elastic tab
 * stops). Only code CONTENT is touched -- fenced code blocks and inline code
 * spans -- never prose, attributes, or structure. Default width is 2 (matching
 * djot's 2-space convention).
 *
 * @example
 * carveToHtml(src, { extensions: [tabNormalize()] })       // 2 spaces
 * carveToHtml(src, { extensions: [tabNormalize(4)] })      // 4 spaces
 */
export declare function tabNormalize(width?: number): CarveExtension;
//# sourceMappingURL=tab-normalize.d.ts.map
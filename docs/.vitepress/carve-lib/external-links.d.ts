import type { CarveExtension } from './extension.js';
/** Options for the {@link externalLinks} extension. */
export interface ExternalLinksOptions {
    /** `target` attribute value. Default `'_blank'`. */
    target?: string;
    /** `rel` attribute value. Default `'noopener noreferrer'`. */
    rel?: string;
    /** Append `nofollow` to `rel`. Default false. */
    nofollow?: boolean;
}
/**
 * Add `target` and `rel` to external links (`http(s)://…`), ported from
 * carve-php's ExternalLinksExtension. Runs as a `beforeRender` transform, so
 * the attributes it sets are emitted by the core link renderer.
 *
 * ```ts
 * carveToHtml('[docs](https://example.com)', { extensions: [externalLinks()] })
 * // <p><a href="https://example.com" target="_blank" rel="noopener noreferrer">docs</a></p>
 * ```
 */
export declare function externalLinks(opts?: ExternalLinksOptions): CarveExtension;
//# sourceMappingURL=external-links.d.ts.map
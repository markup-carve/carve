import type { CarveExtension } from './extension.js';
/** Options for the {@link autolink} extension. */
export interface AutolinkOptions {
    /**
     * URL schemes to linkify. `mailto` also enables `mailto:` links and bare
     * email addresses. Default `['https', 'http', 'mailto']`.
     */
    allowedSchemes?: string[];
}
/**
 * Linkify bare URLs and email addresses, ported from carve-php's
 * AutolinkExtension. Carve core leaves bare URLs literal (the Tier-1 default),
 * and angle autolinks `<url>` are already core; this Tier-2 extension opts into
 * linkifying plain `https://…`, `mailto:…`, and bare `a@b.com` text.
 *
 * ```ts
 * carveToHtml('Visit https://example.com today.', { extensions: [autolink()] })
 * // <p>Visit <a href="https://example.com">https://example.com</a> today.</p>
 * ```
 *
 * A trailing sentence punctuation mark is left outside the link, matching
 * carve-php.
 */
export declare function autolink(opts?: AutolinkOptions): CarveExtension;
//# sourceMappingURL=autolink.d.ts.map
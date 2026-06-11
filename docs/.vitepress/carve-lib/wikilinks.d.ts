import type { CarveExtension } from './extension.js';
/** Options for the {@link wikilinks} extension. */
export interface WikilinksOptions {
    /**
     * Maps a page name to a URL. Receives the page (anchor stripped) and
     * returns the href; the anchor, if any, is appended afterwards. Defaults
     * to a slugifier (lowercase, spaces to hyphens, unsafe chars dropped).
     */
    urlGenerator?: (page: string) => string;
    /** CSS class(es) added to the anchor. Default `'wikilink'`. */
    cssClass?: string;
    /** Open links in a new tab (`target="_blank" rel="noopener"`). Default false. */
    newWindow?: boolean;
}
/**
 * Parse `[[wikilinks]]` into navigational links, like Obsidian / MediaWiki.
 *
 * Forms: `[[Page]]`, `[[page|Display]]`, `[[page#anchor]]`, `[[folder/page]]`.
 * Uses the parse-stage inline matcher contract — core leaves `[[…]]` literal,
 * so this adds the syntax without hijacking any core construct.
 *
 * ```ts
 * carveToHtml('See [[Tigers]].', { extensions: [wikilinks()] })
 * // <p>See <a href="tigers" class="wikilink" data-wikilink="Tigers">Tigers</a>.</p>
 * ```
 */
export declare function wikilinks(opts?: WikilinksOptions): CarveExtension;
//# sourceMappingURL=wikilinks.d.ts.map
import type { Attrs, Document } from './ast.js';
import type { CarveExtension } from './extension.js';
export interface ParseOptions {
    positions?: boolean;
    /** Format label applied to a bare `---` frontmatter fence. Default 'yaml'. */
    defaultFrontmatterFormat?: string;
    /**
     * Fold auto-generated heading ids to ASCII (Über -> uber) for URL/CSS-fragment
     * portability. Default false: ids are lowercased (GitHub-style) but keep non-ASCII
     * verbatim. See markup-carve/carve#73.
     */
    asciiHeadingIds?: boolean;
    /**
     * Extensions whose parse-stage matchers (`matchInline` / `matchBlock`) add
     * syntax to the parse. Extensions with only render/transform hooks need not
     * be passed here; `carveToHtml` forwards them automatically.
     */
    extensions?: CarveExtension[];
}
export declare function parse(source: string, opts?: ParseOptions): Document;
/**
 * Normalize an explicit `[label]: url` reference label for matching:
 * whitespace-collapsed but case-SENSITIVE. Djot does "no case normalization
 * on reference definitions" (links_and_images spec), and Carve keeps a
 * case-mismatched reference unresolved -> literal (corpus 36). Implicit
 * heading references match heading TEXT and are fuzzier (case-insensitive);
 * they wrap this in heading-ids.ts rather than fold case here.
 */
export declare function normalizeRefLabel(label: string): string;
export declare function parseAttrs(src: string): Attrs;
//# sourceMappingURL=parse.d.ts.map
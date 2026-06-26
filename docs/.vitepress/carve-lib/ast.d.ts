export interface Position {
    /** 1-based line number, inclusive */
    startLine: number;
    /** 1-based line number, inclusive */
    endLine: number;
    /** 1-based column number, inclusive */
    startColumn?: number;
    /** 1-based column number, exclusive */
    endColumn?: number;
    /** 0-based UTF-16 source offset, inclusive */
    startOffset?: number;
    /** 0-based UTF-16 source offset, exclusive */
    endOffset?: number;
}
export interface Attrs {
    id?: string;
    classes?: string[];
    keyValues?: Record<string, string>;
    /**
     * Source-appearance order of the attribute slots, so the renderer can
     * emit them in the order the author wrote (matching djot + carve-php).
     * Entries: `'#id'` for the id, `'.class'` for the (merged) class group,
     * or a bare key name for a `key=value`. Each slot appears once, at its
     * first-appearance position. Absent on programmatically-built Attrs,
     * in which case the renderer falls back to a fixed id/class/key order.
     */
    order?: string[];
}
export interface BaseNode {
    attrs?: Attrs;
    pos?: Position;
}
export interface Document extends BaseNode {
    type: 'document';
    /**
     * Raw, uninterpreted frontmatter. `content` is the verbatim text between
     * the fences; `format` is the fence token (default `'yaml'`). Carve does
     * not parse it - the application interprets the declared format.
     */
    frontmatter?: {
        format: string;
        content: string;
    };
    children: BlockNode[];
    /**
     * Footnote definitions collected during parsing, keyed by raw label
     * (`[^label]: …`). The renderer numbers them by reference order and
     * emits the endnotes section; an unreferenced definition is dropped.
     */
    footnoteDefs?: Record<string, BlockNode[]>;
    /**
     * UTF-8 byte length of the source this document was parsed from. Used by the
     * renderers to size the abbreviation-expansion budget (DoS guard) so a tiny
     * input with a huge `*[KEY]: EXPANSION` def cannot amplify output without
     * bound. Absent when the document was constructed directly (not via parse);
     * renderers then fall back to the base budget.
     */
    srcByteLength?: number;
}
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export interface Heading extends BaseNode {
    type: 'heading';
    level: HeadingLevel;
    children: InlineNode[];
}
export interface Paragraph extends BaseNode {
    type: 'paragraph';
    children: InlineNode[];
}
export interface BlockQuote extends BaseNode {
    type: 'blockquote';
    children: BlockNode[];
    attribution?: InlineNode[];
}
export interface List extends BaseNode {
    type: 'list';
    ordered: boolean;
    start?: number;
    /** Ordered-list type attribute: a/A (alpha) or i/I (roman); absent = decimal. */
    olType?: 'a' | 'A' | 'i' | 'I';
    tight: boolean;
    items: ListItem[];
}
export interface ListItem extends BaseNode {
    type: 'list-item';
    /** undefined = plain bullet, true/false = task list (checked / unchecked) */
    checked?: boolean;
    children: BlockNode[];
}
export interface CodeBlock extends BaseNode {
    type: 'code-block';
    lang?: string;
    /**
     * Optional quoted "header" from the info string (```php "src/Auth.php").
     * A visible title carried to the `title` attribute on the `<pre>` (a code
     * block's `<pre><code>` is atomic, so the title rides as an attribute, not a
     * child element). A preceding `{title=...}` block-attribute line wins.
     */
    header?: string;
    /**
     * Optional bracketed label from the info string (```php [NPM] -> "NPM").
     * Structured metadata only: it is NOT part of the language/class. The core
     * renderer ignores it; an extension (e.g. code-group) may use it.
     */
    label?: string;
    content: string;
}
export interface ThematicBreak extends BaseNode {
    type: 'thematic-break';
}
export interface Table extends BaseNode {
    type: 'table';
    caption?: InlineNode[];
    rows: TableRow[];
}
export interface TableRow extends BaseNode {
    type: 'table-row';
    cells: TableCell[];
}
export interface TableCell extends BaseNode {
    type: 'table-cell';
    header: boolean;
    /** undefined = normal cell, 'rowspan' = `^`, 'colspan' = `<` */
    span?: 'rowspan' | 'colspan';
    /**
     * Explicit per-cell alignment from a tight prefix marker
     * (`>` right, `<` left, `~` center). When undefined the cell
     * inherits its column's alignment (taken from row 0).
     */
    align?: 'left' | 'right' | 'center';
    children: InlineNode[];
}
export interface Admonition extends BaseNode {
    type: 'admonition';
    kind: string;
    title?: InlineNode[];
    /**
     * Optional opener `[label]` grouping id (`::: tab [First]`). Inert in core
     * (not rendered); a group extension (tabs) uses it as the tab name. Mirrors
     * {@link CodeBlock.label}.
     */
    label?: string;
    children: BlockNode[];
}
/**
 * Generic fenced div — djot's generic container. A `:::` opener with NO
 * type word (bare `:::` or an attributes-only `::: {.class}`) is a Div;
 * a typed `::: word` is an Admonition (two-tier rule, PART 9 §12).
 * Renders to a plain `<div>` carrying its `attrs` (no class added).
 */
export interface Div extends BaseNode {
    type: 'div';
    /**
     * Optional opener `[label]` grouping id (bare `::: [First]`). Inert in core;
     * a group extension (tabs) uses it as the tab name. Mirrors
     * {@link CodeBlock.label}.
     */
    label?: string;
    children: BlockNode[];
}
/**
 * Definition list (§4.5): `:: term` lines (one or more) followed by
 * `:  definition` lines (one or more) form an entry; entries render to a
 * `<dl>` of `<dt>` (terms) then `<dd>` (definitions). `::` is exactly two
 * colons (three is a div/admonition); a definition line is colon + two
 * spaces; deeper-indented lines continue a definition.
 */
export interface DefinitionItem {
    terms: InlineNode[][];
    definitions: BlockNode[][];
}
export interface DefinitionList extends BaseNode {
    type: 'definition-list';
    items: DefinitionItem[];
}
export interface Figure extends BaseNode {
    type: 'figure';
    target: Image | BlockQuote | Table | CodeBlock | Paragraph;
    caption: InlineNode[];
}
export interface AbbreviationDef extends BaseNode {
    type: 'abbreviation-def';
    abbr: string;
    expansion: string;
}
export interface RawBlock extends BaseNode {
    type: 'raw-block';
    format: string;
    content: string;
}
export interface Comment extends BaseNode {
    type: 'comment';
    block: boolean;
    content: string;
}
export type BlockNode = Heading | Paragraph | BlockQuote | List | CodeBlock | ThematicBreak | Table | Admonition | Div | DefinitionList | Figure | Image | AbbreviationDef | RawBlock | Comment;
export interface Text extends BaseNode {
    type: 'text';
    value: string;
}
export interface Emphasis extends BaseNode {
    type: 'italic' | 'strong' | 'underline' | 'strike' | 'super' | 'sub' | 'highlight' | 'bold-italic';
    children: InlineNode[];
}
export interface InlineCode extends BaseNode {
    type: 'code';
    value: string;
}
export interface Link extends BaseNode {
    type: 'link';
    /**
     * Resolved hyperlink target. Always meaningful after `resolve()`.
     * Between parse() and resolve() this may be `''` on a Link node whose
     * `ref` is still set — that placeholder shape means "unresolved
     * reference; the resolve pass will finalize it" (see `ref` below).
     * After `resolve()`, any Link surviving in the tree has `ref` cleared
     * and a meaningful `href`.
     */
    href: string;
    title?: string;
    children: InlineNode[];
    /**
     * Internal placeholder: an unresolved reference label, set by the
     * inline scanner for `[text][ref]` / collapsed `[text][]`. The
     * resolution lifecycle is:
     *   1. applyLinkDefs (inside parse) matches against the document's
     *      explicit `[label]: url` defs; on hit it sets `href`/`title`
     *      and deletes `ref`/`rawRef`.
     *   2. resolveHeadingIds (inside resolve) matches still-unresolved
     *      refs against the document's headings (implicit references);
     *      on hit it sets `href` and deletes `ref`/`rawRef`.
     *   3. Anything still unresolved at the end of resolveHeadingIds is
     *      replaced with a Text node carrying `rawRef` (literal source).
     * Consumers that call parse() without resolve() will see a Link node
     * with `ref` set and `href: ''` for any genuinely-unresolvable input.
     */
    ref?: string;
    rawRef?: string;
    /**
     * Set by resolve() when this Link was produced from a `</#id>` cross-reference
     * (not an ordinary `[text](url)` link or an implicit `[label][]` reference).
     * Non-rendered metadata - every renderer ignores it; it lets a render-stage
     * extension (HeadingNumbers, #198) rewrite only auto-filled cross-references
     * without a fragile title-equality guess.
     */
    fromCrossref?: boolean;
}
export interface Image extends BaseNode {
    type: 'image';
    src: string;
    alt: string;
    title?: string;
}
/** Inline span: `[text]{attrs}` -> <span {attrs}>text</span> (PART 9 §14). */
export interface Span extends BaseNode {
    type: 'span';
    children: InlineNode[];
}
/**
 * Math, djot form: inline `` $`x` `` and display `` $$`x` ``. `content`
 * is verbatim LaTeX from the backtick span; rendering wraps it in
 * `\(…\)` (inline) or `\[…\]` (display) inside `<span class="math …">`.
 */
export interface Math extends BaseNode {
    type: 'math';
    display: boolean;
    content: string;
}
/**
 * Raw inline passthrough (djot `` `…`{=format} ``): a verbatim span tagged
 * with an output format. Emitted verbatim when `format` matches the
 * renderer's output (html), dropped otherwise.
 */
export interface RawInline extends BaseNode {
    type: 'raw-inline';
    format: string;
    content: string;
}
/**
 * Emoji shortcode `:name:` (djot symbols). Resolved against a
 * processor-supplied name->glyph map at render time; an unmapped name
 * renders literally as `:name:`.
 */
export interface Emoji extends BaseNode {
    type: 'emoji';
    name: string;
}
export interface AutoLink extends BaseNode {
    type: 'autolink';
    href: string;
}
export interface CrossRef extends BaseNode {
    type: 'crossref';
    /** Raw id between `</#` and `>`. */
    target: string;
}
/**
 * Caption number placeholder (the bare `#` in `^ Figure #: …`). Emitted
 * only in caption context; `resolve()` fills `n` with the assigned number.
 * Renders as the number text.
 */
export interface CaptionNumber extends BaseNode {
    type: 'caption-number';
    /** Assigned during resolve; undefined until then. */
    n?: number;
}
/** One citation item inside a citation group. */
export interface Citation {
    key: string;
    /** Inline prefix text before the `@` (e.g. "see "). */
    prefix?: InlineNode[];
    /** Raw inline locator after ", " (e.g. "p. 33"); what the built-in
     *  formatter prints. Retained for byte-stable visible output. */
    locator?: InlineNode[];
    /** Canonical citeproc locator label (e.g. "page"), parsed from `locator`. */
    locatorLabel?: string;
    /** Locator value (plain text, e.g. "33-35, 38"), parsed from `locator`. */
    locatorValue?: string;
    /** Inline suffix after the locator value (e.g. "and <em>passim</em>"). */
    suffix?: InlineNode[];
    /** `-@key` suppresses the author in author-date mode. */
    suppressAuthor: boolean;
    /** Assigned during resolve (numbered mode); undefined if key undefined. */
    number?: number;
    /** Per-key, document-wide use-site index (1-based), assigned when a
     *  bibliography pool is supplied; drives back-link anchors (#199). */
    useIndex?: number;
}
/** A `[…@key…]` citation, possibly several `;`-separated items (#90, Tier-2). */
export interface CitationGroup extends BaseNode {
    type: 'citation-group';
    items: Citation[];
    /** Citation-level mode; set by a leading '+' after '['. Absent = non-integral (parenthetical). CSL/Citum CitationMode vocabulary. */
    mode?: 'integral';
    /** Verbatim source `[…]` for the undefined-key literal fallback. */
    raw: string;
}
export interface Mention extends BaseNode {
    type: 'mention';
    user: string;
}
export interface Tag extends BaseNode {
    type: 'tag';
    name: string;
}
export interface Extension extends BaseNode {
    type: 'extension';
    name: string;
    content: InlineNode[];
}
export interface Abbreviation extends BaseNode {
    type: 'abbreviation';
    abbr: string;
    expansion: string;
}
export interface Footnote extends BaseNode {
    type: 'footnote';
    /** Reference label (`[^label]`); resolved against Document.footnoteDefs. */
    id?: string;
    inline?: InlineNode[];
    /** Renderer-assigned 1-based number, by document reference order. */
    number?: number;
    /** Renderer-assigned unique id for this reference (a backlink target). */
    refId?: string;
}
export interface SoftBreak extends BaseNode {
    type: 'soft-break';
}
export interface HardBreak extends BaseNode {
    type: 'hard-break';
}
export interface CriticInsert extends BaseNode {
    type: 'critic-insert';
    children: InlineNode[];
}
export interface CriticDelete extends BaseNode {
    type: 'critic-delete';
    children: InlineNode[];
}
export interface CriticSubstitute extends BaseNode {
    type: 'critic-substitute';
    oldText: string;
    newText: string;
}
export interface CriticComment extends BaseNode {
    type: 'critic-comment';
    text: string;
}
export type InlineNode = Text | Emphasis | InlineCode | Link | Image | Span | Math | RawInline | Emoji | AutoLink | CrossRef | CaptionNumber | CitationGroup | Mention | Tag | Extension | Abbreviation | Footnote | SoftBreak | HardBreak | CriticInsert | CriticDelete | CriticSubstitute | CriticComment | Comment;
export type AnyNode = Document | BlockNode | InlineNode;
//# sourceMappingURL=ast.d.ts.map
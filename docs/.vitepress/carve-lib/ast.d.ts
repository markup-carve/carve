export interface Position {
    /** 1-based line number, inclusive */
    startLine: number;
    /** 1-based line number, inclusive */
    endLine: number;
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
    frontmatter?: Record<string, unknown>;
    children: BlockNode[];
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
    children: BlockNode[];
}
export interface Figure extends BaseNode {
    type: 'figure';
    target: Image | BlockQuote | Table;
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
export type BlockNode = Heading | Paragraph | BlockQuote | List | CodeBlock | ThematicBreak | Table | Admonition | Figure | Image | AbbreviationDef | RawBlock | Comment;
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
export interface AutoLink extends BaseNode {
    type: 'autolink';
    href: string;
}
export interface CrossRef extends BaseNode {
    type: 'crossref';
    /** Raw id between `</#` and `>`. */
    target: string;
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
    /** Either a reference id (defined elsewhere) or inline content */
    id?: string;
    inline?: InlineNode[];
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
export interface CriticHighlight extends BaseNode {
    type: 'critic-highlight';
    children: InlineNode[];
}
export interface CriticComment extends BaseNode {
    type: 'critic-comment';
    text: string;
}
export type InlineNode = Text | Emphasis | InlineCode | Link | Image | Span | AutoLink | CrossRef | Mention | Tag | Extension | Abbreviation | Footnote | SoftBreak | HardBreak | CriticInsert | CriticDelete | CriticSubstitute | CriticHighlight | CriticComment;
export type AnyNode = Document | BlockNode | InlineNode;
//# sourceMappingURL=ast.d.ts.map
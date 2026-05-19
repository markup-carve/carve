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
    href: string;
    title?: string;
    children: InlineNode[];
}
export interface Image extends BaseNode {
    type: 'image';
    src: string;
    alt: string;
    title?: string;
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
export type InlineNode = Text | Emphasis | InlineCode | Link | Image | AutoLink | CrossRef | Mention | Tag | Extension | Abbreviation | Footnote | SoftBreak | HardBreak | CriticInsert | CriticDelete | CriticSubstitute | CriticHighlight | CriticComment;
export type AnyNode = Document | BlockNode | InlineNode;
//# sourceMappingURL=ast.d.ts.map
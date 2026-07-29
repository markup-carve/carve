/*
 * Carve AST node definitions.
 *
 * The spec lives in markup-carve/carve. Node names here match the
 * constructs the case-study + EBNF grammar describe. Implementations
 * of M1 (block parser) and M2 (inline parser) populate these node
 * types; M3 (HTML renderer) reads them.
 *
 * All nodes carry an optional `attrs` field — `{#id .class key=value}`
 * blocks attach to whatever node they immediately follow.
 */
// ----- Inline nodes -----
/**
 * Canonical glyph per smart-typography kind.
 *
 * Presentation renderers resolve a kind through this table; the Carve renderer
 * ignores it and emits the author's source run instead. Quote kinds are absent
 * on purpose: their glyph is locale-dependent and is recorded on the node.
 */
export const SMART_PUNCTUATION_GLYPHS = {
    ellipsis: '…',
    em_dash: '—',
    en_dash: '–',
    left_right_arrow: '↔',
    rightwards_arrow: '→',
    leftwards_arrow: '←',
    rightwards_double_arrow: '⇒',
    less_than_or_equal: '≤',
    greater_than_or_equal: '≥',
    not_equal: '≠',
    plus_minus: '±',
    copyright: '©',
    registered: '®',
    trademark: '™',
};
//# sourceMappingURL=ast.js.map
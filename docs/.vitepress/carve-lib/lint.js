/*
 * Semantic lint for Carve documents.
 *
 * djotMigrationWarnings (djot-migrate.ts) catches *source-level* delimiter
 * collisions. This module catches *semantic* problems that need the parsed
 * tree: references that silently degrade to literal text at resolve() time.
 *
 * The checks run on parse() output and mirror resolveHeadingIds so they agree
 * with what the resolver actually does - they do not re-run resolve (which
 * would discard the very nodes we want to flag by turning a broken crossref
 * or unresolved ref into a Text node).
 */
import { parse } from './parse.js';
import { slugify, inlineText } from './heading-ids.js';
function locate(node) {
    const p = node.pos;
    return {
        line: p?.startLine ?? 1,
        column: p?.startColumn ?? 1,
        start: p?.startOffset ?? 0,
        end: p?.endOffset ?? p?.startOffset ?? 0,
    };
}
/** Every `crossref` node anywhere under `doc.children`, with its raw target. */
function collectCrossrefs(doc) {
    const found = [];
    const visit = (value) => {
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item);
            return;
        }
        if (value && typeof value === 'object') {
            const node = value;
            if (node.type === 'crossref' && typeof node.target === 'string') {
                found.push({ target: node.target, node: node });
            }
            // Recurse into child containers; pos/attrs hold no inline nodes.
            for (const key of Object.keys(node)) {
                if (key !== 'pos' && key !== 'attrs')
                    visit(node[key]);
            }
        }
    };
    visit(doc.children);
    return found;
}
/**
 * Lint a Carve document for semantic problems that render as literal text:
 * duplicate heading ids and `</#id>` cross-references with no target.
 *
 * `asciiHeadingIds` must match the value passed to `resolve()`, since it
 * changes how heading slugs (and therefore the valid id set) are computed.
 */
export function lintCarve(source, opts = {}) {
    const doc = parse(source, { positions: true });
    const asciiFold = opts.asciiHeadingIds ?? false;
    const out = [];
    // Build the final heading-id set exactly as resolveHeadingIds does
    // (explicit ids win; colliding slugs get a `-2`, `-3`, … suffix), and warn
    // on every collision along the way.
    const used = new Set();
    for (const block of doc.children) {
        if (block.type !== 'heading')
            continue;
        const heading = block;
        const explicit = heading.attrs?.id;
        if (explicit) {
            if (used.has(explicit)) {
                out.push({
                    ...locate(heading),
                    rule: 'duplicate-heading-id',
                    message: `Duplicate heading id "${explicit}": the repeated HTML id is invalid, and cross-references to it resolve to the first occurrence.`,
                });
            }
            used.add(explicit);
            continue;
        }
        const base = slugify(inlineText(heading.children), asciiFold);
        if (!base)
            continue;
        if (used.has(base)) {
            let n = 2;
            while (used.has(`${base}-${n}`))
                n++;
            const id = `${base}-${n}`;
            out.push({
                ...locate(heading),
                rule: 'duplicate-heading-id',
                message: `Heading slug "${base}" collides with an earlier heading; its auto id becomes "${id}", and ambiguous references to "${base}" resolve to the first occurrence.`,
            });
            used.add(id);
        }
        else {
            used.add(base);
        }
    }
    // `used` now holds every valid id. A crossref to anything else degrades to
    // literal text in resolveHeadingIds.
    for (const { target, node } of collectCrossrefs(doc)) {
        if (used.has(target))
            continue;
        out.push({
            ...locate(node),
            rule: 'broken-crossref',
            message: `Cross-reference </#${target}> has no matching heading id; it renders as the literal text "</#${target}>".`,
        });
    }
    out.sort((a, b) => a.start - b.start || a.line - b.line || a.column - b.column);
    return out;
}
/** Format lint warnings as `file:line:col rule — message`. */
export function formatLintWarnings(warnings, file = '<stdin>') {
    return warnings
        .map((w) => `${file}:${w.line}:${w.column} ${w.rule} — ${w.message}`)
        .join('\n');
}
//# sourceMappingURL=lint.js.map
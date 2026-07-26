import { utf8ByteLength } from './abbr-budget.js';
import { inlineText, slugify } from './heading-ids.js';
import { parse, normalizeRefLabel } from './parse.js';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
const DIRECTIVE_SCAN_RE = /\{\{\s+(?:"((?:\\.|[^"\\])*)"|\u201c([^\u201d]*)\u201d|([^#@}\s"\u201c]+))((?:\s+#[A-Za-z_][\w-]*)?)(.*?)\s+\}\}/g;
const DIRECTIVE_FULL_RE = /^\{\{\s+(?:"((?:\\.|[^"\\])*)"|\u201c([^\u201d]*)\u201d|([^#@}\s"\u201c]+))((?:\s+#[A-Za-z_][\w-]*)?)(.*?)\s+\}\}$/;
const OPTION_RE = /^@([A-Za-z_][\w-]*):([^#@}\s]+)$/;
/** Loose directive shape: one whole-paragraph token, valid options or not. */
const DIRECTIVE_SHAPE_RE = /^\{\{[^{}]*\}\}$/;
const MIN_BUDGET = 1024 * 1024;
function locate(node) {
    const p = node.pos;
    return {
        line: p?.startLine ?? 1,
        column: p?.startColumn ?? 1,
        start: p?.startOffset ?? 0,
        end: p?.endOffset ?? p?.startOffset ?? 0,
    };
}
function warn(state, rule, message, node) {
    state.warnings.push({ ...locate(node ?? {}), rule, message });
}
function unescapeQuotedPath(path) {
    return path.replace(/\\(["\\])/g, '$1');
}
function parseDirective(raw, onInvalidOption) {
    const m = DIRECTIVE_FULL_RE.exec(raw);
    if (!m)
        return null;
    const path = m[1] !== undefined ? unescapeQuotedPath(m[1]) : m[2] ?? m[3];
    const sectionPart = m[4]?.trim();
    const section = sectionPart ? sectionPart.slice(1) : undefined;
    let lines;
    let shift = 0;
    const rest = m[5]?.trim();
    if (rest) {
        for (const part of rest.split(/\s+/)) {
            const opt = OPTION_RE.exec(part);
            const invalid = () => {
                // Spec I1: an unrecognized (or malformed) option makes the directive
                // unresolvable - Warning + literal, never silent.
                if (part.startsWith('@'))
                    onInvalidOption?.(part);
                return null;
            };
            if (!opt)
                return invalid();
            const [, key, value] = opt;
            if (key === 'lines') {
                const lm = /^([1-9]\d*)-([1-9]\d*)$/.exec(value);
                if (!lm)
                    return invalid();
                lines = { start: Number(lm[1]), end: Number(lm[2]) };
                if (lines.end < lines.start)
                    return invalid();
            }
            else if (key === 'shift') {
                // Spec I8: a signed integer or the literal "auto", never both forms.
                if (value === 'auto')
                    shift = 'auto';
                else if (!/^[+-]?\d+$/.test(value))
                    return invalid();
                else
                    shift = Number(value);
            }
            else {
                return invalid();
            }
        }
    }
    const directive = { raw, path, shift };
    if (section !== undefined)
        directive.section = section;
    if (lines !== undefined)
        directive.lines = lines;
    return directive;
}
function sourceLines(source) {
    const lines = source.split(/\n/);
    if (lines.length && lines[lines.length - 1] === '')
        lines.pop();
    return lines;
}
function sliceLines(source, range) {
    return sourceLines(source).slice(range.start - 1, range.end).join('\n');
}
function childContext(state) {
    const ctx = {
        stack: [...state.stack],
        depth: state.depth,
    };
    if (state.opts.sourcePath !== undefined)
        ctx.sourcePath = state.opts.sourcePath;
    return ctx;
}
/**
 * Record an include target for host file watching. Deduplicated by id, first
 * encounter fixes the order, and a later successful read upgrades an entry
 * that was first seen unresolved.
 */
function note(state, id, resolved) {
    if (resolved || !state.dependencies.has(id))
        state.dependencies.set(id, resolved);
}
function resolveChild(d, state, node) {
    if (!state.opts.resolve)
        return null;
    if (d.section && d.lines) {
        warn(state, 'include-selection-conflict', `Include "${d.path}" cannot use both #section and @lines.`, node);
        return null;
    }
    if (state.depth >= state.maxDepth) {
        // Never handed to the resolver, but still a target the host may want to
        // watch, so it is reported as unresolved rather than dropped.
        note(state, d.path, false);
        warn(state, 'include-depth', `Include depth limit of ${state.maxDepth} exceeded for "${d.path}".`, node);
        return null;
    }
    let resolved;
    try {
        resolved = state.opts.resolve(d.path, childContext(state));
    }
    catch (e) {
        note(state, d.path, false);
        warn(state, 'include-unresolved', `Include "${d.path}" could not be resolved: ${e.message}`, node);
        return null;
    }
    if (resolved === null || resolved === undefined) {
        // Covers missing files and containment denials alike: the resolver reports
        // both as null, and a host wants to re-check either if the tree changes.
        note(state, d.path, false);
        warn(state, 'include-unresolved', `Include "${d.path}" could not be resolved.`, node);
        return null;
    }
    const source = typeof resolved === 'string' ? resolved : resolved.source;
    const id = typeof resolved === 'string' ? d.path : resolved.id ?? d.path;
    if (typeof source !== 'string' || source.includes('\0')) {
        note(state, id, false);
        warn(state, 'include-non-text', `Include "${d.path}" did not resolve to text.`, node);
        return null;
    }
    note(state, id, true);
    // The cycle guard compares canonical ids after resolution, so a resolver
    // that supplies ids catches "b.crv" vs "./b.crv" spellings of one file.
    if (state.stack.includes(id)) {
        warn(state, 'include-cycle', `Include cycle detected for "${d.path}".`, node);
        return null;
    }
    const bytes = utf8ByteLength(source);
    if (state.usedBytes + bytes > state.maxBytes) {
        warn(state, 'include-budget', `Include byte budget exceeded by "${d.path}".`, node);
        return null;
    }
    state.usedBytes += bytes;
    return { source: d.lines ? sliceLines(source, d.lines) : source, id };
}
function headingId(h) {
    return h.attrs?.id ?? slugify(inlineText(h.children));
}
function selectSection(doc, section) {
    const start = doc.children.findIndex((b) => b.type === 'heading' && headingId(b) === section);
    if (start < 0)
        return null;
    const level = doc.children[start].level;
    let end = start + 1;
    while (end < doc.children.length) {
        const b = doc.children[end];
        if (b.type === 'heading' && b.level <= level)
            break;
        end++;
    }
    return doc.children.slice(start, end);
}
function shiftBlocks(blocks, shift, state) {
    if (shift === 0)
        return;
    const visit = (node) => {
        switch (node.type) {
            case 'heading': {
                const shifted = node.level + shift;
                const clamped = Math.min(6, Math.max(1, shifted));
                if (clamped !== shifted) {
                    warn(state, 'include-heading-clamp', `Included heading level ${shifted} was clamped to ${clamped}.`, node);
                }
                node.level = clamped;
                break;
            }
            case 'blockquote':
            case 'div':
            case 'admonition':
                node.children.forEach(visit);
                break;
            case 'list':
                for (const item of node.items)
                    item.children.forEach(visit);
                break;
            case 'definition-list':
                for (const item of node.items)
                    for (const def of item.definitions)
                        def.forEach(visit);
                break;
            case 'figure':
                if (node.target.type === 'blockquote')
                    visit(node.target);
                break;
        }
    };
    blocks.forEach(visit);
}
function expandChild(d, state, node) {
    const resolved = resolveChild(d, state, node);
    if (resolved === null)
        return null;
    const child = parse(resolved.source, { positions: true });
    // Select before expanding: nested includes outside the wanted section must
    // not be resolved (no budget charge) and must not move section boundaries.
    if (d.section) {
        const selected = selectSection(child, d.section);
        if (!selected) {
            // Same attempt, not a second one: the file was read but the include did
            // not expand, so the entry is forced back to unresolved rather than
            // going through note()'s upgrade rule. A host must still watch the
            // target and must not treat the include as having succeeded.
            state.dependencies.set(resolved.id, false);
            warn(state, 'include-section', `Include "${d.path}" has no section "#${d.section}".`, node);
            return null;
        }
        child.children = selected;
    }
    renameChildHeadingIds(child, state);
    const auto = d.shift === 'auto';
    const stated = auto ? 0 : d.shift;
    state.stack.push(resolved.id);
    state.depth++;
    state.docs.push(child);
    // The child is shifted only after its own includes are expanded, so inside
    // it the inherited context is expressed in pre-shift coordinates: a stated
    // shift is known now and translated out, and once it lands a nested "auto"
    // sits where the assembled document says it should.
    //
    // "auto" is not translated because its offset is not known yet - it is
    // measured over the assembled content below, which is exactly what makes it
    // self-consistent: whatever level the nested content settles at is the level
    // the measurement then reads.
    const outerContext = state.contextLevel;
    state.contextLevel = outerContext - stated;
    expandBlocks(child.children, state);
    if (child.footnoteDefs) {
        // A footnote body is its own container: no heading precedes it.
        for (const body of Object.values(child.footnoteDefs)) {
            state.contextLevel = 0;
            expandBlocks(body, state);
        }
    }
    state.contextLevel = outerContext;
    state.docs.pop();
    state.depth--;
    state.stack.pop();
    // Measured after expansion so a child that only passes through to nested
    // includes is levelled by the headings those actually contributed.
    shiftBlocks(child.children, auto ? autoShift(child, state) : stated, state);
    return child;
}
/**
 * Spec I8 `@shift:auto`: N = (C + 1) - T, where C is the context level at the
 * include site and T the minimum heading level in the resolved content.
 *
 * The minimum rather than the first heading's level, so the child's internal
 * relative structure survives: a child whose h1 is followed by an h2 keeps
 * that one-level gap wherever it lands. Content with no headings is a no-op
 * (N = 0) and warns about nothing, which also covers inline includes, whose
 * content cannot contain a heading.
 *
 * Called after the child's own includes are expanded, so headings a child
 * contributes only by including another file still count.
 */
function autoShift(child, state) {
    let top = null;
    walkBlocks(child.children, (block) => {
        if (block.type === 'heading' && (top === null || block.level < top))
            top = block.level;
    });
    if (top === null)
        return 0;
    return state.contextLevel + 1 - top;
}
/**
 * Merge-time collision pass for explicit heading ids (spec I5): parent ids and
 * earlier includes win, a later duplicate gets the least free "-N" suffix, and
 * the child's own crossrefs follow the rename so they keep resolving within
 * the child's scope. Runs depth-first at merge time because after splicing,
 * file provenance (which crossref belongs to which file) is gone.
 */
function renameChildHeadingIds(child, state) {
    const rename = new Map();
    walkBlocks(child.children, (block) => {
        if (block.type !== 'heading' || block.attrs?.id === undefined)
            return;
        const id = block.attrs.id;
        if (!state.usedHeadingIds.has(id)) {
            state.usedHeadingIds.add(id);
            return;
        }
        const renamed = nextFree(id, state.usedHeadingIds);
        block.attrs.id = renamed;
        state.usedHeadingIds.add(renamed);
        rename.set(id, renamed);
        warn(state, 'include-heading-id-rename', `Heading id "${id}" was renamed to "${renamed}".`, block);
    });
    if (rename.size) {
        renameInBlocks(child.children, new Map(), rename);
        if (child.footnoteDefs) {
            for (const body of Object.values(child.footnoteDefs))
                renameInBlocks(body, new Map(), rename);
        }
    }
}
function textFrom(value, like) {
    return { ...like, value };
}
function isRunNode(node) {
    return node.type === 'text' || node.type === 'mention' || node.type === 'tag';
}
function runNodeText(node) {
    if (node.type === 'text')
        return node.value;
    return node.type === 'mention' ? `@${node.user}` : `#${node.name}`;
}
/**
 * Return the run nodes covering [from, to) of the run's reassembled text.
 * Directive matches start with "{{" and end with "}}", which the core always
 * parses as text, so a boundary can only fall inside a text node; mention and
 * tag nodes are either fully kept or fully consumed by a directive span.
 */
function sliceRun(run, from, to) {
    const out = [];
    let offset = 0;
    for (const node of run) {
        const text = runNodeText(node);
        const start = offset;
        const end = offset + text.length;
        offset = end;
        if (end <= from || start >= to)
            continue;
        if (node.type !== 'text') {
            out.push(node);
            continue;
        }
        const value = text.slice(Math.max(from, start) - start, Math.min(to, end) - start);
        if (value === text)
            out.push(node);
        else if (value !== '')
            out.push(textFrom(value, node));
    }
    return out;
}
/**
 * Scan a contiguous run of text-like inline nodes (text, mention, tag) for
 * directives. The core splits "{{ x #s @shift:1 }}" into text plus tag and
 * mention nodes, so recognition reassembles the run before matching. Failed
 * directives keep their original nodes, rendering exactly as the core does
 * with no resolver.
 */
function expandRun(run, state) {
    const full = run.map(runNodeText).join('');
    const anchor = run.find((n) => n.type === 'text') ?? { type: 'text', value: full };
    const re = new RegExp(DIRECTIVE_SCAN_RE.source, 'g');
    const spans = [];
    for (let m = re.exec(full); m; m = re.exec(full)) {
        const raw = m[0];
        const d = parseDirective(raw, (part) => warn(state, 'include-unknown-option', `Unknown include option "${part}".`, anchor));
        if (!d)
            continue;
        const child = expandChild(d, state, anchor);
        if (!child)
            continue;
        if (child.children.length === 0 || (child.children.length === 1 && child.children[0].type === 'paragraph')) {
            const replacement = child.children.length === 1 ? child.children[0].children : [];
            mergeFootnotes(state.docs[state.docs.length - 1], child, state);
            spans.push({ start: m.index, end: m.index + raw.length, replacement });
        }
        else {
            warn(state, 'include-block-in-inline', `Inline include "${d.path}" resolved to block content.`, anchor);
        }
    }
    if (spans.length === 0)
        return run;
    const out = [];
    let cursor = 0;
    for (const span of spans) {
        out.push(...sliceRun(run, cursor, span.start));
        out.push(...span.replacement);
        cursor = span.end;
    }
    out.push(...sliceRun(run, cursor, full.length));
    return out;
}
function expandInlines(nodes, state) {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isRunNode(node)) {
            // A directive split across other inline structures (emphasis, links)
            // stays literal by design (corpus pin: "bare-path directive with no
            // active inline markers"); only text/mention/tag runs reassemble.
            let j = i;
            while (j < nodes.length && isRunNode(nodes[j]))
                j++;
            out.push(...expandRun(nodes.slice(i, j), state));
            i = j - 1;
        }
        else {
            switch (node.type) {
                case 'italic':
                case 'strong':
                case 'underline':
                case 'strike':
                case 'super':
                case 'sub':
                case 'highlight':
                case 'bold-italic':
                case 'link':
                case 'span':
                case 'critic-insert':
                case 'critic-delete':
                    node.children = expandInlines(node.children, state);
                    break;
                case 'extension':
                    node.content = expandInlines(node.content, state);
                    break;
                case 'footnote':
                    if (node.inline)
                        node.inline = expandInlines(node.inline, state);
                    break;
                case 'citation-group':
                    for (const item of node.items) {
                        if (item.prefix)
                            item.prefix = expandInlines(item.prefix, state);
                        if (item.locator)
                            item.locator = expandInlines(item.locator, state);
                        if (item.suffix)
                            item.suffix = expandInlines(item.suffix, state);
                    }
                    break;
            }
            out.push(node);
        }
    }
    return out;
}
function directiveSource(nodes) {
    let out = '';
    for (const node of nodes) {
        switch (node.type) {
            case 'text':
                out += node.value;
                break;
            case 'mention':
                out += `@${node.user}`;
                break;
            case 'tag':
                out += `#${node.name}`;
                break;
            default:
                return null;
        }
    }
    return out;
}
function renameInlines(nodes, footnotes, headings) {
    for (const node of nodes) {
        if (node.type === 'footnote' && node.id !== undefined)
            node.id = footnotes.get(node.id) ?? node.id;
        if (node.type === 'crossref')
            node.target = headings.get(node.target) ?? node.target;
        if ('children' in node && Array.isArray(node.children))
            renameInlines(node.children, footnotes, headings);
        if (node.type === 'extension')
            renameInlines(node.content, footnotes, headings);
        if (node.type === 'footnote' && node.inline)
            renameInlines(node.inline, footnotes, headings);
        if (node.type === 'citation-group') {
            for (const item of node.items) {
                if (item.prefix)
                    renameInlines(item.prefix, footnotes, headings);
                if (item.locator)
                    renameInlines(item.locator, footnotes, headings);
                if (item.suffix)
                    renameInlines(item.suffix, footnotes, headings);
            }
        }
    }
}
function renameInBlocks(blocks, footnotes, headings) {
    walkBlocks(blocks, (block) => {
        switch (block.type) {
            case 'heading':
            case 'paragraph':
                renameInlines(block.children, footnotes, headings);
                break;
            case 'table':
                if (block.caption)
                    renameInlines(block.caption, footnotes, headings);
                for (const row of block.rows)
                    for (const cell of row.cells)
                        renameInlines(cell.children, footnotes, headings);
                break;
            case 'figure':
                renameInlines(block.caption, footnotes, headings);
                if (block.target.type === 'paragraph')
                    renameInlines(block.target.children, footnotes, headings);
                if (block.target.type === 'table' && block.target.caption)
                    renameInlines(block.target.caption, footnotes, headings);
                break;
        }
    });
}
function mergeFootnotes(target, child, state) {
    if (!child.footnoteDefs)
        return;
    target.footnoteDefs = target.footnoteDefs ?? {};
    const rename = new Map();
    for (const label of Object.keys(child.footnoteDefs)) {
        const taken = Object.keys(target.footnoteDefs).some((existing) => normalizeRefLabel(existing) === normalizeRefLabel(label));
        const finalLabel = taken ? nextFree(label, new Set(Object.keys(target.footnoteDefs))) : label;
        if (finalLabel !== label) {
            rename.set(label, finalLabel);
            warn(state, 'include-footnote-rename', `Footnote label "${label}" was renamed to "${finalLabel}".`);
        }
        target.footnoteDefs[finalLabel] = child.footnoteDefs[label];
    }
    if (rename.size)
        renameInBlocks(child.children, rename, new Map());
}
function expandParagraph(block, state) {
    const source = directiveSource(block.children);
    if (source !== null) {
        const text = block.children.find((node) => node.type === 'text') ?? { type: 'text', value: source };
        const d = parseDirective(source, (part) => warn(state, 'include-unknown-option', `Unknown include option "${part}".`, text));
        if (d) {
            const child = expandChild(d, state, text);
            if (!child) {
                // Degrade to literal: the original inline nodes render exactly as the
                // core does with no resolver (spec I7).
                return [block];
            }
            mergeFootnotes(state.docs[state.docs.length - 1], child, state);
            return child.children;
        }
        // A whole-paragraph directive that failed to parse was already reported
        // here; skip the inline scan so it is not warned about twice.
        if (DIRECTIVE_SHAPE_RE.test(source.trim()))
            return [block];
    }
    block.children = expandInlines(block.children, state);
    return [block];
}
function expandBlocks(blocks, state) {
    // Spec I8: this block list is one container. Headings in it set the context
    // for later blocks and for containers nested inside it, but the entry value
    // is restored on exit so a closed sibling container never sets context.
    const entryContext = state.contextLevel;
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        let replacement = null;
        switch (block.type) {
            case 'paragraph':
                replacement = expandParagraph(block, state);
                break;
            case 'blockquote':
            case 'div':
            case 'admonition':
                expandBlocks(block.children, state);
                break;
            case 'list':
                for (const item of block.items)
                    expandBlocks(item.children, state);
                break;
            case 'definition-list':
                for (const item of block.items)
                    for (const def of item.definitions)
                        expandBlocks(def, state);
                break;
            case 'figure':
                if (block.target.type === 'blockquote')
                    expandBlocks(block.target.children, state);
                else if (block.target.type === 'paragraph')
                    block.target.children = expandInlines(block.target.children, state);
                if (block.caption)
                    block.caption = expandInlines(block.caption, state);
                break;
            case 'heading':
                block.children = expandInlines(block.children, state);
                state.contextLevel = block.level;
                break;
            case 'table':
                if (block.caption)
                    block.caption = expandInlines(block.caption, state);
                for (const row of block.rows)
                    for (const cell of row.cells)
                        cell.children = expandInlines(cell.children, state);
                break;
        }
        if (replacement) {
            blocks.splice(i, 1, ...replacement);
            i += replacement.length - 1;
            // The merged blocks are now part of this container, so a heading they
            // contribute at this level sets the context for what follows - "the
            // document as assembled" (spec I8).
            for (const merged of replacement) {
                if (merged.type === 'heading')
                    state.contextLevel = merged.level;
            }
        }
    }
    state.contextLevel = entryContext;
}
function walkBlocks(blocks, fn) {
    for (const block of blocks) {
        fn(block);
        switch (block.type) {
            case 'blockquote':
            case 'div':
            case 'admonition':
                walkBlocks(block.children, fn);
                break;
            case 'list':
                for (const item of block.items)
                    walkBlocks(item.children, fn);
                break;
            case 'definition-list':
                for (const item of block.items)
                    for (const def of item.definitions)
                        walkBlocks(def, fn);
                break;
            case 'figure':
                if (block.target.type === 'blockquote')
                    walkBlocks(block.target.children, fn);
                break;
        }
    }
}
function nextFree(base, used) {
    let n = 2;
    while (used.has(`${base}-${n}`))
        n++;
    return `${base}-${n}`;
}
/**
 * Expand processor-level `{{ ... }}` include directives in an already-parsed AST.
 *
 * With no resolver, directives remain ordinary text and no warnings are emitted.
 */
export function expandIncludes(doc, source, options = {}) {
    const state = {
        opts: options,
        warnings: [],
        maxDepth: options.maxDepth ?? 16,
        maxBytes: options.maxBytes ?? Math.max(MIN_BUDGET, 8 * utf8ByteLength(source)),
        usedBytes: 0,
        stack: options.sourcePath ? [options.sourcePath] : [],
        depth: 0,
        docs: [doc],
        usedHeadingIds: new Set(),
        dependencies: new Map(),
        contextLevel: 0,
    };
    // Recognition needs a parse, but a document whose source contains no "{{"
    // at all cannot contain a directive in any position, so the AST walk is
    // skipped outright. This keeps directive-free documents at parse cost.
    if (options.resolve && source.includes('{{')) {
        // Parent explicit ids are claimed first (spec I5: parent before child), so
        // an included duplicate is the one renamed - even against a parent heading
        // after the include site.
        walkBlocks(doc.children, (block) => {
            if (block.type === 'heading' && block.attrs?.id !== undefined)
                state.usedHeadingIds.add(block.attrs.id);
        });
        expandBlocks(doc.children, state);
        if (doc.footnoteDefs) {
            // Each footnote body is its own container, with no preceding heading.
            for (const body of Object.values(doc.footnoteDefs)) {
                state.contextLevel = 0;
                expandBlocks(body, state);
            }
        }
    }
    return {
        doc,
        warnings: state.warnings,
        dependencies: [...state.dependencies].map(([id, resolved]) => ({ id, resolved })),
    };
}
/** Filesystem resolver with canonical root-containment checks for trusted hosts. */
export function fileSystemResolver(root, opts = {}) {
    const rootReal = realpathSync(root);
    /**
     * Canonicalize-then-contain: the candidate is resolved to its real path
     * (symlinks followed) and only then compared against the real root.
     *
     * Deliberately NOT a lexical ban on "..", which is both too strict and too
     * weak. Too strict: "../shared/glossary.crv" from chapters/ch1.crv is a
     * normal book layout whose canonical target is inside the root, and must
     * resolve. Too weak: a symlink inside the root pointing out of it, or an
     * absolute path, escapes without containing ".." at all. Canonical
     * containment subsumes both cases.
     */
    const contains = (candidate) => {
        const rel = path.relative(rootReal, candidate);
        if (rel === '')
            return true;
        if (!rel || path.isAbsolute(rel))
            return false;
        // Segment-wise, so a directory legitimately named "..foo" is not read as
        // an escape the way a `startsWith('..')` prefix test would.
        return rel.split(path.sep)[0] !== '..';
    };
    return (includePath, ctx) => {
        if (!opts.allowAbsolute && path.isAbsolute(includePath))
            return null;
        // The stack carries the canonical (real) path of each ancestor, so a
        // nested relative include resolves against its actual parent directory,
        // not the root.
        const parent = ctx.stack[ctx.stack.length - 1];
        const base = parent ? path.dirname(path.resolve(rootReal, parent)) : rootReal;
        const resolved = path.isAbsolute(includePath) ? includePath : path.resolve(base, includePath);
        let real;
        try {
            real = realpathSync(resolved);
        }
        catch {
            return null;
        }
        if (!contains(real))
            return null;
        return { source: readFileSync(real, 'utf8'), id: real };
    };
}
//# sourceMappingURL=includes.js.map
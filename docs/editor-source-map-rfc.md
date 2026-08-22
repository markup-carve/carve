---
title: RFC — Editor Source Map
description: Draft contract for lossless source-authoritative visual editors.
---

# RFC: editor source map

> **Status: draft for ecosystem review.** Nothing on this page is normative and
> no implementation is required to expose it yet.

Carve's AST describes meaning and the source-layout v1 sidecar describes enough
authored layout for archival and minimal-diff tooling. A live visual editor has
a narrower, stricter need: every decoration and edit must map back to the exact
document range the user authored, in the offset unit its editor API consumes.

This RFC proposes a separate editor source map rather than changing AST JSON or
silently strengthening source-layout v1.

## Required guarantees

An editor map is a snapshot of one source string and one canonical pre-resolve
AST. A conforming producer MUST:

1. report document-space ranges for every authored node, including nodes parsed
   through lists, quotes, divs, admonitions, definitions and footnotes;
2. report UTF-16 offsets for JavaScript/editor APIs and UTF-8 byte offsets for
   exchange, both start-inclusive and end-exclusive;
3. identify authored syntax tokens separately from content so an editor can
   hide `###`, emphasis delimiters or a table marker without hiding text;
4. retain a range for malformed/incomplete syntax whenever the parser recovers
   it as literal text or an error region;
5. distinguish authored nodes from resolved/generated nodes that have no source;
6. never guess: missing data is explicit and makes the affected visual
   transformation unavailable.

Offsets address the original source, including its BOM and original line
endings. UTF-16 offsets count JavaScript string code units. UTF-8 offsets count
bytes. Producers MUST prove that both ranges select the same Unicode scalar
sequence.

## Proposed exchange shape

The accompanying
[`editor-source-map-draft.schema.json`](../resources/editor-source-map-draft.schema.json)
is the review target.

```json
{
  "version": 1,
  "sourceHash": "sha256:…",
  "utf16Length": 42,
  "utf8Length": 44,
  "nodes": [
    {
      "path": "/children/0",
      "range": {
        "utf16": { "start": 0, "end": 13 },
        "utf8": { "start": 0, "end": 13 }
      },
      "tokens": [
        {
          "role": "block-marker",
          "range": {
            "utf16": { "start": 0, "end": 3 },
            "utf8": { "start": 0, "end": 3 }
          }
        },
        {
          "role": "content",
          "range": {
            "utf16": { "start": 4, "end": 13 },
            "utf8": { "start": 4, "end": 13 }
          }
        }
      ]
    }
  ],
  "unmapped": []
}
```

JSON Pointer paths are stable only inside one snapshot. Consumers MUST NOT use
them as persistent document identities after an edit.

## Token roles

The first version should use a closed vocabulary:

| Role | Examples |
| --- | --- |
| `block-marker` | heading hashes, quote/list markers, definition separators |
| `open-marker`, `close-marker` | emphasis, spans, links, inline notes |
| `content` | author-visible text or literal payload |
| `destination` | link/image destination and reference labels |
| `attribute` | an attribute block or individual attribute slot |
| `fence-open`, `fence-close` | code, raw, comment and colon fences |
| `table-marker` | pipes, cell/header/alignment/span markers, continuation `+` |
| `caption-marker` | authored `^` prefix |
| `frontmatter-fence` | opening and closing frontmatter delimiters |
| `escape` | an escape introducer separately from its escaped character |

Tokens belonging to one node MUST NOT overlap except where a broader `content`
token deliberately contains child-node tokens. Sibling tokens MUST NOT overlap.

## Editing protocol

The map itself is immutable. An engine API may accept ordered non-overlapping
UTF-16 changes:

```ts
interface EditorChange {
  from: number
  to: number
  insert: string
}

interface EditorUpdate {
  source: string
  ast: AstJsonDocument
  map: EditorSourceMap
  changedPaths: string[]
  diagnostics: EditorDiagnostic[]
}
```

The result is a complete new snapshot. `changedPaths` is a performance hint,
not permission to keep stale ranges. A first implementation MAY reparse the
whole document. "Incremental" describes the consumer contract and invalidation
behavior, not an implementation claim.

An editor MUST apply source changes, then request a new snapshot. It MUST NOT
mutate AST JSON and ask an engine to infer an author's spelling. Higher-level
commands such as "make heading level 3" should be separate source-edit helpers
which return `EditorChange[]` plus a new selection.

## Commands required by a visual editor

The reference API should eventually cover:

- set/unset inline formatting while preserving nested delimiters;
- set heading level or paragraph;
- create/update/remove links, images, attributes and footnotes;
- insert/delete/move list and definition items;
- insert/delete rows and columns before or after a table cell;
- update table header, alignment, span and caption metadata;
- wrap/unwrap quotes, admonitions, divs and figures;
- return a mapped selection after every command.

Commands MUST either return a valid source patch or a typed refusal explaining
which range/fact is unavailable. They must never canonicalize an unrelated
range as a side effect.

## Difficult cases the fixtures must pin

- astral Unicode before and inside every mapped construct;
- CRLF, CR, mixed line endings and a BOM;
- nested lists inside quotes inside colon fences;
- definitions hoisted in AST order but authored inside containers;
- table continuations, row/column spans, alignment runs and captions;
- unclosed fences and incomplete inline delimiters during typing;
- duplicate source spellings that resolve to one semantic value;
- generated heading ids, footnote numbers and extension output with no source;
- changes that insert/delete a newline before every later mapped node.

## Relationship to existing contracts

- AST JSON remains semantic and unchanged.
- Source-layout v1 remains the archival/minimal-diff contract and unchanged.
- The editor map may be derived alongside source-layout but has stronger
  completeness and document-space guarantees.
- HTML is never an editing interchange format.
- Render extensions that synthesize output do not gain fictional source ranges.

## Open decisions for review

1. Should token roles be a closed enum or namespaced extension vocabulary?
2. Should `sourceHash` require SHA-256 or allow a caller-supplied snapshot id?
3. Should commands be standardized across engines or remain implementation APIs?
4. Is a complete UTF-16 range pair worth wire size, or may it be requested as a
   separate representation derived from UTF-8?
5. How should a command describe a partial refusal when part of a multi-range
   selection is editable and part is not?

## Acceptance bar

This RFC should become normative only after all three engines can produce the
shared difficult-case fixtures and at least one real editor demonstrates:

- no source changes merely from entering/leaving visual mode;
- stable cursor/selection through Unicode and nested blocks;
- source-only undo/redo;
- no HTML round trip;
- typed refusal for every unsupported edit.

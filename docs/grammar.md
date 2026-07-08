---
title: Formal grammar
description: The layered formal specification of Carve syntax.
---

# Formal grammar

This is the canonical formal specification of Carve. It is **layered**, and each layer is stated in a declared, machine-interpretable formalism - no rule lives in prose alone:

| Layer | Content | Formalism |
|---|---|---|
| PART 0 | Line layout: indentation, container prefixes, lazy continuation | Deterministic line automaton |
| PARTS 1-8 | Block and inline productions | EBNF + declared guard notation (lookahead, lookbehind classes, `where` counting guards) |
| PART 9 | Semantic constraints a context-free production cannot carry (emphasis resolution, paragraph interruption, table span walk, attribute floating, tabs) | Operational semantics: labeled rules over declared state |
| PART 9R | Whole-document resolution (references, footnotes, crossrefs, numbering) | Two-pass rules over declared symbol tables |
| PART 10 | HTML serialization | Tree-transform conventions |

::: info Why layers instead of one grammar?
Light markup languages are provably not context-free: fence-length matching is a counting constraint, indentation is 2D, and reference resolution needs a whole-document symbol table. No single EBNF can express Carve (or Djot, or CommonMark). What CAN be done - and what this file does - is state every rule in *some* exact formalism, so nothing normative rests on English prose.
:::

## Carve Core: the executable spec

**Carve Core** is the subset of Carve whose specification is directly executable - each spec layer exists as a machine-interpretable artifact:

| Spec layer | Executable artifact |
|---|---|
| PART 0 layout automaton + list/quote structure | `scripts/spec/layout.mjs` |
| PART 3 inline grammar | [`resources/carve-core.ohm`](https://github.com/markup-carve/carve/blob/main/resources/carve-core.ohm) (Ohm/PEG) |
| PART 9R resolution + PART 10 serialization | `scripts/spec/html.mjs` |

The executable spec covers the full conformant core: block structure (headings incl. multi-line folding and section wrapping, lists with every ordered dialect, quotes, tables with the span walk, fenced code and colon fences, definition lists, comments, frontmatter, block-attribute lines), the complete inline layer (emphasis with word-boundary guards, links, images, spans, attributes with the security hardening rules, autolinks, math, extensions, mentions/tags, editorial markup, smart typography, footnotes incl. inline notes, crossrefs, raw passthrough), and the resolution passes (references, footnote numbering and endnotes placement, numbered captions, abbreviations).

```bash
npm run core:check
```

The gate demands byte-identical HTML for **every pair in the conformance corpus - currently 388/388**. Rules a pure PEG cannot state are executed as declared predicates in the layout automaton (fence-length counting, the `where` guards) or as a pre-scan (the emphasis close-first delimiter-stack rule), so the pipeline never silently diverges from the delimiter-stack semantics.

Implementations should match this grammar. The [case study](./case-study/) explains the design rationale, the [reference page](./edge-cases) covers parsing edge cases, and the [examples](./examples) show the expected HTML output for each construct.

The full grammar lives at [`resources/grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf) in the repository.

<<< ../resources/grammar.ebnf{ebnf}

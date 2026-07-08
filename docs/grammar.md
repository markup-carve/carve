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

Core covers: headings, thematic breaks, paragraphs, fenced code, lists (bullet/ordered/task, all dialects, lazy continuation, tight/loose), block quotes (incl. the `+` continuation marker and attribution captions), the seven emphasis delimiters with full word-boundary rules, code spans, math, escapes, links (all three forms), images (incl. figure captions), inline spans and attribute blocks (incl. the security hardening rules), autolinks, footnotes (reference form, endnotes, backlinks), crossrefs, and abbreviations.

```bash
npm run core:check
```

The gate enforces a strict contract over the full conformance corpus: an input the executable spec accepts must render to the pinned corpus HTML **byte-for-byte** (currently ~45% of corpus inputs); anything using constructs outside the subset is REFUSED rather than approximated, so an accept is always a full-fidelity claim. The counting rule a PEG cannot state - fence closer length >= opener length - is asserted in the layout automaton, mirroring the `where` guard in the EBNF.

Implementations should match this grammar. The [case study](./case-study/) explains the design rationale, the [reference page](./edge-cases) covers parsing edge cases, and the [examples](./examples) show the expected HTML output for each construct.

The full grammar lives at [`resources/grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf) in the repository.

<<< ../resources/grammar.ebnf{ebnf}

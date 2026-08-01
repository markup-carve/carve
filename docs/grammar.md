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
| PART 11 | Canonical source writer (`carve fmt`): round-trip invariants and the escaping rule | Invariants over `parse`/`fmt` + a decision procedure |
| PART 12 | AST serialization: the JSON shape a parsed document exchanges as | Reference-implementation field names + a round-trip invariant |

::: info "Why layers instead of one grammar?"
Light markup languages are provably not context-free: fence-length matching is a counting constraint, indentation is 2D, and reference resolution needs a whole-document symbol table. No single EBNF can express Carve (or Djot, or CommonMark). What CAN be done - and what this file does - is state every rule in *some* exact formalism, so nothing normative rests on English prose.
:::

## Carve Core: the executable spec

**Carve Core** is the subset of Carve whose specification is directly executable - each spec layer exists as a machine-interpretable artifact:

| Spec layer | Executable artifact |
|---|---|
| PART 0 layout automaton + list/quote structure | `scripts/spec/layout.mjs` |
| PART 3 inline grammar | [`resources/carve-core.ohm`](https://github.com/markup-carve/carve/blob/main/resources/carve-core.ohm) (Ohm/PEG) |
| PART 9R resolution + PART 10 serialization | `scripts/spec/html.mjs` |

The executable spec covers the full conformant core: block structure (headings incl. section wrapping, lists with every ordered dialect, quotes, tables with the span walk, fenced code and colon fences, definition lists, comments, frontmatter, block-attribute lines), the complete inline layer (emphasis with word-boundary guards, links, images, spans, attributes with the security hardening rules, autolinks, math, extensions, mentions/tags, editorial markup, smart typography, footnotes incl. inline notes, crossrefs, raw passthrough), and the resolution passes (references, footnote numbering and endnotes placement, numbered captions, abbreviations).

```bash
npm run core:check
```

The gate demands byte-identical HTML for **every pair in the conformance corpus**. Rules a pure PEG cannot state are executed as declared predicates in the layout automaton (fence-length counting, the `where` guards) or as a pre-scan (the emphasis close-first delimiter-stack rule), so the pipeline never silently diverges from the delimiter-stack semantics.

## Which artifact decides

The executable artifacts are **derived checkers**, not a fourth implementation. They exist to execute what `grammar.ebnf` states, so that a contradiction inside it becomes visible. Three rules, normative in the grammar itself:

1. **The executable artifacts decide nothing.** A ruling cites a clause. "The executable spec does X", or "carve-js does X", is a measurement, never an argument for X. An unruled question is answered by writing a clause, not by the behavior of whatever ran last.
2. **A golden is normative once committed, not once generated.** `npm run corpus:build` proposes pairs; a reviewed commit makes one the answer. A generated golden nobody read is a claim about the grammar, and it can be a wrong one.
3. **A checker that disagrees with a committed golden is wrong until a clause says otherwise.** The disagreement is a question to raise against the grammar, not a divergence to record against the engines.

::: warning Why this is stated rather than assumed
The checkers have been wrong, and while they were, they were quietly the language: [carve#645](https://github.com/markup-carve/carve/issues/645) leaked the layout automaton's internal lazy frame into code text, and in [carve#646](https://github.com/markup-carve/carve/issues/646) the executable spec turned out to be a *fourth* answer where three engines already disagreed. An artifact that can be wrong cannot also be the arbiter of what is right.

The same mistake has a cross-repo shape. A satellite graded its grammar against a **pinned engine** instead of against the corpus; the pin was three weeks stale, and it reported nine grammar defects that were the pin ([tree-sitter-carve#160](https://github.com/markup-carve/tree-sitter-carve/issues/160)). Measure against the committed golden, never against an implementation.
:::

Implementations should match this grammar. The [case study](./case-study/) explains the design rationale, the [reference page](./edge-cases) covers parsing edge cases, and the [examples](./examples) show the expected HTML output for each construct.

The full grammar lives at [`resources/grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf) in the repository.

<<< ../resources/grammar.ebnf{ebnf}

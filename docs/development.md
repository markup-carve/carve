---
description: Set up, test, and maintain the Carve specification and documentation.
---

# Development

## Setup and maintenance

This repository contains the specification, corpus, and documentation site.

```bash
npm install
npm test
npm run docs:build
```

See [MAINTAINING.md](https://github.com/markup-carve/carve/blob/main/MAINTAINING.md)
for release and cross-implementation work.

## Diagnosing HTML drift

Run `npm run engine:report -- --structure` to add an HTML tree diagnostic to
each byte mismatch in the pinned engine's core-corpus report. Combine it with
`--diff` to see the bytes, or `--check` to check the declared drift ledger.
The report requires at least 100 corpus documents.

`same structure` means the HTML fragment trees agree after decoding entities
and sorting attributes. Parsed text whitespace, comments, attribute values,
namespaces, element order and template contents remain significant. Errors
reported by parse5, implied elements, omitted non-void end tags and initial
newlines that HTML discards in `pre`, `textarea` or `listing` produce
`unclassified`. Foreign elements without separate end tags are also
unclassified, including valid self-closing SVG or MathML elements.
Void-element slash spelling can still share a tree. Other tree differences produce
`different structure`.

This is supporting evidence, not a semantic-equivalence test. Browser parsing
can hide source distinctions, including raw HTML spelling and ignored tokens
that parse5 does not report as errors. It does not prove
AST identity, CSS behavior, accessibility or script behavior. Canonical bytes
remain the oracle: every byte mismatch still counts as drift, including one
marked `same structure`, and the exit status and ledger checks are unchanged.

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

The [layout ownership prototype](https://github.com/markup-carve/carve/tree/main/proofs/layout)
models a subset of Part 0 in Rocq. `npm run proof:layout:evidence` compares its
authored traces with the executable specification and pinned JavaScript engine.
`npm run proof:layout` also requires a Rocq/Coq compiler to check the theorem
scripts. The prototype records two unresolved rule discrepancies; passing its
checks does not establish full parser conformance.

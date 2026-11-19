---
description: Work with the Carve 0.2 specification and documentation.
---

# Development

The `next2` branch contains the 0.2 specification in [`spec/0.2/`](https://github.com/markup-carve/carve/tree/next2/spec/0.2) and this documentation source. The [status page](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md) identifies the freeze candidate and its open points.

## Set up the repository

Use the Node version in `.nvmrc`, install dependencies with `npm ci`, and run `npm run docs:build` for the site. Read the [specification map](./grammar) before changing normative text. The 0.1 `resources/spec/`, `scripts/spec/` and `resources/conformance-pack/` remain on this branch for 0.1 work; they are not the 0.2 oracle.

## Check the 0.2 spec

Run `npm run spec2:data` after changing a 0.2 document, data row, example or conformance case. It checks schemas, clause references, generated examples and tree fixtures. See [Conformance](./conformance) for what an engine must run. When changing a clause, add or adjust the case that demonstrates it and update the [upgrade map](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/upgrade-map.json) when 0.1 source changes meaning.

The reference implementation lives in [`carve-js` on `next2`](https://github.com/markup-carve/carve-js/tree/next2). Its `carve` program exposes render, AST, format, diagnostics, lint, import and migration commands. The required surface is in the [tooling specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#commands); its `upgrade` command is specific to the JavaScript reference engine.

## Investigate a mismatch

Record the spec pin, engine pin, case ID, input, options, expected and actual results. Compare the cited clause before changing either side. The [comparison methodology](./implementation-comparison-methodology) describes what a corpus pass measures. The 0.1 decision trace and nightly differential tools use the 0.1 model, so their output does not decide a 0.2 case.

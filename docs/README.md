# Carve documentation source

This directory contains the VitePress documentation for the Carve site. On `next2`, these pages describe the 0.2 development candidate. The normative source is [`spec/0.2/`](https://github.com/markup-carve/carve/tree/next2/spec/0.2); [STATUS.md](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md) identifies the freeze candidate. The published 0.1 site remains at [markup-carve.github.io/carve](https://markup-carve.github.io/carve/).

## Build locally

Use the Node version in `.nvmrc` and run:

```bash
npm ci
npm run docs:build
```

The site uses VitePress frontmatter, containers and components, so some source pages do not render fully on GitHub. `docs/blog/`, `docs/experiments/` and `docs/case-study/` are historical. The 0.1 grammar and generated corpus remain in this repository for the 0.1 line; [grammar.md](grammar.md) maps the 0.2 documents.

## Writing pages

Use plain language for authors. Define a term at first use, distinguish parsing, formatting, rendering and importing, and link a 0.2 rule to `spec/0.2/` on `next2`. Check Carve examples with the reference engine's `carve` lint, format check and render commands. Keep measured results tied to a version, commit and method. This README is excluded from the VitePress build.

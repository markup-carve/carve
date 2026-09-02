# Carve documentation (source)

This directory contains the source for the [Carve documentation
site](https://markup-carve.github.io/carve/), built with
[VitePress](https://vitepress.dev/). Some pages use VitePress containers,
frontmatter, and components that GitHub does not render.

## Read the documentation

<https://markup-carve.github.io/carve/>

## Building locally

Requires **Node.js 24 or newer** - the current LTS, and the version CI builds
and deploys the site with. `nvm use` or `fnm use` picks it up from `.nvmrc`.

```bash
npm install
npm run docs:dev     # local preview at http://localhost:5173/carve/
npm run docs:build   # production build into docs/.vitepress/dist
```

## What lives here

- `index.md`, `get-started.md`, `migrate-from-markdown.md`, `comparison.md`, … - the pages.
- `grammar.md`, `extensions.md`, `examples.md` - the normative grammar, the extensions contract, and the example corpus source.
- `case-study/` - the original design research, kept as a historical record.
- `.vitepress/` - site config and theme; the live playground renders through the pinned `@markup-carve/carve` dependency.

## Writing standards

Author-facing pages use ordinary markup and publishing terms. Before adding a
project-specific term:

1. Use an established term if it describes the same concept.
2. Define an unavoidable Carve or API term at first use.
3. Use the same term for the same operation. In particular, distinguish
   **parse**, **format**, **render**, and **convert** as defined on the [terms
   page](terms.md).
4. Keep test-suite names and parser internals out of introductions, navigation,
   feature summaries, and instructions for authors.
5. State the observable behavior instead of assigning it a slogan. For example,
   write “the renderer shows the diagram source” rather than “the construct
   degrades gracefully.”

Use **core syntax** for syntax that is always available and **optional feature**
for behavior that must be enabled. Use Tier 1, Tier 2, and Tier 3 only when the
formal availability distinction matters, and define the tiers nearby.

> [!NOTE]
> This `README.md` is excluded from the VitePress build (`srcExclude`); it exists only to orient people browsing the repository.

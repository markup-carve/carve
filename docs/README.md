# Carve documentation (source)

This directory is the **source** for the Carve documentation site, built with
[VitePress](https://vitepress.dev/). It is **not meant to be read directly here
on GitHub** - the pages use VitePress-specific syntax (`:::` containers,
code-group tabs, frontmatter, custom components) that GitHub's Markdown viewer
does not render, so the raw files look broken.

## 📖 Read the docs online

👉 **<https://markup-carve.github.io/carve/>**

That is the rendered, navigable site - working code tabs, search, the syntax
reference, the migration guide, and the interactive playground.

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

> [!NOTE]
> This `README.md` is excluded from the VitePress build (`srcExclude`); it exists only to orient people browsing the repository.

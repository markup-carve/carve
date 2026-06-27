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

```bash
npm install
npm run docs:dev     # local preview at http://localhost:5173/carve/
npm run docs:build   # production build into docs/.vitepress/dist
```

## What lives here

- `index.md`, `get-started.md`, `migrate-from-markdown.md`, `comparison.md`, … - the pages.
- `case-study/`, `examples.md` - the normative narrative and example corpus source.
- `.vitepress/` - site config, theme, and the vendored `carve-lib` engine used by the live playground.

> [!NOTE]
> This `README.md` is excluded from the VitePress build (`srcExclude`); it exists only to orient people browsing the repository.

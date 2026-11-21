---
description: A feature-by-feature comparison against Markdown, Djot and MDX, for choosing between them.
---

# Carve, Markdown, Djot, and MDX

The languages solve different authoring problems. This comparison is about Carve 0.2 as specified on `next2`; its development status is recorded in [STATUS.md](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md).

| Need | Carve 0.2 | Markdown or GFM | Djot | MDX |
|---|---|---|---|---|
| Basic prose | Headings, lists, links, code | Common syntax with renderer variants | Structured text | Markdown with components |
| Tables | Native cell marks, spans, captions | GFM table subset where enabled | Its own table grammar | Depends on Markdown layer and components |
| References | Cross-references and footnotes in core | Depends on dialect or plugins | Its own reference rules | Depends on Markdown layer and components |
| Output | Specified HTML | Renderer dependent | Renderer dependent | Component runtime dependent |
| Components | Registered extensions with core fallback | Host plugins | Host filters or extensions | Imported components |

Carve's source and output are defined by separate [syntax](https://github.com/markup-carve/carve/blob/next2/spec/0.2/README.md) and [HTML](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md) documents. A host can register extensions but core source remains readable without them. MDX is a choice when authored components are the central workflow; Carve is a choice when a defined document tree and HTML contract matter.

For migration, use [Coming from Markdown](./migrate-from-markdown) or [Divergence from Djot](./divergence-from-djot). For 0.1 documents, use [Upgrading from 0.1](./upgrade-0-2).

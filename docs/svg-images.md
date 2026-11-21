---
description: "The img fence: rendering a sanitized inline SVG from a source block, and the bypasses it blocks."
---

# SVG Images

Use an ordinary image reference for a trusted SVG asset:

```crv
![Diagram of the process](process.svg)
```

The host controls image URL policy and delivery of the SVG file. An `<img>` reference keeps SVG document content separate from the Carve source. See [links and images](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md#links-and-images) and [HTML URL policy](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

The 0.1 `img` fence and its sandbox or inline modes are not part of the 0.2 core syntax. If an application needs generated or embedded SVG, it can define an extension with a core fallback and a trusted renderer. That renderer is a host responsibility, including sanitization and accessibility. See the [extension contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md).

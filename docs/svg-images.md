---
description: "The img fence: rendering a sanitized inline SVG from a source block, and the bypasses it blocks."
---

# SVG Images

Use an ordinary image reference for a trusted SVG asset:

```crv
![Diagram of the process](process.svg)
```

The host controls image URL policy and delivery of the SVG file. An `<img>` reference keeps SVG document content separate from the Carve source. See [links and images](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md#links-and-images) and [HTML URL policy](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

The 0.1 `img` fence and its sandbox or inline modes are not part of the 0.2 core syntax. The standard `imgFence` extension claims a code fence whose language is `img` or `image` and whose body is SVG, and passes it through its own trusted sanitizer before it reaches an `<img>` element; without the extension the fence stays a code block (C2-X-059, C2-X-060). In JavaScript it is the `imgFence` factory in `@markup-carve/carve/extensions`. Alt text and other accessibility remain the author's job. See the [extension contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md).

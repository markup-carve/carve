# Output without JavaScript

Carve 0.2 renders HTML. Core content remains readable without client scripts. An optional extension may render an enhanced view, but every qualified extension node must carry a core fallback. A reader or renderer without that extension uses the fallback. See [extension carriage](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#transformation-and-carriage) and [HTML fallback](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#resolution-rendering-and-equality).

## Static mode

`carve render --mode static document.crv` requests self-contained HTML. A registered extension renderer can produce its static form; a diagram without a build-time renderer falls back to source as a code block. Core math keeps its TeX-delimited `math` span in both modes. Static mode does not promise a generated image for math. See [C2-H-122 to C2-H-123 and C2-H-168](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

## Plan the fallback

An unregistered inline extension still carries readable core content:

```carve
:badge[Ready]
```

Write the fallback to carry meaning. An interactive tab set, for example, should still expose each title and panel content in source order. The optional standard tabs extension has a core fallback with strong titles followed by body blocks. Its HTML renderer writes all panel content, so the content is visible without a stylesheet. See [the tabs extension](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#standard-extension-tabs).

A render profile can degrade an extension even if its renderer is installed. Resolution then follows its fallback. A profile degradation reports `profile-construct-degraded`. A missing renderer reports `extension-fallback-rendered`. Check the relevant diagnostic when auditing output. See [profiles](./profiles.md) and [extension resolution](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#resolution-rendering-and-equality).

## Changed in 0.2

The 0.1 Markdown, plain text, and ANSI fallback writers are not part of the 0.2 engine. Use HTML, a semantic AST bridge, or a host writer for another target. See [format conversion](./format-bridges.md).

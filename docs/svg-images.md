---
description: "The img fence: rendering a sanitized inline SVG from a source block, and the bypasses it blocks."
---

# SVG Images

The standard `imgFence` extension renders an SVG image from SVG source written in a fenced block. The extension sanitizes the SVG and writes it as a sandboxed `<img>`, so the source block becomes a picture instead of a listing. It is the safe way to put SVG on a page without raw HTML, which 0.2 escapes by default.

`imgFence` is an extension: off by default, and turned on by the host.

<!-- carve-example {"extensions":["imgFence"]} -->
::: compare
````crv
{alt="Check mark"}
```img
<svg viewBox="0 0 24 24" width="48" height="48"><path d="M4 12l6 6 10-12" fill="none" stroke="#3c8772" stroke-width="3"/></svg>
```
````

```html
<img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2248%22%20height%3D%2248%22%3E%3Cpath%20d%3D%22M4%2012l6%206%2010-12%22%20fill%3D%22none%22%20stroke%3D%22%233c8772%22%20stroke-width%3D%223%22%2F%3E%3C%2Fsvg%3E" alt="Check mark">
```
:::

The fence names are `img` and `image`. `svg` and `xml` are deliberately not claimed, so you can still show and highlight SVG source with those names.

## Linking an SVG file instead

When the SVG is a trusted file of its own, an ordinary image reference is simpler and needs no extension:

```crv
![Diagram of the process](process.svg)
```

The host's URL policy decides which image addresses are allowed, and the file is delivered like any other image.

## How the image is written

The extension percent-encodes the sanitized SVG into a `data:image/svg+xml` URL on the `src` of one `<img>`. It always adds the standard SVG namespace to the root element.

The browser sandboxes an SVG loaded through `<img>`: no script runs, no external resource is fetched, and the image cannot touch the surrounding page. This holds whatever the sanitizer lets through, which makes the sandbox the strong boundary for untrusted input.

Put the attributes on the line above the fence, because a fence opener carries no attributes of its own:

- `alt` supplies the image's alternative text. Without it the image writes `alt=""`, which marks it as decorative, even when the SVG has a `<title>`.
- An id, classes and other attributes are written on the `<img>`.

<!-- carve-example {"extensions":["imgFence"]} -->
::: compare
````crv
{#ok .icon}
```img
<svg viewBox="0 0 24 24" width="32" height="32"><circle cx="12" cy="12" r="10" fill="#e8a33d"/></svg>
```
````

```html
<img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2232%22%20height%3D%2232%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%2210%22%20fill%3D%22%23e8a33d%22%2F%3E%3C%2Fsvg%3E" alt="" id="ok" class="icon">
```
:::

## Inline mode is gone

In 0.1 the extension had two modes. The default sandbox mode wrote the `<img>` described above. An opt-in inline mode, turned on by the host with `allowInline` and requested by the author with `{inline}`, wrote a live `<svg>` element into the page so that `currentColor`, CSS classes and dark mode applied to it.

The 0.2 standard extension has only the sandbox mode. An `{inline}` flag on the attribute line changes nothing, and the image is still a sandboxed `<img>`. A host that needs themeable inline icons registers its own extension for them, or serves the icons as trusted assets from its templates.

## Security

The sanitizer is part of the extension, and it is trusted. It removes unsafe elements together with their content, and removes unsafe attributes. It then accepts only a single well-formed SVG root that it can reduce to a bounded image with no scripts, no event attributes, no active or external references, and no foreign content.

<!-- carve-example {"extensions":["imgFence"]} -->
::: compare no-render
````crv
```img
<svg><script>alert(1)</script><foreignObject><p>x</p></foreignObject><a href="javascript:x"><rect width="4" height="4" onclick="y()"/></a></svg>
```
````

```html
<img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E" alt="">
```
:::

The script, the foreign HTML content and the `javascript:` link are gone, and what is left is an empty image. The encoded URL may be at most 8 MiB long.

Only the sanitizer's own result receives the exception that lets a `data:` URL through the host's URL policy, and only on that one `<img>`. An authored `data:` URL in an ordinary image or link, a copied sanitizer string or a value passed to another attribute gets no such exception. The host's profile and attribute filters still apply to the `<img>`. See [Security](./security).

## Fallback

A body that is not a single well-formed SVG element, or one the sanitizer cannot make safe, becomes the plain code block. It is never blank and never written as raw HTML. The render reports `extension-renderer-failed` and `extension-fallback-rendered`, so a host can find the block.

<!-- carve-example {"extensions":["imgFence"]} -->
::: compare no-render
````crv
```img
not an SVG image
```
````

```html
<pre><code class="language-img">not an SVG image
</code></pre>
```
:::

Without the extension, every `img` fence is that code block. Because the image is a self-contained `data:` URL, it needs no network and works offline and in static renders.

## Enabling

In JavaScript, register the `imgFence` factory from `@markup-carve/carve/extensions`:

```js
import { render } from '@markup-carve/carve'
import { imgFence } from '@markup-carve/carve/extensions'

const html = render(source, imgFence())
```

Combine it with other extensions through `withExtensions(imgFence(), ...)`. For other engines, see their extension documentation and [Optional Features and Extensions](./extensions).

**Specification (external):** [Extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md) (the `imgFence` extension, C2-X-059 and C2-X-060), [HTML output](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) (URL sinks, C2-H-159) and [links and images](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#links-and-images).

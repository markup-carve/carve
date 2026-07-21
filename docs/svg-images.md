# SVG Images (`img` fence)

The `img` fence renders an **SVG image** from an SVG source block, sanitized,
instead of showing the source verbatim. It is the safe alternative to the raw
`` ```=html `` passthrough for putting SVG on the page.

It is a <Badge type="warning" text="extension" /> (Tier-3): off by default, opt
in per document.

```` carve
```img
<svg viewBox="0 0 24 24"><path d="M4 12l6 6 10-12"/></svg>
```
````

The fence word is `img` (alias `image`). `svg` and `xml` are deliberately **not**
claimed, so you can still syntax-highlight SVG *source* with those words.

## Two modes: sandbox by default

Because a fence carries no inline attributes, the mode flag and any `{#id .class}`
go on the **preceding** block-attribute line.

### Sandbox (default)

The sanitized SVG is encoded into a `data:image/svg+xml` URI on an `<img>`:

```` carve
```img
<svg viewBox="0 0 24 24"><path d="M4 12l6 6 10-12"/></svg>
```
````

renders as

``` html
<img src="data:image/svg+xml,%3Csvg%20xmlns%3D..." alt="">
```

The browser **sandboxes** an SVG loaded through `<img>`: no script runs, no
external resource is fetched, and it cannot touch the surrounding page. This is
the safe path for untrusted input. Set the alt text with `{alt="…"}`.

### Inline (opt-in, host-gated)

Inline mode emits a live `<svg>` in the DOM, so `currentColor`, CSS classes and
dark-mode all apply — ideal for themeable icons:

```` carve
{inline}
```img
<svg viewBox="0 0 24 24"><path d="M4 12l6 6 10-12" fill="currentColor"/></svg>
```
````

Inline is **only** available when the host enabled it:

::: code-group
``` ts [carve-js]
import { imgFence } from '@markup-carve/carve'
carveToHtml(src, { extensions: [imgFence({ allowInline: true })] })
```
``` php [carve-php]
$converter->addExtension(new ImgFenceExtension(allowInline: true));
```
:::

Without `allowInline`, a `{inline}` attribute is **ignored** and the fence stays
sandboxed.

> [!WARNING]
> **Inline is a host capability, not an author one.** A fence body and its
> attributes both come from the same author, so a bare `{inline}` must never let
> that author break out of the sandbox. Only the host, by turning on
> `allowInline`, opts in — and it should do so only for **trusted** content.

## Security

- **Sandbox mode is the strong boundary.** The browser isolates an
  `<img>`-loaded SVG; this holds regardless of the sanitizer. Prefer it for
  untrusted input.
- **Inline mode relies on the built-in sanitizer** — a zero-dependency,
  default-deny allowlist that drops `<script>`, event handlers,
  `<foreignObject>`, `javascript:` and entity/escape-obfuscated schemes, external
  and protocol-relative `url()` references, active CSS, and SMIL href
  retargeting; forces a single well-formed `<svg>` root; and falls back to the
  escaped source for anything it cannot make safe.
- It is a string sanitizer, **not** a browser-grade parser, so parser-differential
  and mutation-XSS cannot be fully ruled out. For untrusted input, stay in
  sandbox mode, or post-process inline output with a browser-based sanitizer
  (e.g. DOMPurify's SVG profile). See [Security](/security).

Opt-in flags widen what inline mode keeps, each off by default: `allowStyle`
(the `style` attribute, value-scrubbed — the `<style>` *element* is always
dropped), `allowLinks` (`<a>` + external `href`), `allowAnimation` (SMIL), and
`allowExternalImages` (`<image>` with an external raster `href`).

## Fallback

A body that is not a single, well-formed `<svg>` root degrades to an escaped code
block — never blank, never raw. In sandbox mode the image is always a
self-contained data URI, so it needs no network and works offline and in static
renders.

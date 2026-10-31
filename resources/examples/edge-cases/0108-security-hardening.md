## Security hardening

Carve is safe by default: when it emits HTML for untrusted input, dangerous URL
schemes, event-handler attributes, and script-bearing CSS are neutralized
before serialization. These pairs pin that behavior (normative: grammar PART 9
§25). The HTML renderer is the primary untrusted-output path; the rules below
are always on and identical across implementations.

A `javascript:` link destination is rejected, leaving an empty `href` (the link
text is preserved):

::: compare no-render

```carve
[click here](javascript:stealCookies)
```

```html
<p><a href="">click here</a></p>
```

:::

An autolink with a dangerous scheme is blanked the same way:

::: compare no-render

```carve
<vbscript:msgbox>
```

```html
<p><a href="">vbscript:msgbox</a></p>
```

:::

The denylist also covers OS protocol-handler and command-execution schemes
(CVE-2026-20841 class). These route to an operating-system handler that can
launch a binary or open a macro-bearing document. A Windows document handler
such as `ms-office:` is blanked, even when it embeds an inner URL:

::: compare no-render

```carve
[a](ms-office:ofe|u|http://evil/x.docm)
```

```html
<p><a href="">a</a></p>
```

:::

The Follina-class `ms-msdt:` handler is blanked:

::: compare no-render

```carve
[b](ms-msdt:/id)
```

```html
<p><a href="">b</a></p>
```

:::

The `shell:` scheme (and an `ms-msdt:` autolink) are blanked the same way:

::: compare no-render

```carve
[c](shell:Startup)

<ms-msdt:/id>
```

```html
<p><a href="">c</a></p>
<p><a href="">ms-msdt:/id</a></p>
```

:::

Ordinary web and contact schemes remain allowed -- only the dangerous classes
are neutralized. An `https:` link and a `tel:` link are kept intact:

::: compare no-render

```carve
[d](https://ok.com)

[e](tel:+15551234)
```

```html
<p><a href="https://ok.com">d</a></p>
<p><a href="tel:+15551234">e</a></p>
```

:::

An image whose source uses a dangerous scheme keeps its `alt` but drops the
`src` value:

::: compare no-render

```carve
![logo](javascript:stealCookies)
```

```html
<img src="" alt="logo">
```

:::

An event-handler attribute (any `on*` name) is dropped entirely:

::: compare no-render

```carve
A [danger]{onclick="steal()"} span.
```

```html
<p>A <span>danger</span> span.</p>
```

:::

A `style` value containing a CSS `expression(` (or `url(`, `@import`,
`behavior:`, `-moz-binding`) is blanked, keeping the harmless `style` slot:

::: compare no-render

```carve
A [danger]{style="x:expression(steal())"} span.
```

```html
<p>A <span style="">danger</span> span.</p>
```

:::

The `srcdoc` and `formaction` attribute names are dropped:

::: compare no-render

```carve
A [danger]{srcdoc="<script>"} span.
```

```html
<p>A <span>danger</span> span.</p>
```

:::

An attribute-block `href`/`src` override cannot reintroduce a dangerous scheme;
the safe destination is kept and the override is ignored:

::: compare no-render

```carve
[safe](https://example.com){href="javascript:steal"}
```

```html
<p><a href="https://example.com">safe</a></p>
```

:::

An unused link definition is written on the plain-text target, and a denied
destination in it is blanked there too (CARVE-P9-054); the allowed `[x]: /u`
is kept. HTML drops an unused definition:

::: compare no-render

```carve
Text.

[x]: /u

[y]: javascript:alert(3)
```

```html
<p>Text.</p>
```

:::

A cross-reference's target is an id, not a URL sink, so `id` is not probed.

::: compare

```carve
{id="javascript:x"}
# H

</#javascript:x>
```

```html
<section id="javascript:x">
  <h1>H</h1>
  <p><a href="#javascript:x">H</a></p>
</section>
```

:::

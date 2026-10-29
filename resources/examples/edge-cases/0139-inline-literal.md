## Inline literal

A `!` prefix on a verbatim span is an *inline literal* (PART 9 §27): the content is captured verbatim like a code span, but it renders as ordinary prose — no `<code>` wrapper — and is HTML-escaped and emitted by every renderer. It mirrors the `$`-math prefix, and exists so notation that collides with the bare emphasis delimiters (phonemic transcription `/kaet/`, glob patterns, paths) can be written without escaping each character.

::: compare

```carve
The word cat is !`/kaet/` in IPA.
```

```html
<p>The word cat is /kaet/ in IPA.</p>
```

:::

A trailing `{…}` is the ordinary inline attribute block, so an attributed literal renders a `<span>` carrying it. The content is HTML-escaped, and no inline construct inside it is parsed.

::: compare

```carve
!`/kaet/`{.ipa} and !`a<b>` and !`*not bold*`
```

```html
<p><span class="ipa">/kaet/</span> and a&lt;b&gt; and *not bold*</p>
```

:::

`!` still opens an image before `[`, and stays literal text everywhere else. A literal `!` immediately before a backtick span is written `\!`.

::: compare

```carve
\!`x` is a bang before code.
```

```html
<p>!<code>x</code> is a bang before code.</p>
```

:::

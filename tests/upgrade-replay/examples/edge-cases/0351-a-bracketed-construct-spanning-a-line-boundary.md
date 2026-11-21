## A bracketed construct spanning a line boundary

A `[` closes at its matching `]`, and NOTHING in that scan is a line. The close
is balanced, escape- and literal-span-aware (PART 3, `link_text`), and a line
boundary is none of those things - `link_text` is `inline_content`, which folds
across lines exactly as a paragraph does. So a link label, a semantic span, an
image's alternative text, an inline note and an extension's content all admit a
soft break like any other inline content.

The executable spec used to spell every one of those content runs with a
`~newline` guard, so it read all five as literal text and the same guard sat on
the braced family beside them. Nothing pinned any of it: all three engines
crossed the boundary, and the oracle alone did not (markup-carve/carve#1352).

::: compare

```carve
See [a
b](/u) here.
```

```html
<p>See <a href="/u">a
b</a> here.</p>
```

:::

A semantic span is the same run with a different tail:

::: compare

```carve
An [a
b]{.k} span.
```

```html
<p>An <span class="k">a
b</span> span.</p>
```

:::

The LABEL TEXT of a reference link crosses too. Its reference LABEL does not,
and the two are pinned apart below:

::: compare

```carve
[a
b][r] resolves.

[r]: /u
```

```html
<p><a href="/u">a
b</a> resolves.</p>
```

:::

AN IMAGE'S ALT IS THE SAME RUN, so the two-line spelling of an image is still
one image - and a paragraph whose whole content is one image is still the
standalone image shape, not a wrapped one:

::: compare

```carve
![a
b](/i)
```

```html
<img src="/i" alt="a
b">
```

:::

and still a captionable host, for the same reason:

::: compare

```carve
![a
b](/i)
^ A caption.
```

```html
<figure>
  <img src="/i" alt="a
b">
  <figcaption>A caption.</figcaption>
</figure>
```

:::

An inline note's body is `brContent` too:

::: compare

```carve
A note ^[a
b] here.
```

```html
<p>A note <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> here.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a
b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

An inline extension closes at its own `]` and reads the same content:

::: compare

```carve
:span[a
b] here.
```

```html
<p><span class="ext-span">a
b</span> here.</p>
```

:::

THE BRACED FAMILY IS THE SAME RULE ONE DELIMITER OVER. An editorial span and a
forced span take inline content and close on their own brace pair, so a line
boundary inside one is content there as well. They are pinned here rather than
in a section of their own because the defect was one guard repeated, not five
decisions:

::: compare

```carve
An {+a
b+} insertion.
```

```html
<p>An <ins>a
b</ins> insertion.</p>
```

:::

::: compare

```carve
A {/a
b/} run.
```

```html
<p>A <em>a
b</em> run.</p>
```

:::

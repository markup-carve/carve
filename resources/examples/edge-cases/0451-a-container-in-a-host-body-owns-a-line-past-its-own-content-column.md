## A container in a host body owns a line past its own content column

A QUOTE or a DIV opened inside a list item, definition body or footnote body,
holding a line indented past its OWN content column, was covered by nothing
here. The questions it settles are ruled elsewhere - whether the inner container
owns the run, whether a definition written there is consumed - but no document
pinned them together, so an engine could answer them either way and stay green.
A right-to-wrong regression passed all 1623 documents on both sides before these
rows existed (markup-carve/carve#1937).

`[r][]` sits at the end of each document so consumption is OBSERVABLE: a
consumed definition resolves to a link, and one left as text shows its own
source in the output. Without it the two answers render alike and the row pins
nothing.

A definition past the container's content column opens on its authored base and is
consumed, in a list item as under a definition or footnote body (CARVE-P0-004,
CARVE-P0-011, CARVE-P9-083).

:::: compare

```carve
- a
  ::: note
   [r]: /url
  :::

[r][]
```

```html
<ul>
  <li>a
    <aside class="admonition note" aria-label="Note">

    </aside>
  </li>
</ul>
<p><a href="/url">r</a></p>
```

::::

The same document under a DEFINITION BODY consumes it, and the reference below
resolves.

:::: compare

```carve
:: t
:  a
   ::: note
    [r]: /url
   :::

[r][]
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <aside class="admonition note" aria-label="Note">

    </aside>
  </dd>
</dl>
<p><a href="/url">r</a></p>
```

::::

A FOOTNOTE BODY agrees with the definition body. Written with a QUOTE as the
inner container deliberately: the div spelling under this host trips a separate
defect where the closer is swallowed once its only line is consumed
(markup-carve/carve#1948), and a row must not bake that in. It wants the div
spelling too once that is settled.

::: compare

```carve
see[^f]

[^f]: a
    > q
     [r]: /url

[r][]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p><a href="/url">r</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a</p>
      <blockquote><p>q</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A BLOCKQUOTE HOST keeps the definition as text. The note there opens at the
quote's column 0, so the line past it has no authored base, as at top level.

::: compare

```carve
> a
> ::: note
>  [r]: /url
> :::

[r][]
```

```html
<blockquote>
  <p>a</p>
  <aside class="admonition note" aria-label="Note">

  </aside>
</blockquote>
<p><a href="/url">r</a></p>
```

:::

A QUOTE INSIDE THE LIST ITEM also consumes the definition past its content column.

::: compare

```carve
- a
  > q
   [r]: /url

[r][]
```

```html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
<p><a href="/url">r</a></p>
```

:::

A quote under a DEFINITION BODY consumes the definition the same way.

::: compare

```carve
:: t
:  a
   > q
    [r]: /url

[r][]
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <blockquote><p>q</p></blockquote>
  </dd>
</dl>
<p><a href="/url">r</a></p>
```

:::

A DIV'S EXTENT IS ITS FENCES AND A QUOTE'S IS ITS LAZY RUN, the second
distinction two engine fixes turned on. A div holds both paragraphs across the
blank line.

:::: compare

```carve
- a
  ::: note
   first

   second
  :::
```

```html
<ul>
  <li>a
    <aside class="admonition note" aria-label="Note">
      <p>first</p>
      <p>second</p>
    </aside>
  </li>
</ul>
```

::::

A quote's run ends at the blank, and the follower is a sibling in the item
rather than in the quote.

::: compare

```carve
- a
  > q
   first

   second
```

```html
<ul>
  <li><p>a</p>
    <blockquote><p>q
first</p></blockquote>
    <p>second</p>
  </li>
</ul>
```

:::

THE NEGATIVE THAT BOUNDS THE REST. A blockquote host at the inner container's
own indent does not open a container at all: `  ::: note` is lazy paragraph text
in the quote's paragraph, and the definition is not consumed because no
container ever held it. Contrast the `> :::` spelling four rows up, which does
open one. Without this row the others read as "any host at any indent".

:::: compare

```carve
> a
  ::: note
   [r]: /url
  :::

[r][]
```

```html
<blockquote><p>a</p></blockquote>
<aside class="admonition note" aria-label="Note">

</aside>
<p><a href="/url">r</a></p>
```

::::

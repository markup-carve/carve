## A comment span's closer below its host's column stays a delimiter

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

A container ends at a comment written below its content column, and a comment
inside a span the container already holds is not one. Both delimiters pair
whatever columns they sit at, so a description body, a note body and a list item
all keep the closer and answer exactly as they answer the same span closed at its
opener's base. A payload line that is not comment-shaped still ends the
container, and an opener with no closer ahead opens nothing and leaves its
payload as ordinary content.

::: compare

```carve
:: t
:  head

     %%%
     a
%%%
```

```html
<dl>
  <dt>t</dt>
  <dd>head</dd>
</dl>
```

:::

::: compare

```carve
:: t
:  head

     %%%
     a
%%%

   tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>head</p>
    <p>tail</p>
  </dd>
</dl>
```

:::

::: compare

```carve
see[^f]

[^f]: head

  %%%
  a
%%%
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>head<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
- head

    %%%
    a
%%%
    %%%
    b
    %%%

  tail
```

```html
<ul>
  <li><p>head</p>
    <p>tail</p>
  </li>
</ul>
```

:::

::: compare

```carve
:: t
:  head

     %%%
a
%%%

   tail
```

```html
<dl>
  <dt>t</dt>
  <dd>head</dd>
</dl>
<p>a</p>
```

:::

::: compare

```carve
:: t
:  head

     %%%
     a
```

```html
<dl>
  <dt>t</dt>
  <dd>head</dd>
</dl>
```

:::

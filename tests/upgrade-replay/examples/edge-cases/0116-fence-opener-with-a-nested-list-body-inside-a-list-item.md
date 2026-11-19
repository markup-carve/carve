## Fence opener with a nested-list body inside a list item

A `:::` opener inside a list item opens its block even when its body is a
nested list (PART 9 §12). A bullet (`-`) or ordered marker (`1.`) on the next
line is part of the admonition body, not a sibling list that swallows the
opener as literal text. The matching closer sits at the item content column; a
`:::` at column zero (outside the item) does not close it. The closer is
OPTIONAL here as everywhere (PART 2): an opener with none ahead of it still
opens, and the container closes at end of input.

A nested unordered list body is wrapped by the admonition:

:::: compare

```carve
- ::: note
  - para text
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <ul>
        <li>para text</li>
      </ul>
    </aside>
  </li>
</ul>
```

::::

A nested ordered list body is wrapped the same way:

:::: compare

```carve
- ::: note
  1. para text
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <ol>
        <li>para text</li>
      </ol>
    </aside>
  </li>
</ul>
```

::::

A two-item nested list is wrapped whole:

:::: compare

```carve
- ::: note
  - one
  - two
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <ul>
        <li>one</li>
        <li>two</li>
      </ul>
    </aside>
  </li>
</ul>
```

::::

A blank line between the opener and the nested list still opens the block:

:::: compare

```carve
- ::: note

  - para text
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <ul>
        <li>para text</li>
      </ul>
    </aside>
  </li>
</ul>
```

::::

With NO closer, the opener still opens and the container closes at end of
input, so the nested list is wrapped exactly as it is with a closer at the item
content column. This label used to read the other way, calling the opener
literal text under bytes that show it opening (carve#1722):

:::: compare

```carve
- ::: note
  - para text
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <ul>
        <li>para text</li>
      </ul>
    </aside>
  </li>
</ul>
```

::::

NEGATIVE: a closer at column zero is outside the item, so it does not close the
opener. The opener still opens its admonition, which closes at end of input, and
the stray `:::` opens a second, top-level div with an empty body:

:::: compare

```carve
- ::: note
  - para text
:::
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <ul>
        <li>para text</li>
      </ul>
    </aside>
  </li>
</ul>
<div>

</div>
```

::::

GUARD: an empty body (opener immediately followed by its closer) still opens:

:::: compare

```carve
- ::: note
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">

    </aside>
  </li>
</ul>
```

::::

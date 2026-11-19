## An indented attribute line attaches at top level

An attribute brace indented at top level is a floating attribute block and
attaches to what follows, like one at column 0 (carve#3885).

An indented `{…}` above a paragraph attaches to it.

::: compare

```carve
 {.note}
 This paragraph.
```

```html
<p class="note">This paragraph.</p>
```

:::

An indented `{…}` above a list attaches to the list.

::: compare

```carve
 {.todo}
 - one
 - two
```

```html
<ul class="todo">
  <li>one</li>
  <li>two</li>
</ul>
```

:::

Control - flush left at column 0 the same brace attaches to the paragraph below it.

::: compare

```carve
{.note}
Para
```

```html
<p class="note">Para</p>
```

:::

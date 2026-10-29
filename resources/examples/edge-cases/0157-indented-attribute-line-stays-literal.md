## Indented attribute line stays literal

A top-level block opener only fires at column 0. An attribute brace indented by
even a single space is not a floating attribute block, so it does not attach to
what follows: the brace and the block below it fold together as one literal
paragraph (the newline shows as a space when the two lines join).

An indented `{…}` above a paragraph stays literal.

::: compare

```carve
 {.note}
 This paragraph.
```

```html
<p class="note">This paragraph.</p>
```

:::

An indented `{…}` above a list does not attach to the list either; the whole run
is one literal paragraph and the bullet lines never open a list.

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

Control - flush left at column 0 the same brace is a floating attribute block and
attaches to the paragraph below it.

::: compare

```carve
{.note}
Para
```

```html
<p class="note">Para</p>
```

:::

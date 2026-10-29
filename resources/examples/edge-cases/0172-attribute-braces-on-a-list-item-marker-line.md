## Attribute braces on a list-item marker line

Three shapes that look alike and mean different things (PART 9 §15 A8). What
decides is whether content follows the brace run on that line, not the column
the braces sit in.

`-{…} text` with no space after the marker attributes the **item**. With a
space and text after the braces, the braces are part of that text. With a space
and *nothing* after them, it is an ordinary attribute line that floats to the
next block - a container does not get its own attribute rules.

Worth pinning because the two halves were each pinned already and their boundary
was not: carve-rs read the third shape as literal text while the other engines
read it as an attribute line, and neither could be shown wrong (carve#454).

::: compare

```carve
-{.item} An attributed item.
- {.c} literal text

- {a=b .c}
  # Attributed heading
```

```html
<ul>
  <li class="item"><p>An attributed item.</p></li>
  <li><p>{.c} literal text</p></li>
  <li>
    <h1 a="b" class="c" id="Attributed-heading">Attributed heading</h1>
  </li>
</ul>
```

:::

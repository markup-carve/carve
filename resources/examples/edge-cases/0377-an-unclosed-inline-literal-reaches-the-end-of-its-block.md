## An unclosed inline literal reaches the end of its block

The `!` prefix changes the node kind whether or not the verbatim run closes.
Like an ordinary code or math span, an unclosed literal consumes through the
end of its containing block and drops trailing whitespace from its content.

::: compare

```carve
!`unclosed
```

```html
<p>unclosed</p>
```

:::

The same extent applies across a line-block boundary.

:::: compare

```carve
::: |
a !`b
c d
:::
```

```html
<div class="line-block">
  <p>a b
c d</p>
</div>
```

::::

A table row is its own block boundary. Its closing pipe is not content, while
an interior pipe remains part of the unclosed literal.

::: compare

```carve
| a !`b | c d |
```

```html
<table>
  <tbody>
    <tr><td>a b | c d</td></tr>
  </tbody>
</table>
```

:::

## An attributed cell keeps its attributes and its literal marker

PART 9 §5 T4 says a cell carrying attributes is never a bare span marker, and
that its content is literal even when the content is just `^` or `<`. It says
nothing about the attributes, which stay on the cell that carries them: the
block is what makes the cell ordinary content in the first place, so reading it
back out as text would leave the sentence with nothing to act on
(markup-carve/carve#1463).

::: compare

```carve
| a | b |
|{.x} < |{.y} ^ |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td class="x">&lt;</td><td class="y">^</td></tr>
  </tbody>
</table>
```

:::

The contrast, and the reason the rule is worth pinning: WITHOUT the attributes
the same character is a span marker and the cell beside it grows.

::: compare

```carve
| a | b |
| c | < |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td colspan="2">c</td></tr>
  </tbody>
</table>
```

:::

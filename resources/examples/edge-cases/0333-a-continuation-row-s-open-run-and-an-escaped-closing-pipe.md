## A continuation row's open run, and an escaped closing pipe

Two shapes sit either side of the row terminator, and neither was settled by
the rule that an unclosed run stops at the row's closing pipe
(markup-carve/carve#1293).

A `+` continuation extends the cell, so the block an unclosed run reaches the
end of is that whole cell, continuation included. The run therefore spans the
row boundary and closes on the continuation row:

::: compare

```carve
| a `b |
+ c` |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b c</code></td></tr>
  </tbody>
</table>
```

:::

An escaped closing pipe is still an escape. The row closes there, because the
line ends in a pipe; what the escape decides is what the CELL holds, which is a
literal pipe and not an orphaned backslash:

::: compare

```carve
| a b \|
```

```html
<table>
  <tbody>
    <tr><td>a b |</td></tr>
  </tbody>
</table>
```

:::

The control that makes the asymmetry visible, and the argument that settled it:
every reader already honors `\|` mid-cell. Reading the escape at every position
except the last one is a position exception with nothing behind it, and `\|` is
the only way to put a literal pipe in a cell:

::: compare

```carve
| a \| b | c |
```

```html
<table>
  <tbody>
    <tr><td>a | b</td><td>c</td></tr>
  </tbody>
</table>
```

:::

The continuation is cut into cells while that run is still open, which is what
keeps its own pipes content. Splitting it with a fresh scanner cuts inside the
run and leaves a segment with no column to join, and a dropped segment is
content loss rather than a second answer:

::: compare

```carve
| a `b |
+ c | d` |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b c | d</code></td></tr>
  </tbody>
</table>
```

:::

The open run belongs to ONE column, and a continuation joins per column, so the
columns before it are still cut at their own pipes. Carrying the run across the
whole continuation line instead swallows those separators and pushes the text
into the wrong cell, which leaves the run's own cell holding an empty
`<code></code>` - the artifact this ruling rejects, produced from the other
direction:

::: compare

```carve
| x | a `b |
+ y | c` |
```

```html
<table>
  <tbody>
    <tr><td>x y</td><td>a <code>b c</code></td></tr>
  </tbody>
</table>
```

:::

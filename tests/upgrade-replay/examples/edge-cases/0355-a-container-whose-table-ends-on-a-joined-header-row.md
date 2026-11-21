## A container whose table ends on a joined header row

Once the reader accepts these rows, the container boundary follows from T6's
IT LEAVES NO PARAGRAPH OPEN with no second predicate: the item's last block is
a table however its last row is spelled, so the flush-left line leaves. This is
the shape markup-carve/carve#1354 reported as a container-boundary defect - the
predicate said "row" while the reader published prose - and it is answered by
fixing the reader rather than by teaching the predicate the reader's rejections.

::: compare

```carve
- |= a |
  + b |
tail
```

```html
<ul>
  <li>
    <table>
      <thead>
        <tr><th scope="col">a b</th></tr>
      </thead>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

The empty spelling answers the same, which is the whole point of the two halves
being one rule:

::: compare

```carve
- | a |
  + |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

A quote is asked its own body and answers alike:

::: compare

```carve
> |= a |
> + b |
tail
```

```html
<blockquote>
  <table>
    <thead>
      <tr><th scope="col">a b</th></tr>
    </thead>
  </table>
</blockquote>
<p>tail</p>
```

:::

## A heading at an item's content column leaves no paragraph open

The content column is the item body's column zero, so a heading written there is
the item's own heading block. It is not simultaneously a paragraph for the
purpose of deciding whether a flush-left line may fold. No paragraph is open,
and PART 1 S4 therefore ends the item before `tail`, exactly as it does when the
same heading is written on the marker line or inside a quote. All four readers
used to classify the heading correctly and then keep a phantom paragraph open
behind it (carve#1377).

::: compare

```carve
- | a |
  # h
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
    <h1 id="h">h</h1>
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL. Prose at that same column really does open a paragraph, so the
flush-left line lazily continues it. The earlier table does not matter once
prose becomes the item's last block.

::: compare

```carve
- | a |
  prose
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
    prose
tail
  </li>
</ul>
```

:::

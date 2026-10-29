## A paragraph opened after a block in an item is still open for a lazy line

PART 1 S4 asks one question of the open stack: does any container hold an OPEN
paragraph. It does not ask where that paragraph sits among the container's
blocks. An item whose first block is a table, a fence or a quote and whose next
line is prose holds an open paragraph exactly as an item that began with prose
does, so a following flush-left line folds into it and nothing closes.

The first case is the one that separates the two readings. `| a |` is inside the
QUOTE, so at the item's own content column the block above `+ b |` is a
blockquote and not a table. PART 9 §5 T6 therefore refuses the continuation row,
the line is prose, and prose keeps the paragraph open. A reader that consults the
table through the container below - close enough to call the line a continuation
row for the purpose of ending the paragraph, while still rendering it as
text - answers one line two ways in the same parse.

::: compare

```carve
- > | a |
  + b |
tail
```

```html
<ul>
  <li>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a</td></tr>
        </tbody>
      </table>
    </blockquote>
    + b |
tail
  </li>
</ul>
```

:::

The same rule with no continuation row involved: the item opens on a table, the
next line is ordinary prose at the item's content column, and `tail` folds into
the paragraph that prose opened.

::: compare

```carve
- | a |
  b
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
    b
tail
  </li>
</ul>
```

:::

The block the paragraph follows is not what decides it, so a fenced block reads
the same way.

::: compare

````carve
- ```
  c
  ```
  b
tail
````

```html
<ul>
  <li>
    <pre><code>c
</code></pre>
    b
tail
  </li>
</ul>
```

:::

CONTROL. A blank line closes the paragraph, and S4's other half then governs:
nothing in the stack holds an open paragraph, so the item ends and `tail` is a
document sibling.

::: compare

```carve
- | a |
  b

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
    b
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL. Here the table IS above the line at the item's own column, so the second
row extends it, no paragraph is opened at all, and `tail` is again a document
sibling. A reader that folded after a table unconditionally would answer this one
wrong.

::: compare

```carve
- | a |
  | b |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

## Definition list as a first-class block opener

A `:: term` definition-list opener is a block opener like every other (quote, heading, fence, table) under the content-column rule (PART 9 §24 C3): it *interrupts* an open list item at column 0, and *nests* at the item's content column. The two-line `:: `/`: ` marker is recognized by look-ahead; only the `:: ` term line opens the block.

At the content column, the definition list nests inside the item.

::: compare

```carve
- one
  :: term
  :  def
```

```html
<ul>
  <li>one
    <dl>
      <dt>term</dt>
      <dd>def</dd>
    </dl>
  </li>
</ul>
```

:::

At column 0 (below the content column), it interrupts: the list ends and the definition list parses at document level.

::: compare

```carve
- one
:: term
:  def
```

```html
<ul>
  <li>one</li>
</ul>
<dl>
  <dt>term</dt>
  <dd>def</dd>
</dl>
```

:::

Below the content column but not at column 0, it folds in as lazy item text.

::: compare

```carve
- one
 :: term
 :  def
```

```html
<ul>
  <li>one</li>
</ul>
<dl>
  <dt>term</dt>
  <dd>def</dd>
</dl>
```

:::

A blank line before a nested definition list keeps the outer item tight (§17), like any other nested sub-block.

::: compare

```carve
- one

  :: t
  :  d
```

```html
<ul>
  <li>one
    <dl>
      <dt>t</dt>
      <dd>d</dd>
    </dl>
  </li>
</ul>
```

:::

## A description separator left of its item's column folds into the definition body

A `:` separator one column in, below the content column of the list item that
holds the definition list, opens nothing in the surviving context. It is not a
separator but plain text, and lazy continuation folds it into the innermost open
paragraph, the definition body (CARVE-P9-083, PART 9 §10 I2; carve#3547).

::: compare

```carve
- item

  :: Term
  :  Def
 :  under
```

```html
<ul>
  <li>item
    <dl>
      <dt>Term</dt>
      <dd>Def
:  under</dd>
    </dl>
  </li>
</ul>
```

:::

At column 0 the line is a document-level separator with no term above it in the
document. It ends the item, and the line opens a paragraph (carve#3451).

::: compare

```carve
- item

  :: Term
  :  Def
:  under
```

```html
<ul>
  <li>item
    <dl>
      <dt>Term</dt>
      <dd>Def</dd>
    </dl>
  </li>
</ul>
<p>:  under</p>
```

:::

A blank line closes the definition body's paragraph, so nothing is left for the
line to fold into. Below the item's column it ends the list.

::: compare

```carve
- item

  :: Term
  :  Def

 :  under
```

```html
<ul>
  <li>item
    <dl>
      <dt>Term</dt>
      <dd>Def</dd>
    </dl>
  </li>
</ul>
<p>:  under</p>
```

:::

A tight item reads the column-1 line the same way.

::: compare

```carve
- item
  :: Term
  :  Def
 :  under
```

```html
<ul>
  <li>item
    <dl>
      <dt>Term</dt>
      <dd>Def
:  under</dd>
    </dl>
  </li>
</ul>
```

:::

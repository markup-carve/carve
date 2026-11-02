## An over-indented definition attaches, an under-indented one folds

The accepted wider-separator spelling `:  def` attaches to `:: term` at the definition list's column. Below that column, the surviving host classifies it. At the item's marker column the item ends, and one column in it ends too, because a term holds no fold (carve#4861). The canonical spelling is `: def`; these cases retain the wider separator to test its authored column (carve#3451).

One column in, the line ends the item.

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
    </dl>
  </li>
</ul>
<p>:  def</p>
```

:::

At column 0, the item ends and the separator begins a document paragraph.

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
    </dl>
  </li>
</ul>
<p>:  def</p>
```

:::

Over-indented (past the term's column): the line attaches as the definition.

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

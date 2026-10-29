## Compact list blocks

A blank line is still required to start a block inside a list item, but it no longer makes the list *loose* when the indented content opens a block (sub-list, block quote, fenced code, fenced div, heading, table). The item stays **tight** — lead text inline, the block attached — so a checklist with notes or steps with code stay compact. (A Carve deviation: canonical djot renders these loose. Only the tight/loose rendering changes, not the block structure.)

::: compare

```carve
- item

  > note
- next
```

```html
<ul>
  <li>item
    <blockquote><p>note</p></blockquote>
  </li>
  <li>next</li>
</ul>
```

:::

A **sub-list** is one of those blocks, and the rule holds when a sibling item follows it: the blank belongs to the sub-list, not to the gap between items, so the whole list stays tight.

::: compare

```carve
- fruit

  - apples
- vegetables
```

```html
<ul>
  <li>fruit
    <ul>
      <li>apples</li>
    </ul>
  </li>
  <li>vegetables</li>
</ul>
```

:::

A genuine second prose paragraph still makes the list loose (and so does a blank line between items).

::: compare

```carve
- item

  second para
- next
```

```html
<ul>
  <li><p>item</p>
    <p>second para</p>
  </li>
  <li><p>next</p></li>
</ul>
```

:::

An **invisible construct** does not loosen either, and for a plainer reason than L2: §17 L1 asks whether the item holds a blank-line-separated second *paragraph*, and a comment or a definition is not a paragraph - it renders nothing at all. An item wrapped in `<p>` because of a line that produces no output would be the blank line showing through.

::: compare

```carve
- a

  %% just a note
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

The same for a definition, which is collected and renders nothing where it stood.

::: compare

```carve
- a

  [r]: /u
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

A **sibling item after it** is a different question, and there the list is loose: L1's other clause asks whether an item is followed by a blank line before the next sibling marker, and it is - an invisible line in the gap does not fill it.

::: compare

```carve
- a

  %% just a note
- b
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ul>
```

:::

A paragraph inside an item carries block attributes like any other, and the attribute line sits above it exactly as it does at document level.

::: compare

```carve
- a

  first

  {.c}
  second
```

```html
<ul>
  <li><p>a</p>
    <p>first</p>
    <p class="c">second</p>
  </li>
</ul>
```

:::

The attribute still reaches its paragraph **across a blank line**, exactly as it does at document level: §15 A2a floats it to the next visible block, and a blank is not a block. The item is loose because that paragraph is a real second one, not because of the attribute line.

::: compare

```carve
- a

  {.c}

  b
```

```html
<ul>
  <li><p>a</p>
    <p class="c">b</p>
  </li>
</ul>
```

:::

On its own, though, an attribute line leaves the item **tight** — it renders nothing, so it is not the second paragraph §17 L1 asks for, the same reason a comment or a definition is not.

::: compare

```carve
- a

  {.c}
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

One column further in, the recognized attribute opener uses that authored column
as a temporary block base. It remains invisible and the item remains tight.

::: compare

```carve
- a

   {.c}
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

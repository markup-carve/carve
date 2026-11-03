## Compact list blocks

The section title names the reading carve#5015 withdrew (PART 9 §17 L2). A blank line before an item's sub-block (sub-list, block quote, fenced code, fenced div, heading, table) now loosens the list, as a blank before a second paragraph does (§17 L1). To keep a checklist with notes or steps with code compact, write the block without the blank line.

::: compare

```carve
- item

  > note
- next
```

```html
<ul>
  <li><p>item</p>
    <blockquote><p>note</p></blockquote>
  </li>
  <li><p>next</p></li>
</ul>
```

:::

A **sub-list** is one of those blocks: the blank stands between the item's lead and its sub-list, so the whole list is loose.

::: compare

```carve
- fruit

  - apples
- vegetables
```

```html
<ul>
  <li><p>fruit</p>
    <ul>
      <li>apples</li>
    </ul>
  </li>
  <li><p>vegetables</p></li>
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

An **invisible construct** does not loosen: §17 L1 asks whether the item holds a blank-line-separated second *block*, and a comment or a definition is not a block - it renders nothing at all. An item wrapped in `<p>` because of a line that produces no output would be the blank line showing through.

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

On its own, though, an attribute line leaves the item **tight** — it renders nothing, so it is not the second block §17 L1 asks for, the same reason a comment or a definition is not.

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

## A block attached after an invisible line leaves the item tight

The section title names the reading carve#5015 withdrew with PART 9 §17 L2.
§17 L1 loosens a list when some item holds a blank-line-separated block after an
earlier visible block of its own, and its first clause covers an item followed
by a blank line before the next sibling marker.

An invisible line - a comment, a definition, an attribute block - renders
nothing, so it decides neither. `186-an-invisible-line-does-not-cancel-a-blank-line-separation`
pins that it does not close the separation a blank opened, and
`188-a-floating-attribute-stops-at-the-item-boundary` pins the case where nothing
visible follows it at all and the item really did end at the blank.

What neither of those can say is what happens when a block ATTACHES after the
invisible line and the list has a SECOND item. The block answers as it does
when no invisible line is there - `- a` / blank / `  - b` / `- c` is loose
(`87-compact-list-blocks-2`), and inserting a line that produces no output
cannot make the item tight again (CARVE-P9-013 property 3).

An attribute block:

::: compare

```carve
- a

  {.x}
  - b
- c
```

```html
<ul>
  <li><p>a</p>
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A comment, which is the same rule with a different invisible line - the class of
the gap-filler is not the question:

::: compare

```carve
- a

  %% note
  - b
- c
```

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A reference definition:

::: compare

```carve
- a

  [r]: /u
  - b
- c
```

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

Nor is the block only a nested list. A quote in the same position:

::: compare

```carve
- a

  {.x}
  > q
- c
```

```html
<ul>
  <li><p>a</p>
    <blockquote class="x"><p>q</p></blockquote>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

And so is a code fence:

::: compare

```carve
- a

  {.x}
  ```
  code
  ```
- c
```

```html
<ul>
  <li><p>a</p>
    <pre class="x"><code>code
</code></pre>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A PARAGRAPH after the invisible line loosens the same way -
`186-an-invisible-line-does-not-cancel-a-blank-line-separation` already pins it,
one item and two.

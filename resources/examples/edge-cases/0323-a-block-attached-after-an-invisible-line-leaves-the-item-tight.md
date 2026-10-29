## A block attached after an invisible line leaves the item tight

PART 9 §17 L1 loosens a list when "some item holds a blank-line-separated second
paragraph", and its first clause covers an item followed by a blank line before
the next sibling marker. §17 L2 is the other half: a sub-block attached after a
blank ATTACHES, and the item stays tight.

An invisible line - a comment, a definition, an attribute block - renders
nothing, so it decides neither. `186-an-invisible-line-does-not-cancel-a-blank-line-separation`
pins that it does not close the separation a blank opened, and
`188-a-floating-attribute-stops-at-the-item-boundary` pins the case where nothing
visible follows it at all and the item really did end at the blank.

What neither of those can say is what happens when a block ATTACHES after the
invisible line and the list has a SECOND item. The attachment consumes the
separation exactly as it does when no invisible line is there - `- a` / blank /
`  - b` / `- c` is tight (`87-compact-list-blocks-2`), and inserting a line that
produces no output cannot make the item loose. A reader that remembers the blank
and never forgets it loosens here, which is what the executable spec did
(carve#1265); every corpus document of this shape had one item, so nothing said
so.

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
  <li>a
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
  <li>c</li>
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
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li>c</li>
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
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li>c</li>
</ul>
```

:::

Nor is the attached block only a nested list. A quote is a §17 L2 sub-block in
the same position:

::: compare

```carve
- a

  {.x}
  > q
- c
```

```html
<ul>
  <li>a
    <blockquote class="x"><p>q</p></blockquote>
  </li>
  <li>c</li>
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
  <li>a
    <pre class="x"><code>code
</code></pre>
  </li>
  <li>c</li>
</ul>
```

:::

A PARAGRAPH after the invisible line is the boundary and still loosens, because
that is §17 L1's own second paragraph rather than an attachment - `186-an-invisible-line-does-not-cancel-a-blank-line-separation`
already pins it, one item and two.

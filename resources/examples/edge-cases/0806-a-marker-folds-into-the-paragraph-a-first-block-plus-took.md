## A marker folds into the paragraph a first-block plus took

PART 0 S4 (carve#4545). The section name predates the superseding ruling and is append-only. A list marker of another kind between the item's marker and content columns opens a new list, also after the paragraph a first-block `+` took.

:::: compare

```carve
- +
  b
 * w1
```

```html
<ul>
  <li>+
b</li>
</ul>
<ul>
  <li>w1</li>
</ul>
```

::::

:::: compare

```carve
1. +
+ w1
 - w2
```

```html
<ol>
  <li>+ w1</li>
</ol>
<ul>
  <li>w2</li>
</ul>
```

::::

:::: compare

```carve
- a
  - +
  + w1
   9. w2
```

```html
<ul>
  <li>a
    <ul>
      <li>+ w1</li>
    </ul>
    <ol start="9">
      <li>w2</li>
    </ol>
  </li>
</ul>
```

::::

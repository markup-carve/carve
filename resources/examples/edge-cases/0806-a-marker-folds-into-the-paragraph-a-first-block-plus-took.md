## A marker folds into the paragraph a first-block plus took

List markers never interrupt a paragraph (PART 9 §10 I2). A first-block `+` that takes its paragraph is not refused, and a list marker of another kind between the item's marker and content columns folds into that paragraph as it does after `- b` (carve#4235).

:::: compare

```carve
- +
  b
 * w1
```

```html
<ul>
  <li>b
* w1</li>
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
  <li>+ w1
- w2</li>
</ol>
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
      <li>+ w1
9. w2</li>
    </ul>
  </li>
</ul>
```

::::

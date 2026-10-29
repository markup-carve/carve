## A definition below every content column folds as text

A definition is not block-shaped, but §24 C3's "every other line" covers it too: below every open content column it folds into the item paragraph as literal text and registers nothing, so a reference to it elsewhere stays literal. The failure this guards against is not a wrong shape but a disappearance - a definition that falls past the fold branch lands at the item's own column 0, where it is skipped as already-extracted and renders as nothing at all.

::: compare

```carve
- - a
 [^f]: x
```

```html
<ul>
  <li>
    <ul>
      <li>a</li>
    </ul>
  </li>
</ul>
```

:::

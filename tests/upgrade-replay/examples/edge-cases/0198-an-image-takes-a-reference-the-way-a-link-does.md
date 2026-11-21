## An image takes a reference the way a link does

An image resolves against the same definition table a link does (PART 3, `reference_image`; carve#641). Every reference FORM was pinned for links and none for images, so the three engines agreed here with nothing holding them to it - and the AST rule that a resolved reference keeps `ref` and `rawRef` beside its destination (PART 12 §3a) had no image case either.

::: compare

```carve
![moon][m]

[m]: /moon.png
```

```html
<img src="/moon.png" alt="moon">
```

:::

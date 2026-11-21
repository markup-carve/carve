## A collapsed image reference uses its alt text as the label

`![alt][]` takes the alt text as the label, and a definition title becomes the image's `title`.

::: compare

```carve
![moon][]

[moon]: /moon.png "Title"
```

```html
<img src="/moon.png" alt="moon" title="Title">
```

:::

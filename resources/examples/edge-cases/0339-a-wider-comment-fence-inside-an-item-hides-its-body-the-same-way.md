## A wider comment fence inside an item hides its body the same way

Fence WIDTH decides which line closes the fence (§28's exact-length closer), not whether the body is opaque. A four-percent fence at an item's content column is as invisible to the definition collector as a three-percent one, so the two axes stay independent.

::: compare

```carve
- item
  %%%%
  [r]: /url
  %%%%

[r][]
```

```html
<ul>
  <li>item</li>
</ul>
<p>[r][]</p>
```

:::

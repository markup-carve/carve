---
page: edge-lists
---

## A trailing comment in a comment-only paragraph ends at its line

PART 9 §28 and the comment-only paragraph rule (carve#4799, carve#4883). A `%%` tail ends at its line, so the line after it is read on its own: text there keeps the paragraph visible, and only a paragraph whose every line is comments renders nothing.

::::: compare

````carve
{% c %} %% t
b
````

```html
<p>
b</p>
```

:::::

::::: compare

````carve
- a

{% c %} %% t
- b
````

```html
<ul>
  <li>a</li>
</ul>
<p>
- b</p>
```

:::::

::::: compare

````carve
{% c %} %% t
{% d %} %% u

z
````

```html
<p>z</p>
```

:::::

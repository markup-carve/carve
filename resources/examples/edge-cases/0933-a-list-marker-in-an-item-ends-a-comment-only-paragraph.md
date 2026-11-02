---
page: edge-lists
---

## A list marker in an item ends a comment-only paragraph

PART 9 §21a, §17 L1b, §24 C3 and PART 0 S3 (carve#4890, carve#4799). A paragraph holding only braced comments reads as a `%%` line, and in an item a list marker ends it, so it neither loosens the item nor splits the list. In a quote, a div or a colon body the marker stays paragraph text and keeps the paragraph visible.

::::: compare

````carve
- p

  - a

  {% c %}
  - b
````

```html
<ul>
  <li>p
    <ul>
      <li><p>a</p></li>
      <li><p>b</p></li>
    </ul>
  </li>
</ul>
```

:::::

::::: compare

````carve
- p

  - a

  {% c %}
  * b
````

```html
<ul>
  <li>p
    <ul>
      <li>a</li>
    </ul>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::::

::::: compare

````carve
- p

  {% c %}
  - b
````

```html
<ul>
  <li>p
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::::

::::: compare

````carve
- +
{% c %}
- b
````

```html
<ul>
  <li>+
</li>
  <li>b</li>
</ul>
```

:::::

::::: compare

````carve
> - a
>
> {% c %}
> - b
````

```html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
  <p>
- b</p>
</blockquote>
```

:::::

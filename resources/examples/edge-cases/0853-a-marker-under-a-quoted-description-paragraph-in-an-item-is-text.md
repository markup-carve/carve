---
page: edge-lists
---

## A marker under a quoted description paragraph in an item is text

PART 0 S3 and ruling carve#4160 (carve#4231). The line reaches the item and the quote and misses the description body, so its owner is the quote. A quote takes no tight sublist, and the outer item adds nothing.

:::: compare

````carve
- > :: t
  > : d
  > - z
````

```html
<ul>
  <li>
    <blockquote>
      <dl>
        <dt>t</dt>
        <dd>d
- z</dd>
      </dl>
    </blockquote>
  </li>
</ul>
```

::::

:::: compare

````carve
> :: t
> : d
> - z
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>d
- z</dd>
  </dl>
</blockquote>
```

::::

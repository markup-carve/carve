---
page: edge-lists
---

## A column-0 comment before a sibling keeps the blank that loosens the list

PART 9 §17 L1c with CARVE-P9-013 property 3. A blank inside an item, followed only by invisible lines, still stands between the item and the next sibling marker when a comment or definition at column 0 comes between them. Removing the column-0 line must not change the output; each document renders as it does without that line.

::::: compare

````carve
- a

  %% y
%% z
- c
````

```html
<ul>
  <li><p>a</p></li>
  <li><p>c</p></li>
</ul>
```

:::::

::::: compare

````carve
- %%%

%%%
%% z
- c
````

```html
<ul>
  <li></li>
  <li>c</li>
</ul>
```

:::::

::::: compare

````carve
- a

  {.c}
[s]: /v
- c
````

```html
<ul>
  <li><p>a</p></li>
  <li><p>c</p></li>
</ul>
```

:::::

::::: compare

````carve
> - a
>
>   %% y
> %% z
> - c
````

```html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
  <ul>
    <li>c</li>
  </ul>
</blockquote>
```

:::::

---
page: edge-lists
---

## An attribute line between two sub-lists of an item makes the second a different list

PART 9 §17 L1: a blank before a different list stands between two of the item's own blocks, so it loosens the item. An attribute line below a sub-list belongs to the next block, so the list after it is a new list even when its marker matches; a blank between the attribute line and that list loosens the item. A comment or a link definition in the same place keeps the sub-list open, so its blank loosens only the sub-list.

The reproduction: `{x}` opens the second list, and the blank loosens the item.

::: compare

````carve
- a
  - b
  {x}

  - c
````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
    <ul x="">
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::

With the blank above the attribute line instead.

::: compare

````carve
- a
  - b

  {x}
  - c
````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
    <ul x="">
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::

An ordered sub-list, inside a block quote host.

::: compare

````carve
> 1. a
>    1. b
>    {#i .k}
>
>    2. c
````

```html
<blockquote>
  <ol>
    <li><p>a</p>
      <ol>
        <li>b</li>
      </ol>
      <ol start="2" id="i" class="k">
        <li>c</li>
      </ol>
    </li>
  </ol>
</blockquote>
```

:::

Control: a comment line keeps the sub-list open, so the blank loosens the sub-list and not the item.

::: compare

````carve
- a
  - b
  %%

  - c
````

```html
<ul>
  <li>a
    <ul>
      <li><p>b</p></li>
      <li><p>c</p></li>
    </ul>
  </li>
</ul>
```

:::

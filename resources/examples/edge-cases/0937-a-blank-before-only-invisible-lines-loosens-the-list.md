---
page: edge-lists
---

## A blank before only invisible lines loosens the list

PART 9 §17 L1c with CARVE-P9-013 property 3. A blank line followed only by comments or definitions still stands between an item and the next sibling marker, wherever those lines sit inside the item: in a description body or in a nested list. Removing them must not change the output. A visible line after them keeps the blank inside the item, as the last row shows.

::::: compare

````carve
- :: term
  : payload

    %% c
- sub
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>payload</dd>
    </dl>
  </li>
  <li><p>sub</p></li>
</ul>
```

:::::

::::: compare

````carve
- a
  - b

    %% c
- sub
````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li><p>sub</p></li>
</ul>
```

:::::

::::: compare

````carve
- :: term
  : payload

    [r]: /u
- sub
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>payload</dd>
    </dl>
  </li>
  <li><p>sub</p></li>
</ul>
```

:::::

::::: compare

````carve
- a
  - b

    %%%
    c
    %%%
- sub
````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li><p>sub</p></li>
</ul>
```

:::::

::::: compare

````carve
- :: term
  : payload

    %% c
    more
- sub
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>
        <p>payload</p>
        <p>more</p>
      </dd>
    </dl>
  </li>
  <li>sub</li>
</ul>
```

:::::


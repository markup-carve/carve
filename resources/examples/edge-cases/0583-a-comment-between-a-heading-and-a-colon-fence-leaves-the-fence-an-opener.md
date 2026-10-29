## A comment between a heading and a colon fence leaves the fence an opener

Comments leave block ownership unchanged (CARVE-P0-005, CARVE-P9-053). The colon fence after the heading opens an empty div on its authored base (CARVE-P0-004, CARVE-P9-084).

:::: compare

````carve
- a
  - b

    %%%
  # h
    %%%
    :::
````

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
    <h1 id="h">h</h1>
    <div>

    </div>
  </li>
</ul>
```

::::

:::: compare

````carve
- a
  # h
      %%%
      :::
````

```html
<ul>
  <li>a
    <h1 id="h">h</h1>
    <div>

    </div>
  </li>
</ul>
```

::::

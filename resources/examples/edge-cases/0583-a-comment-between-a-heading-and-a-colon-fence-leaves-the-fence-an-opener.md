## A comment between a heading and a colon fence leaves the fence an opener

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

Comments leave block ownership unchanged (CARVE-P0-005). The colon fence after the heading opens an empty div on its authored base (CARVE-P0-024, CARVE-P9-084).

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
  </li>
</ul>
```

::::

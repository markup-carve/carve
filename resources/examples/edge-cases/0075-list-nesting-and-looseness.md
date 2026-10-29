## List nesting and looseness

A more-indented marker nests a sublist inside the item.

::: compare

```carve
- a
  - b
  - c
- d
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
      <li>c</li>
    </ul>
  </li>
  <li>d</li>
</ul>
```

:::

A blank line between items makes the list loose (each item wraps in `<p>`).

::: compare

```carve
- a

- b
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ul>
```

:::

An item with a second paragraph is loose; the continuation is indented
under the marker.

::: compare

```carve
- a

  more
- b
```

```html
<ul>
  <li><p>a</p>
    <p>more</p>
  </li>
  <li><p>b</p></li>
</ul>
```

:::

A flush-left line after a heading cannot stay in the item that ends on that
heading: the heading leaves no paragraph open. No enclosing frame adopts it
either - a line below an item's content column is not that item's content, so
the list closes and the line is a document paragraph (markup-carve/carve#2884).
What it does *not* do is fold into the heading: a heading ends at the newline
(§18), and its id is built from the heading line alone.

::: compare

```carve
- a
  - b
    # N
lazy
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <h1 id="N">N</h1>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

:::

A blank line inside a fenced code block is verbatim content, not an interior
block separator, so it does not loosen the list — a sibling item after such a
fence stays tight because no blank line actually separates the two items.

::: compare

````carve
- ```
  a

  b
  ```
- c
````

````html
<ul>
  <li>
    <pre><code>a

b
</code></pre>
  </li>
  <li>c</li>
</ul>
````

:::

Plain text on the line after a fenced code block closes is the item's own
trailing text. With no blank line anywhere the item stays tight, so that text
is not wrapped in a paragraph.

::: compare

````carve
- ```
  x
  ```
  after
````

````html
<ul>
  <li>
    <pre><code>x
</code></pre>
    after
  </li>
</ul>
````

:::

A bullet's content column is where the marker actually ends, not a fixed 2. A
bullet followed by extra spaces puts its content further right, and a block
belongs to the item only if it reaches that column.

::: compare

```carve
-   item
    # Wide
```

```html
<ul>
  <li>item
    <h1 id="Wide">Wide</h1>
  </li>
</ul>
```

:::

Below that column the line is lazy paragraph text instead, so its marker
survives literally — the same content-column rule as everywhere else, measured
from the marker rather than assumed.

::: compare

```carve
-   item
  # H
```

```html
<ul>
  <li>item</li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
```

:::

A task item's content column stays at 2. The checkbox is content rather than
marker, and extra spaces before it do not move the minimum column. A recognized
heading at column 4 therefore uses column 4 as its authored base.

::: compare

```carve
-   [ ] item
    # H
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="item"> item
    <h1 id="H">H</h1>
  </li>
</ul>
```

:::

## An opener past a hosted container's column opens there

A recognized block opener past the content column of a colon container that a
list item hosts takes its authored column as the base of that one block
(`CARVE-P0-004`, `CARVE-P9-083`, ruled on
markup-carve/carve#2973). The line-block spelling, a code fence and a heading
open like a named container does, with the container on the marker line or
below it, quoted or not.

:::: compare

````carve
- ::: box
    ::: |
    x
    :::
  :::
tail
````

```html
<ul>
  <li>
    <div class="box">
      <div class="line-block">
        <p>x</p>
      </div>
    </div>
  </li>
</ul>
<p>tail</p>
```

````carve
- a
  ::: box
     ```
     code
     ```
  :::
tail
````

```html
<ul>
  <li>a
    <div class="box">
      <pre><code>code
</code></pre>
    </div>
  </li>
</ul>
<p>tail</p>
```

````carve
> - ::: box
>    # h
tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <h1 id="h">h</h1>
      </div>
    </li>
  </ul>
</blockquote>
<p>tail</p>
```

::::

Under a paragraph of the container the same opener closes the paragraph
and opens its block (`CARVE-P9-083`, `CARVE-P0-004`).

:::: compare

````carve
- ::: box
  text
    ::: |
    x
    :::
  :::
tail
````

```html
<ul>
  <li>
    <div class="box">
      <p>text</p>
      <div class="line-block">
        <p>x</p>
      </div>
    </div>
  </li>
</ul>
<p>tail</p>
```

::::

A block at the item's column ends a sublist above it, so a later run past that
column belongs to the item and opens there too.

:::: compare

````carve
- outer
  - para

  ---
    ```
````

```html
<ul>
  <li>outer
    <ul>
      <li>para</li>
    </ul>
    <hr>
    <pre><code></code></pre>
  </li>
</ul>
```

::::

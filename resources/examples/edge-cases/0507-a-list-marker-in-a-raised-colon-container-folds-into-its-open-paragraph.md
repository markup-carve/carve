## A list marker in a raised colon container folds into its open paragraph

PART 0 S4 applies while the colon container holds an open paragraph
([carve#2474](https://github.com/markup-carve/carve/issues/2474)). The host’s
content column is 2 and the container’s authored base is 6. A marker at column
1, 2, 4, 6, or 8 folds into that paragraph. Column 0 opens a sibling item.

A blank closes the paragraph; an explicit container closer returns subsequent
markers to the host. The final cases cover those boundaries and a code fence.

::: compare

`````carve
- head

      :::
      a
- second
`````

`````html
<ul>
  <li>head
    <div>
      <p>a</p>
    </div>
  </li>
  <li>second</li>
</ul>
`````

:::

::: compare

`````carve
- head

      ::: note
      a
- second
`````

`````html
<ul>
  <li>head
    <aside class="admonition note" aria-label="Note">
      <p>a</p>
    </aside>
  </li>
  <li>second</li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
      a
 - second
`````

`````html
<ul>
  <li>head
    <div>
      <p>a</p>
    </div>
  </li>
  <li>second</li>
</ul>
`````

:::

::: compare

`````carve
- head

      ::: note
      a
 - second
`````

`````html
<ul>
  <li>head
    <aside class="admonition note" aria-label="Note">
      <p>a</p>
    </aside>
  </li>
  <li>second</li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
      a
  - second
`````

`````html
<ul>
  <li>head
    <div>
      <p>a
- second</p>
    </div>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      ::: note
      a
  - second
`````

`````html
<ul>
  <li>head
    <aside class="admonition note" aria-label="Note">
      <p>a
- second</p>
    </aside>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
      a
    - second
`````

`````html
<ul>
  <li>head
    <div>
      <p>a
- second</p>
    </div>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      ::: note
      a
    - second
`````

`````html
<ul>
  <li>head
    <aside class="admonition note" aria-label="Note">
      <p>a
- second</p>
    </aside>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
      a
      - second
`````

`````html
<ul>
  <li>head
    <div>
      <p>a
- second</p>
    </div>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      ::: note
      a
      - second
`````

`````html
<ul>
  <li>head
    <aside class="admonition note" aria-label="Note">
      <p>a
- second</p>
    </aside>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
      a
        - second
`````

`````html
<ul>
  <li>head
    <div>
      <p>a
- second</p>
    </div>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      ::: note
      a
        - second
`````

`````html
<ul>
  <li>head
    <aside class="admonition note" aria-label="Note">
      <p>a
- second</p>
    </aside>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
      a
      :::
  - second
`````

`````html
<ul>
  <li>head
    <div>
      <p>a</p>
    </div>
    <ul>
      <li>second</li>
    </ul>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
  - second
`````

`````html
<ul>
  <li>head
    <div>
      <ul>
        <li>second</li>
      </ul>
    </div>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
      ```
      :::
      ```
      a
  - second
      :::
  - third
`````

`````html
<ul>
  <li>head
    <div>
      <pre><code>:::
</code></pre>
      <p>a
- second</p>
    </div>
    <ul>
      <li>third</li>
    </ul>
  </li>
</ul>
`````

:::

::: compare

`````carve
- head

      :::
      a

 - second
`````

`````html
<ul>
  <li><p>head</p>
    <div>
      <p>a</p>
    </div>
  </li>
  <li><p>second</p></li>
</ul>
`````

:::

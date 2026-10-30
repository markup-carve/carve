---
page: edge-lists
---

## A line below an empty div after a first-block plus is not lazy

A line below a container's column folds only into an open paragraph (PART 0 S4). A div or admonition that a first-block `+` takes, or that follows a refused `+`, holds no paragraph until a line at its column opens one, so a column-zero line after its opener ends the item and starts its own paragraph (carve#4269). An attribute line opens no paragraph either. Once the div holds a paragraph, the column-zero line folds into it.

::::::: compare

````carve
::: d
- d
  - e
    - +
  :::
after
````

````html
<div class="d">
  <ul>
    <li>d
      <ul>
        <li>e
          <ul>
            <li>+</li>
          </ul>
        </li>
      </ul>
      <div>

      </div>
    </li>
  </ul>
  <p>after</p>
</div>
````

:::::::

::::::: compare

````carve
- d
  - +
  :::
after
````

````html
<ul>
  <li>d
    <ul>
      <li>
        <div>

        </div>
      </li>
    </ul>
  </li>
</ul>
<p>after</p>
````

:::::::

::::::: compare

````carve
- d
  - +
  ::: note
after
````

````html
<ul>
  <li>d
    <ul>
      <li>
        <aside class="admonition note" aria-label="Note">

        </aside>
      </li>
    </ul>
  </li>
</ul>
<p>after</p>
````

:::::::

::::::: compare

````carve
- +
  ::: d
  {.c}
after
````

````html
<ul>
  <li>+
    <div class="d">

    </div>
  </li>
</ul>
<p>after</p>
````

:::::::

::::::: compare

````carve
- d
  - +
  :::
  in
after
````

````html
<ul>
  <li>d
    <ul>
      <li>
        <div>
          <p>in
after</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
````

:::::::

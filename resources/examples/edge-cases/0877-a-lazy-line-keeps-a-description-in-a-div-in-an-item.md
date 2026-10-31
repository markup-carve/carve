---
page: edge-definitions
---

## A lazy line keeps a description in a div in an item

CARVE-P9-083 and PART 0 S4 (carve#4628). A line below the description's body column folds into its paragraph and closes nothing, so a later line at the body column still belongs to the description, as it does without the item or without the div.

::: compare

````carve
- :::
  :: t
  : t
  x
    # u
````

````html
<ul>
  <li>
    <div>
      <dl>
        <dt>t</dt>
        <dd>
          <p>t
x</p>
          <h1 id="u">u</h1>
        </dd>
      </dl>
    </div>
  </li>
</ul>
````

:::

::: compare

````carve
1. ::: note
   :: t
   : t
   x
     ```
     k
     ```
````

````html
<ol>
  <li>
    <aside class="admonition note" aria-label="Note">
      <dl>
        <dt>t</dt>
        <dd>
          <p>t
x</p>
          <pre><code>k
</code></pre>
        </dd>
      </dl>
    </aside>
  </li>
</ol>
````

:::

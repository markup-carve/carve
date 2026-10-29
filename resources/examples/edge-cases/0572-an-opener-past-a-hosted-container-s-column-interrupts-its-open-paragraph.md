## An opener past a hosted container's column interrupts its open paragraph

A recognized opener past an item-hosted colon body's column interrupts its
open paragraph as it does in an item (`CARVE-P9-083`, `CARVE-P0-004`).

:::: compare

````carve
- ::: box
  text
   # h
  :::
````

```html
<ul>
  <li>
    <div class="box">
      <p>text</p>
      <h1 id="h">h</h1>
    </div>
  </li>
</ul>
```

````carve
> - ::: box
>   text
>    ```
>    x
>    ```
>   :::
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <p>text</p>
        <pre><code>x
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
```

::::

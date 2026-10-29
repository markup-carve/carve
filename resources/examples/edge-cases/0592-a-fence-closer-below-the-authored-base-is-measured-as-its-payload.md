## A fence closer below the authored base is measured as its payload

:::: compare

`````carve
- item

    ```
    a
   ```

  tail
`````

````html
<ul>
  <li><p>item</p>
    <pre><code>a
</code></pre>
    <p>tail</p>
  </li>
</ul>
````

::::

:::: compare

`````carve
- item

    ```
    a
    ```

  tail
`````

````html
<ul>
  <li><p>item</p>
    <pre><code>a
</code></pre>
    <p>tail</p>
  </li>
</ul>
````

::::

:::: compare

`````carve
- item

    ````
    a
   ```

  tail
`````

````html
<ul>
  <li>item
    <pre><code>a
```

tail
</code></pre>
  </li>
</ul>
````

::::

---
page: edge-definitions
---

## A line-block stanza remains open after a paired payload run

PART 2 line_block and PART 0 S4 (carve#4748). Pairing an inline span across payload lines does not close the line block. The next lazy line stays in its open stanza.

:::::: compare

`````carve
:: u
: ::: |
  ~~~
  ~~~
b
`````

```html
<dl>
  <dt>u</dt>
  <dd>
    <div class="line-block">
      <p>~~~<br>
~~~<br>
b</p>
    </div>
  </dd>
</dl>
```

::::::

The same ownership holds when the paired run is backticks.

:::::: compare

`````carve
:: u
: ::: |
  ```
  ```
b
`````

```html
<dl>
  <dt>u</dt>
  <dd>
    <div class="line-block">
      <p><code>
</code><br>
b</p>
    </div>
  </dd>
</dl>
```

::::::

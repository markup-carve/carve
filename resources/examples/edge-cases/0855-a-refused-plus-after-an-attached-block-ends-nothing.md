---
page: edge-lists
---

## A refused plus after an attached block ends nothing

Only a `+` at the host's marker column reaches the host again. Any other `+` is a letter and ends nothing (CARVE-P9-085).

::: compare

```carve
- o
+
> q
  +
  > r
```

```html
<ul>
  <li>o
    <blockquote><p>q
+
r</p></blockquote>
  </li>
</ul>
```

:::

::: compare

`````carve
- a
  - b
  +
  ```
```
+
 ```
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code></code></pre>
      </li>
    </ul>
  </li>
</ul>
<pre><code>+
 ```
</code></pre>
`````

:::

---
page: edge-definitions
---

## A nested code body keeps its literal content after frame stripping

::: compare

```carve
- a
  - a
  	```
    	 z
  	```
```

```html
<ul>
  <li>a
    <ul>
      <li>a
        <pre><code>	 z
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

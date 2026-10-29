## A below-column fence stays in a definition paragraph

A closer left of the authored fence cannot turn that fence into a block.

::: compare

````carve
:: t
: d
 ```
x
```
````

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<pre><code>x
</code></pre>
```

:::

## A note-claimed fence line keeps the item loose

An unclosed fence line below a footnote body interrupts the note paragraph and opens a fence in the item. The fence runs to the end of the item, so the blank and the reference after it are payload.

::: compare

````carve
- item
  [^c]: [^d]: para
          more
   ~~~

  See[^c][^d]
````

```html
<ul>
  <li>item
    <pre><code>
See[^c][^d]
</code></pre>
  </li>
</ul>
```

:::

::: compare

````carve
1. item
   [^c]: para
    ~~~~

   See[^c]
````

```html
<ol>
  <li>item
    <pre><code>
See[^c]
</code></pre>
  </li>
</ol>
```

:::

::: compare

````carve
:: term
: item
  [^c]: para
   ```

  See[^c]
````

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>item</p>
    <pre><code>
See[^c]
</code></pre>
  </dd>
</dl>
```

:::

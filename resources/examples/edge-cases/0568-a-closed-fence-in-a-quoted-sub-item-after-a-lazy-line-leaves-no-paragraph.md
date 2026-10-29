## A closed fence in a quoted sub-item after a lazy line leaves no paragraph

A lazy line folds into the paragraph of the nested item, and a fence at that
item's column then closes it. The closed code block leaves no paragraph in any
frame, so the unmarked line below closes the quote and the list
(`CARVE-P0-009`, markup-carve/carve#2973). The unquoted spelling reads the
same way.

::: compare

````carve
> - a
>   - c
> b
>     ```
>     y
>     ```
flush
````

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>c
b
          <pre><code>y
</code></pre>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
<p>flush</p>
```

````carve
- a
  - c
b
    ```
    y
    ```
flush
````

```html
<ul>
  <li>a
    <ul>
      <li>c
b
        <pre><code>y
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>flush</p>
```

:::

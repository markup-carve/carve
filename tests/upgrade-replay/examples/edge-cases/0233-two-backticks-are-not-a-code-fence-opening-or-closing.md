## Two backticks are not a code fence, opening or closing

A fence opens on three or more. Two backticks are an inline code span, so the lines between them become its content instead of a code block.

::: compare

```carve
``
code
``
```

```html
<p><code>
code
</code></p>
```

:::

The closer is the same length rule seen from the other side: a two-backtick line inside an open fence is CONTENT, not the end of the block.

::: compare

````carve
```
code
``
still code
```
````

````html
<pre><code>code
``
still code
</code></pre>
````

:::

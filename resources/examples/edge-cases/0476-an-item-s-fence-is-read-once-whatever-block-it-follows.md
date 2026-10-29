## An item's fence is read once, whatever block it follows

A fence on an item's continuation line opens a code block (see *A fence opened
on a list marker line, body below the content column*), and that holds after a
caption or a quote as it does after a paragraph. Each reader takes the answer
the item collector gave, so the fence is not folded into the caption or the
quoted paragraph, and ` y` ends it and the item. The trailing run then opens an
empty code block after the document paragraph `y`. With the closer inside the
item the same documents open the same block.

::::: compare

````carve
- ![a](i)
  ^ cap
  ```
  b
 y
  ```
````

```html
<ul>
  <li>
    <figure>
      <img src="i" alt="a">
      <figcaption>cap</figcaption>
    </figure>
    <pre><code>b
</code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::::

::::: compare

````carve
- > q
  ```
  b
 y
  ```
````

```html
<ul>
  <li>
    <blockquote><p>q</p></blockquote>
    <pre><code>b
</code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::::

## A container boundary is read at the container's own column

Two boundaries a reader placed by indentation instead of by the container that
owns the line: an opener past the content column of a hosted container, and a
fence closer written after its item had ended (markup-carve/carve#2925).

A named colon opener written past the content column inside a container an item
hosts. The opener is recognized and takes its
authored column as the base of that one block (`CARVE-P0-004`,
markup-carve/carve-php#3137). The quoted spelling reads the same way, and with
the box left unclosed the line below still leaves the quote.

::: compare

````carve
- ::: box
   ::: note
   x
   :::
  :::
tail
````

```html
<ul>
  <li>
    <div class="box">
      <aside class="admonition note" aria-label="Note">
        <p>x</p>
      </aside>
    </div>
  </li>
</ul>
<p>tail</p>
```

````carve
> - ::: box
>    ::: note
>    x
>    :::
tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <aside class="admonition note" aria-label="Note">
          <p>x</p>
        </aside>
      </div>
    </li>
  </ul>
</blockquote>
<p>tail</p>
```

:::

Under a paragraph of the box the same opener closes the paragraph and
establishes its own base (`CARVE-P9-083`, `CARVE-P0-004`).

:::: compare

````carve
- ::: box
  text
   ::: note
   x
   :::
  :::
tail
````

```html
<ul>
  <li>
    <div class="box">
      <p>text</p>
      <aside class="admonition note" aria-label="Note">
        <p>x</p>
      </aside>
    </div>
  </li>
</ul>
<p>tail</p>
```

::::

A fence run after a nested item has ended. The blank and the heading at the
outer item's column end the child item, so the later run is not inside it and
closes nothing: the first run opens a code block that the heading ends
(`CARVE-P0-014`, markup-carve/carve#2961). The later run is past the outer
item's column with no paragraph open, so it opens a code block of its own
(`CARVE-P0-004`). The top-level spelling reads the first run the same way.

::: compare

````carve
- outer
  - para
    ```
    code

  # h
    ```
````

```html
<ul>
  <li>outer
    <ul>
      <li>para
        <pre><code>code

</code></pre>
      </li>
    </ul>
    <h1 id="h">h</h1>
    <pre><code></code></pre>
  </li>
</ul>
```

````carve
- a
  ```
  b

y
  ```
````

```html
<ul>
  <li>a
    <pre><code>b

</code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::

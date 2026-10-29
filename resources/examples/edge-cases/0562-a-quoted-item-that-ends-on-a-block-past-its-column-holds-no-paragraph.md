## A quoted item that ends on a block past its column holds no paragraph

An opener past a nested item's content column inside a quote. The heading is
rebased into the item (`CARVE-P0-004`), which then holds no paragraph, so no
frame of the quote adopts the line below (`CARVE-P0-009`,
markup-carve/carve#2960). In the second document the backtick run opens a
fence under the item's paragraph, so the tilde lines below it are its content.

::::: compare

````carve
> - b
>   - c
>       # h
tail
````

```html
<blockquote>
  <ul>
    <li>b
      <ul>
        <li>c
          <h1 id="h">h</h1>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
<p>tail</p>
```

````carve
> - a
>     ```
>     ~~~
>     code
>     ~~~
tail
````

```html
<blockquote>
  <ul>
    <li>a
      <pre><code>~~~
code
~~~
</code></pre>
    </li>
  </ul>
</blockquote>
<p>tail</p>
```

:::::

The control. Text past the column establishes no base and the paragraph stays
open.

::::: compare

````carve
> - b
>   - c
>       text
tail
````

```html
<blockquote>
  <ul>
    <li>b
      <ul>
        <li>c
text
tail</li>
      </ul>
    </li>
  </ul>
</blockquote>
```

:::::

A marker in a line-block payload is payload. It opens no sublist and the run
after it opens no code block, so the line below folds into the payload as it
does after any other payload line.

::::: compare

````carve
- ::: |
  - ```
tail
````

```html
<ul>
  <li>
    <div class="line-block">
      <p>- <code>
tail</code></p>
    </div>
  </li>
</ul>
```

:::::

## A line retained after a comment opens a paragraph

A comment at or past an item’s content column closes its paragraph and grants
no retention to a following below-column line; only a comment consumed below
that column grants retention (`CARVE-P0-009` X1, `CARVE-P9-053`).

::: compare

````carve
> - ::: box
>   - inner
>     %%%
>     hidden
>     %%%
>    ```
>    code
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <ul>
          <li>inner</li>
        </ul>
        <pre><code>code
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

````carve
> - ::: box
>   - ::: inner
>     %%%
>     hidden
>     %%%
>    ```
>    code
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <ul>
          <li>
            <div class="inner">

            </div>
          </li>
        </ul>
        <pre><code>code
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

:::

The below-column line belongs to the outer item after the sublist, and the
flush-left line continues its paragraph.

::: compare

````carve
- a
  - inner
    %% c
   code
tail
````

```html
<ul>
  <li>a
    <ul>
      <li>inner</li>
    </ul>
    code
tail
  </li>
</ul>
```

:::

The below-column line opens a document paragraph. A following list marker
does not interrupt it; a line at document column 0 also leaves the item.

::: compare

````carve
- inner
  %% c
 code
- tail
````

```html
<ul>
  <li>inner</li>
</ul>
<p>code
- tail</p>
```

````carve
- inner
  %% c
code
tail
````

```html
<ul>
  <li>inner</li>
</ul>
<p>code
tail</p>
```

:::

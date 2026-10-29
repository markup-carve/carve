## A closed block leaves no frame for the line below

`CARVE-P0-009` asks one question of a line below an item's content column: is a
paragraph open at the deepest frame? Where the last block there is closed, the
line closes the list and begins a new block, and no surviving frame adopts it.
These documents pin the answer in the shapes where a reader kept the line in a
frame that had ended (markup-carve/carve#2925).

A fence opener with no closer under the item's paragraph. The first run
interrupts the paragraph (§10 I4) and opens a code block that runs to the end of
the item, so the blank, the tilde lines and anything between them are its
content. A fenced body is not a paragraph, and `after` is a document paragraph
(markup-carve/carve#2949). A thematic break between the two changes nothing.

::: compare

````carve
- a
    ```

  ~~~
  code
  ~~~
after
````

```html
<ul>
  <li>a
    <pre><code>
~~~
code
~~~
</code></pre>
  </li>
</ul>
<p>after</p>
```

````carve
- a
    ```

  ---
  ~~~
  code
  ~~~
after
````

```html
<ul>
  <li>a
    <pre><code>
---
~~~
code
~~~
</code></pre>
  </li>
</ul>
<p>after</p>
```

:::

A line of prose after the tilde block is code content too, and `after` still
leaves the item.

::: compare

````carve
- a
    ```

  ~~~
  code
  ~~~
  more
after
````

```html
<ul>
  <li>a
    <pre><code>
~~~
code
~~~
more
</code></pre>
  </li>
</ul>
<p>after</p>
```

:::

An empty container in a quoted nested item. Its item holds no paragraph, so the
unmarked line closes the quote and opens a document list, whether or not an
unrelated list stands above. The second source puts the container in the outer
item.

::: compare

````carve
>   - a
> - b
>     - c
>       :::
1. lazy
````

```html
<blockquote>
  <ul>
    <li>a</li>
    <li>b
      <ul>
        <li>c
          <div>

          </div>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
<ol>
  <li>lazy</li>
</ol>
```

````carve
>   - a
> - b
>     - c
>   :::
1. lazy
````

```html
<blockquote>
  <ul>
    <li>a</li>
    <li>b
      <ul>
        <li>c</li>
      </ul>
      <div>

      </div>
    </li>
  </ul>
</blockquote>
<ol>
  <li>lazy</li>
</ol>
```

:::

The two controls of markup-carve/carve#2925. A closed container on a quoted
marker line stores no claim, and a column cannot supply the quote prefix, so
`tail` opens a document list at either column.

::: compare

````carve
> - ::: box
>   :::
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">

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
>   :::
  - tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">

      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

:::

A block at a quoted item's content column is read by that item, and it leaves
the quote no paragraph either.

::: compare

````carve
> - a
>   # H
tail
````

```html
<blockquote>
  <ul>
    <li>a
      <h1 id="H">H</h1>
    </li>
  </ul>
</blockquote>
<p>tail</p>
```

:::

A quote inside an item answers with its own last block on every line, not only
on the marker line.

::: compare

````carve
- a
  > # H
tail
````

```html
<ul>
  <li>a
    <blockquote>
      <h1 id="H">H</h1>
    </blockquote>
  </li>
</ul>
<p>tail</p>
```

:::

A fence on a sublist's marker line is closed like any other, and the line below
it is not the outer item's.

::: compare

````carve
- a
  - ```
    x
    ```
tail
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code>x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

A code block in a footnote body on a marker line. Every line of the body is the
definition's, so the item holds no paragraph after it and `below` leaves the
list, with one code block or two and with or without a child line.

::: compare

````carve
- [^a]: text
    [^b]: inner
      ~~~
      one
      ~~~

      ~~~
      two
      ~~~
below

[^a] [^b]
````

```html
<ul>
  <li></li>
</ul>
<p>below</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>text<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>inner</p>
      <pre><code>one
</code></pre>
      <pre><code>two
</code></pre>
      <p><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

````carve
- [^a]: text
    - child
    [^b]: inner
      ~~~
      one
      ~~~
below

[^a] [^b]
````

```html
<ul>
  <li></li>
</ul>
<p>below</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>text
- child<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>inner</p>
      <pre><code>one
</code></pre>
      <p><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A comment below the content column is not a line of the container. The colon
opener on the marker line has opened an empty container, the item holds no
paragraph, and the line below the comment is a document paragraph, as it is
after a container closed on the next line.

::: compare

````carve
- ::: inner
 %% c
 text
````

```html
<ul>
  <li>
    <div class="inner">

    </div>
  </li>
</ul>
<p>text</p>
```

:::

An unmatched comment fence is the line form (`CARVE-P9-053`), so it grants and
refuses ownership exactly as `%%` does. Neither item survives the comment below
its column (markup-carve/carve#2950).

::: compare

````carve
- ::: box
  %%%%
%% j
  x
````

```html
<ul>
  <li>
    <div class="box">

    </div>
  </li>
</ul>
<p>x</p>
```

````carve
- a
  %%%%
%%%
  x
````

```html
<ul>
  <li>a</li>
</ul>
<p>x</p>
```

:::

## A below-column line continues a paragraph only where one is open

A line below an item's content column is not that item's content. It reaches the
document only through lazy continuation, which extends an OPEN PARAGRAPH and
nothing else, so the question is asked at the deepest frame: a paragraph open
there takes the line, and otherwise the list closes and the line begins a new
block (`CARVE-P0-009`, markup-carve/carve#2884).

The clause used to carve out a heading and then hand the line to a surviving
frame's paragraph anyway, which adopted a column-0 line into an item two columns
to the right of it.

The ticket's shape, at two and three levels. The inner item's last block is a
heading, which leaves no paragraph open, so `lazy` is a document paragraph
rather than new content of an item whose content column it never reaches.

::: compare

````carve
- a
  - b
    # N
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <h1 id="N">N</h1>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

````carve
- a
  - b
    - c
      # N
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <ul>
          <li>c
            <h1 id="N">N</h1>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

:::

A thematic break, a fenced code block, a `:::` container and a table answer the
same way, because the question is whether a paragraph is open and not which
block kind closed it.

::: compare

````carve
- a
  - b
    ---
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <hr>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

````carve
- a
  - b
    ```
    code
    ```
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>code
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

````carve
- a
  - b
    ::: note
    x
    :::
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <aside class="admonition note" aria-label="Note">
          <p>x</p>
        </aside>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

````carve
- a
  - b
    | h |
    | - |
    | c |
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <table>
          <thead>
            <tr><th scope="col">h</th></tr>
          </thead>
          <tbody>
            <tr><td>c</td></tr>
          </tbody>
        </table>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

:::

The recursion is unchanged: follow the last child container to its leaf. A quote
whose own last block is a heading holds no paragraph either.

::: compare

````carve
- a
  - b
    > # H
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <blockquote>
          <h1 id="H">H</h1>
        </blockquote>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

:::

A paragraph, a block quote, and a nested list whose leaf carries one, all hold an
open paragraph, and the line folds into it. That is ordinary lazy continuation.

::: compare

````carve
- a
  - b
    text
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
text
lazy</li>
    </ul>
  </li>
</ul>
```

````carve
- a
  - b
    > q
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <blockquote><p>q
lazy</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

````carve
- a
  - b
    - c
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <ul>
          <li>c
lazy</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::

A blank line closes the paragraph, so the line below it was never a continuation.
A line at or past the content column is the item's own content and still
continues it.

::: compare

````carve
- a
  - b
    # N

lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <h1 id="N">N</h1>
      </li>
    </ul>
  </li>
</ul>
<p>lazy</p>
```

````carve
- a
  - b
    # N
  lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <h1 id="N">N</h1>
      </li>
    </ul>
    lazy
  </li>
</ul>
```

:::

A verbatim payload is opaque, so a container opener written inside a code fence
is text and reaches nothing. The paragraph below the closed fence is open in both
spellings, and the line folds.

::: compare

````carve
- a
  - b
    ```
    ::: note
    ```
    text
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>::: note
</code></pre>
        text
lazy
      </li>
    </ul>
  </li>
</ul>
```

````carve
- a
  - b
    ::: note
    x
    :::
    text
lazy
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <aside class="admonition note" aria-label="Note">
          <p>x</p>
        </aside>
        text
lazy
      </li>
    </ul>
  </li>
</ul>
```

A closed fence opened on nested markers leaves no paragraph for a below-column
line. This applies to list items and description bodies (carve#2895).
An unfinished opener keeps its first body line inside its fence.

````carve
- - ```
    ```
x
````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>x</p>
```

````carve
- - ```
    ```
```
````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
  </li>
</ul>
<pre><code></code></pre>
```

````carve
- - ```
    x
````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code>x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

````carve
:: t
: - - ```
      ```
x
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code></code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </dd>
</dl>
<p>x</p>
```

````carve
:: t
: - - ```
      ```
```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code></code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </dd>
</dl>
<pre><code></code></pre>
```

````carve
:: t
: - - ```
      x
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x
</code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </dd>
</dl>
```

Raw fences and deeper marker stacks answer the same question. A nested heading
or table also leaves no paragraph open in a description body. The last control
leaves the below-column run outside the description body and its nested fence.

````carve
- - ```=html
    ```
x
````

```html
<ul>
  <li>
    <ul>
      <li>
        
      </li>
    </ul>
  </li>
</ul>
<p>x</p>
```

````carve
- - ```=html
    ```
```rust
````

```html
<ul>
  <li>
    <ul>
      <li>
        
      </li>
    </ul>
  </li>
</ul>
<pre><code class="language-rust"></code></pre>
```

````carve
- - - ```
      ```
x
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code></code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
<p>x</p>
```

````carve
:: t
: - # h
x
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <h1 id="h">h</h1>
      </li>
    </ul>
  </dd>
</dl>
<p>x</p>
```

````carve
:: t
: - a
    # H
tail
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
        <h1 id="H">H</h1>
      </li>
    </ul>
  </dd>
</dl>
<p>tail</p>
```

````carve
:: t
: - a
     # H
tail
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
        <h1 id="H">H</h1>
      </li>
    </ul>
  </dd>
</dl>
<p>tail</p>
```

````carve
:: t
: - a
      # H
tail
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
        <h1 id="H">H</h1>
      </li>
    </ul>
  </dd>
</dl>
<p>tail</p>
```

````carve
:: t
: - | a |
    | - |
x
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <table>
          <thead>
            <tr><th scope="col">a</th></tr>
          </thead>
        </table>
      </li>
    </ul>
  </dd>
</dl>
<p>x</p>
```

````carve
:: t
: - ```
```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
  </dd>
</dl>
<pre><code></code></pre>
```

:::

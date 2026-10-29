## A continuation marker uses its container column

A lone `+` at an open marker column takes one block at that column; a same-column list item refuses it (markup-carve/carve#3421). These rows pin the relative column rule for nested containers, fences, tables, and first-block forms.

::::::: compare

`````carve
- a
  - b
  +
  > q
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - b
+
> q
`````

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - b
  +
  para
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
        para
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
1. a
+
> q
`````

```html
<ol>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
</ol>
```

:::::::

::::::: compare

`````carve
- [ ] task
+
> q
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="task"> task
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
x[^a]

[^a]: note
+
> q
`````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <blockquote><p>q</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::::::

::::::: compare

`````carve
:: term
: body
+
> q
`````

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>body</p>
    <blockquote><p>q</p></blockquote>
  </dd>
</dl>
```

:::::::

::::::: compare

`````carve
> q
+
| a |
`````

```html
<blockquote>
  <p>q</p>
  <table>
    <tbody>
      <tr><td>a</td></tr>
    </tbody>
  </table>
</blockquote>
```

:::::::

::::::: compare

`````carve
- a
  - b
  +
> q
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
+</li>
    </ul>
  </li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::::::

::::::: compare

`````carve
- a
  - b
  +
  > q
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - b
  +
    > q
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
+
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- foo
  - [ ] task
  +
  - x
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="task +"> task
+</li>
    </ul>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
+
- b
`````

```html
<ul>
  <li>a
+</li>
  <li>b</li>
</ul>
```

:::::::

::::::: compare

`````carve
> - a
  +
`````

```html
<blockquote>
  <ul>
    <li>a
+</li>
  </ul>
</blockquote>
```

:::::::

::::::: compare

`````carve
- a
  > q
  +
  para
`````

```html
<ul>
  <li>a
    <blockquote>
      <p>q</p>
      <p>para</p>
    </blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - ```
  +
  > q
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code></code></pre>
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - ```
    +
    ```
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code>+
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - ```
  +

  tail
`````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    <p>+</p>
    <p>tail</p>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - b
  +

  tail
`````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b
+</li>
    </ul>
    <p>tail</p>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - b
  +
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
+</li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - b

  +
  > q
`````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- x
  - y
    - a
	+
	> q
`````

```html
<ul>
  <li>x
    <ul>
      <li>y
        <ul>
          <li>a
            <blockquote><p>q</p></blockquote>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  | h |
  | v |
+
> q
`````

```html
<ul>
  <li>a
    <table>
      <tbody>
        <tr><td>h</td></tr>
        <tr><td>v</td></tr>
      </tbody>
    </table>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  | h |
  | v |
  + text |
`````

```html
<ul>
  <li>a
    <table>
      <tbody>
        <tr><td>h</td></tr>
        <tr><td>v text</td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - b
+
> q
`````

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- foo
  - [ ] task
  +
  ```sh
  npm test
  ```
  - [ ] more
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="task"> task
        <pre><code class="language-sh">npm test
</code></pre>
      </li>
      <li><input type="checkbox" disabled aria-label="more"> more</li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - +
  > b
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <blockquote><p>b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - +
> b
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <blockquote><p>b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- - +
> q
`````

```html
<ul>
  <li>
    <ul>
      <li>
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- - [ ] +
> q
`````

```html
<ul>
  <li>
    <ul class="task-list">
      <li><input type="checkbox" disabled> 
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- > +
> q
`````

```html
<ul>
  <li>
    <blockquote>
      <blockquote><p>q</p></blockquote>
    </blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
> - +
> q
`````

```html
<blockquote>
  <ul>
    <li>q</li>
  </ul>
</blockquote>
```

:::::::

::::::: compare

`````carve
1. - +
> q
`````

```html
<ol>
  <li>
    <ul>
      <li>
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ol>
```

:::::::

::::::: compare

`````carve
 - a
 +
 > q
`````

```html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::::::

## A refused continuation plus remains text

A refused `+` on its own line stays text, or fence payload at the fence content column. A first-block `+` that attaches nothing (`- +`, `- [ ] +`) leaves its item empty instead (markup-carve/carve#3421).

::::::: compare

````carve
- a
  - b
  +
tail
````

```html
<ul>
  <li>a
    <ul>
      <li>b
+
tail</li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- a
  - b
  +
````

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

````carve
- a

+
- s
````

```html
<ul>
  <li>a</li>
</ul>
<p>+</p>
<ul>
  <li>s</li>
</ul>
```

:::::::

::::::: compare

````carve
- ```
+
- s
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>+</p>
<ul>
  <li>s</li>
</ul>
```

:::::::

::::::: compare

````carve
- a
  - ```
    +
````

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

````carve
- a
  - ```
  +
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    +
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- a
  - ```
  x
  +
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    x
+
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- a
  - ```
  x
    +
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    x
+
  </li>
</ul>
```

:::::::

::::::: compare

````carve
1. [ ] +
````

```html
<ol>
  <li>[ ] +</li>
</ol>
```

:::::::

::::::: compare

````carve
- foo
  - [ ] task
  +
  > q
````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="task"> task
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- foo
  - [ ] task
    +
  - x
````

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

````carve
- foo
  - [ ] task
  +
  - x
````

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
> - a
> +
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
  - b
  +
  - c
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
+</li>
      <li>c</li>
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
- foo
  - [ ] task
    +
    q
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="task + q"> task
+
q</li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - ``` =html
    +
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        +
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - ``` =html
  +
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        
      </li>
    </ul>
    +
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - b
  +
left
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
+
left</li>
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
- > a
  +
  b
`````

```html
<ul>
  <li>
    <blockquote>
      <p>a</p>
      <p>b</p>
    </blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- x
  - > a
    +
    b
`````

```html
<ul>
  <li>x
    <ul>
      <li>
        <blockquote>
          <p>a</p>
          <p>b</p>
        </blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- +
`````

```html
<ul>
  <li></li>
</ul>
```

:::::::

::::::: compare

`````carve
- +

para
`````

```html
<ul>
  <li></li>
</ul>
<p>para</p>
```

:::::::

::::::: compare

`````carve
- +
- b
`````

```html
<ul>
  <li></li>
  <li>b</li>
</ul>
```

:::::::

::::::: compare

`````carve
1. +
`````

```html
<ol>
  <li></li>
</ol>
```

:::::::

::::::: compare

`````carve
- [ ] +
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> </li>
</ul>
```

:::::::

::::::: compare

`````carve
- foo
  - +
  - b
`````

```html
<ul>
  <li>foo
    <ul>
      <li></li>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
> +
flush
`````

```html
<blockquote><p>flush</p></blockquote>
```

:::::::

::::::: compare

`````carve
> > +
flush
`````

```html
<blockquote>
  <blockquote><p>flush</p></blockquote>
</blockquote>
```

:::::::

::::::: compare

`````carve
- a
  - - +
  > b
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <ul>
          <li>
            <blockquote><p>b</p></blockquote>
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
  - - +
> b
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <ul>
          <li>
            <blockquote><p>b</p></blockquote>
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
  - > +
  b
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
> > +
> b
`````

```html
<blockquote>
  <blockquote><p>b</p></blockquote>
</blockquote>
```

:::::::

::::::: compare

`````carve
- > +
# h
`````

```html
<ul>
  <li>
    <blockquote>
      <h1 id="h">h</h1>
    </blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- > +
```
x
```
`````

```html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- > +
| a |
`````

```html
<ul>
  <li>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a</td></tr>
        </tbody>
      </table>
    </blockquote>
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
- a
  - > +
# h
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <blockquote>
          <h1 id="h">h</h1>
        </blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- a
  - > +
  # h
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <blockquote>
          <h1 id="h">h</h1>
        </blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

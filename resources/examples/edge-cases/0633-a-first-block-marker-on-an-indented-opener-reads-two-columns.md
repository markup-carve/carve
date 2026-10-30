## A first-block marker on an indented opener reads two columns

An indented first-block opener takes one block at its own marker column and no
other (carve#4409). A list marker at that column never attaches under a list item
(markup-carve/carve#3421).

::: compare

`````carve
- foo
  - +
- x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
  </li>
  <li>x</li>
</ul>
```

:::

::: compare

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

:::

::: compare

`````carve
- foo
  - [ ] task
  +
  1. x
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="task +"> task
+</li>
    </ul>
    <ol>
      <li>x</li>
    </ol>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - b
  +
    - x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>b
+
        <ul>
          <li>x</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
> b
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<blockquote><p>b</p></blockquote>
```

:::

::: compare

`````carve
- foo
  - +
 x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+
x</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
> b
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<blockquote><p>b</p></blockquote>
```

:::

::: compare

`````carve
- foo
  - +
 > b
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<blockquote><p>b</p></blockquote>
```

:::

::: compare

`````carve
- foo
  - +
  > b
`````

```html
<ul>
  <li>foo
    <ul>
      <li>
        <blockquote><p>b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
    > b
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+
        <blockquote><p>b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - [ ] +
> b
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="+"> +</li>
    </ul>
  </li>
</ul>
<blockquote><p>b</p></blockquote>
```

:::

::: compare

`````carve
- foo
  - [ ] +
 > b
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="+"> +</li>
    </ul>
  </li>
</ul>
<blockquote><p>b</p></blockquote>
```

:::

::: compare

`````carve
- foo
  - [ ] +
  > b
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled> 
        <blockquote><p>b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - [ ] +
    > b
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="+"> +
        <blockquote><p>b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  1. +
> b
`````

```html
<ul>
  <li>foo
    <ol>
      <li>+</li>
    </ol>
  </li>
</ul>
<blockquote><p>b</p></blockquote>
```

:::

::: compare

`````carve
- foo
  1. +
 > b
`````

```html
<ul>
  <li>foo
    <ol>
      <li>+</li>
    </ol>
  </li>
</ul>
<blockquote><p>b</p></blockquote>
```

:::

::: compare

`````carve
- foo
  1. +
  > b
`````

```html
<ul>
  <li>foo
    <ol>
      <li>
        <blockquote><p>b</p></blockquote>
      </li>
    </ol>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  1. +
    > b
`````

```html
<ul>
  <li>foo
    <ol>
      <li>+</li>
    </ol>
    <blockquote><p>b</p></blockquote>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
```
x
```
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<pre><code>x
</code></pre>
```

:::

::: compare

`````carve
- foo
  - +
 ```
 x
 ```
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<pre><code>x
</code></pre>
```

:::

::: compare

`````carve
- foo
  - +
  ```
  x
  ```
`````

```html
<ul>
  <li>foo
    <ul>
      <li>
        <pre><code>x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
    ```
    x
    ```
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+
        <pre><code>x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - [ ] +
```
x
```
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="+"> +</li>
    </ul>
  </li>
</ul>
<pre><code>x
</code></pre>
```

:::

::: compare

`````carve
- foo
  - [ ] +
 ```
 x
 ```
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="+"> +</li>
    </ul>
  </li>
</ul>
<pre><code>x
</code></pre>
```

:::

::: compare

`````carve
- foo
  - [ ] +
  ```
  x
  ```
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled> 
        <pre><code>x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - [ ] +
    ```
    x
    ```
`````

```html
<ul>
  <li>foo
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="+"> +
        <pre><code>x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  1. +
```
x
```
`````

```html
<ul>
  <li>foo
    <ol>
      <li>+</li>
    </ol>
  </li>
</ul>
<pre><code>x
</code></pre>
```

:::

::: compare

`````carve
- foo
  1. +
 ```
 x
 ```
`````

```html
<ul>
  <li>foo
    <ol>
      <li>+</li>
    </ol>
  </li>
</ul>
<pre><code>x
</code></pre>
```

:::

::: compare

`````carve
- foo
  1. +
  ```
  x
  ```
`````

```html
<ul>
  <li>foo
    <ol>
      <li>
        <pre><code>x
</code></pre>
      </li>
    </ol>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  1. +
    ```
    x
    ```
`````

```html
<ul>
  <li>foo
    <ol>
      <li>+</li>
    </ol>
    <pre><code>x
</code></pre>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
  - x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
      <li>x</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
  + x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+ x</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
  * x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
  1. x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
    <ol>
      <li>x</li>
    </ol>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
  - [ ] x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+</li>
    </ul>
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="x"> x</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- foo
  - +
    - x
`````

```html
<ul>
  <li>foo
    <ul>
      <li>+
        <ul>
          <li>x</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::


::: compare

`````carve
- a

+
- s
`````

```html
<ul>
  <li>a</li>
</ul>
<p>+
- s</p>
```

:::

::: compare

`````carve
- ```
+
- s
`````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>+
- s</p>
```

:::

::: compare

`````carve
> - ```
> +
> - s
`````

```html
<blockquote>
  <ul>
    <li>
      <pre><code></code></pre>
    </li>
  </ul>
  <p>+
- s</p>
</blockquote>
```

:::

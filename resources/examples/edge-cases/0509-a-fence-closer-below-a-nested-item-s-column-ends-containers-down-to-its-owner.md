## A fence closer below a nested item's column ends containers down to its owner

`CARVE-P0-004`'s owner table carries no depth term, so a closing run below its
fence's base selects an owner at any depth
([carve#2490](https://github.com/markup-carve/carve/issues/2490)). The host's
content column is 4, and with no container holding an open paragraph the run's
own column picks the nearest surviving ancestor: column 0 and column 1 reach the
document, column 2 reaches the outer item. Every container between the fence's
host and that owner closes, the fence ends unterminated, and the run is
classified in the owner at its own column.

An open paragraph does not change this: the fence interrupts it whether or not
a closer follows (CARVE-P0-014), so without the blank line the run still ends
the fence and opens an empty code block in its owner. The two fence kinds and
the raw form answer alike, and `%%%` keeps the rule written for itself.

The last two cases put a line below the base before the second run. That line
ends the fence and selects the document, and the run then opens an empty code
block there. The host keeps its fenced body at either depth, which is the rule
the same clause works at one level. The control after them writes the second run
inside a SIBLING item, where it is not a closer at all: it opens that item's own
fence.

::: compare

`````carve
- a
  - b

    ```
    p
```

    tail
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>p
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<pre><code>
    tail
</code></pre>
`````

:::

::: compare

`````carve
- a
  - b

    ```
    p
 ```

    tail
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>p
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<pre><code>
   tail
</code></pre>
`````

:::

::: compare

`````carve
- a
  - b

    ```
    p
  ```

    tail
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>p
</code></pre>
      </li>
    </ul>
    <pre><code>
  tail
</code></pre>
  </li>
</ul>
`````

:::

::: compare

`````carve
- a
  - b
    ```
    p
```
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>p
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<pre><code></code></pre>
`````

:::

::: compare

`````carve
- a
  - b
    ```
    p
 ```
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>p
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<pre><code></code></pre>
`````

:::

::: compare

`````carve
- a
  - b
    - c

      ```
      p
```
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <ul>
          <li>c
            <pre><code>p
</code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
<pre><code></code></pre>
`````

:::

::: compare

`````carve
- a
  - b
    - c

      ```
      p
  ```

      tail
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <ul>
          <li>c
            <pre><code>p
</code></pre>
          </li>
        </ul>
      </li>
    </ul>
    <pre><code>
    tail
</code></pre>
  </li>
</ul>
`````

:::

::: compare

`````carve
- a
  - b

    ~~~
    p
 ~~~

    tail
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>p
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<pre><code>
   tail
</code></pre>
`````

:::

::: compare

`````carve
- a
  - b

    ```=html
    <b>p</b>
```

    tail
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <b>p</b>
      </li>
    </ul>
  </li>
</ul>
<pre><code>
    tail
</code></pre>
`````

:::

::: compare

`````carve
- a
  - b
    ```
    p
x
    ```
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>p
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>x</p>
<pre><code></code></pre>
`````

:::

::: compare

`````carve
- a
  - b
    - c
      ```
      p
x
      ```
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <ul>
          <li>c
            <pre><code>p
</code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
<p>x</p>
<pre><code></code></pre>
`````

:::

::: compare

`````carve
- a
  - b
    ```
    p
  - c
    ```
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>p
</code></pre>
      </li>
      <li>c
        <pre><code></code></pre>
      </li>
    </ul>
  </li>
</ul>
`````

:::

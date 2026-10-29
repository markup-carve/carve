## A fence that leaves a closed nested item opens in the host it lands in

A closed block leaves no paragraph open, so a fence run below a nested item's
column leaves that item and is read in the enclosing host (CARVE-P0-009). With
nothing to interrupt and no closer to take, an unclosed fence opens a code block
that runs to the end of that host, and a bare `:::` past a box's column is
text, not the box's closer (PART 2 `admonition`, A CLOSER IS REQUIRED).
A fence below the sublist's column interrupts its paragraph whether or not a
closer follows (CARVE-P0-014) and opens in the enclosing host.
A fence-shaped line-block payload line opens nothing, so the box reads the same
when that line is plain text. A `:::` inside an open code fence is code text.

:::: compare

````carve
> - ::: box
>   - ::: |
>     ```
>     :::
>    ```
>    :::bad
>    :::
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <ul>
          <li>
            <div class="line-block">
              <p><code></code></p>
            </div>
          </li>
        </ul>
        <pre><code>:::bad
:::
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

::::

:::: compare

````carve
> 1. ::: box
>    - ::: |
>      ```
>      x
>      ```
>      :::
>     ```
>     - x
> ```
````

```html
<blockquote>
  <ol>
    <li>
      <div class="box">
        <ul>
          <li>
            <div class="line-block">
              <p><code>
x
</code></p>
            </div>
          </li>
        </ul>
        <pre><code>- x
</code></pre>
      </div>
    </li>
  </ol>
  <pre><code></code></pre>
</blockquote>
```

::::

:::: compare

````carve
> - ::: box
>   -   ::: |
>       ```
>       :::
>     ```
>     :::
>     :::bad
>     :::
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <ul>
          <li>
            <div class="line-block">
              <p><code></code></p>
            </div>
          </li>
        </ul>
        <pre><code>:::
:::bad
:::
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

::::

:::: compare

````carve
> - a
>     - child
>     ```
>
>       ```
>   ~~~
after
````

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>child</li>
      </ul>
      <pre><code>
  ```
~~~
</code></pre>
    </li>
  </ul>
</blockquote>
<p>after</p>
```

::::

:::: compare

````carve
- a
    - child
    ```
    code
    ```
after
````

```html
<ul>
  <li>a
    <ul>
      <li>child</li>
    </ul>
    <pre><code>code
</code></pre>
  </li>
</ul>
<p>after</p>
```

::::

:::: compare

````carve
> - a
>     - child
>     ```
>     code
>     ```
after
````

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>child</li>
      </ul>
      <pre><code>code
</code></pre>
    </li>
  </ul>
</blockquote>
<p>after</p>
```

::::

:::: compare

````carve
- a
    - child
    ```
    code
after
````

```html
<ul>
  <li>a
    <ul>
      <li>child</li>
    </ul>
    <pre><code>code
</code></pre>
  </li>
</ul>
<p>after</p>
```

::::

:::: compare

````carve
> - ::: box
>   - ::: |
>     x
>     :::
>    ```
>    :::bad
>    :::
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <ul>
          <li>
            <div class="line-block">
              <p>x</p>
            </div>
          </li>
        </ul>
        <pre><code>:::bad
:::
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

::::

:::: compare

````carve
> - ::: box
>   -   ::: |
>       x
>       :::
>     ```
>     :::
>     :::bad
>     :::
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <ul>
          <li>
            <div class="line-block">
              <p>x</p>
            </div>
          </li>
        </ul>
        <pre><code>:::
:::bad
:::
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

::::

:::: compare

````carve
> - ::: box
>    ```
>    :::bad
>    :::
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <pre><code>:::bad
:::
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

::::

## A fence run that dedents out of a child keeps the outer item tight

A fence opened in a child item can be closed by a run at the outer item's content column. That run opens a new, unclosed code block in the outer item, so the blank line and text below it are payload. The outer item holds one paragraph, and the blank inside the child belongs to the child (corpus 144, 563), so L1 reads the list as tight. A blank before the next sibling still loosens it (L1c), and a run that closes inside the child leaves `tail` as a second paragraph.

A fence run that dedents to the outer content column

::: compare

````carve
- outer
  - head

    ```
    a
  ```

  tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::

A closer between the outer and child content columns

::: compare

````carve
- outer
  - head

    ```
    a
   ```

  tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::

A tilde run

::: compare

```carve
- outer
  - head

    ~~~
    a
   ~~~

  tail
```

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::

An opener indented past the child content column

::: compare

````carve
- outer
  - head

        ```
        a
   ```

  tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::

A trailing line at the child content column

::: compare

````carve
- outer
  - head

    ```
    a
   ```

    tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
 tail
</code></pre>
  </li>
</ul>
```

:::

A second child item above the run

::: compare

````carve
- outer
  - one
  - two

    ```
    a
  ```

  tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>one</li>
      <li>two
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::

An ordered outer item

::: compare

````carve
1. outer
   - head

     ```
     a
   ```

   tail
````

```html
<ol>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ol>
```

:::

A list inside a block quote

::: compare

````carve
> - outer
>   - head
>
>     ```
>     a
>   ```
>
>   tail
````

```html
<blockquote>
  <ul>
    <li>outer
      <ul>
        <li>head
          <pre><code>a
</code></pre>
        </li>
      </ul>
      <pre><code>
tail
</code></pre>
    </li>
  </ul>
</blockquote>
```

:::

A next sibling directly after the payload stays tight

::: compare

````carve
- outer
  - head

    ```
    a
  ```

  tail
- next
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
  <li>next</li>
</ul>
```

:::

A blank before the next sibling loosens the list

::: compare

````carve
- outer
  - head

    ```
    a
  ```

- next
````

```html
<ul>
  <li><p>outer</p>
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
</code></pre>
  </li>
  <li><p>next</p></li>
</ul>
```

:::

A run that closes inside the child leaves a second paragraph

::: compare

````carve
- outer
  - head

    ```
    a
    ```

  tail
````

```html
<ul>
  <li><p>outer</p>
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <p>tail</p>
  </li>
</ul>
```

:::

A run right after a child fence that closed

::: compare

````carve
- outer
  - head

    ```
    a
    ```
  ```
  b

  c
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>b

c
</code></pre>
  </li>
</ul>
```

:::

A backtick run below an open tilde fence

::: compare

````carve
- outer
  - head

    ~~~
    a
  ```

  tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::

A run that dedents out of a grandchild

::: compare

````carve
- outer
  - head
    - deep

      ```
      a
  ```

  tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <ul>
          <li>deep
            <pre><code>a
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
```

:::

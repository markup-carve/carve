## A description keeps a block at its body column whatever leads the item

A list item whose marker line is a definition term. A block that reaches the
description body's column stays in the description, after a blank and without
one, exactly as it does when ordinary text leads the item (`CARVE-P9-083`,
`CARVE-P2-028`, ruled on markup-carve/carve-php#3174). The description ends on
that block and holds no paragraph, so the line below leaves the list
(`CARVE-P0-009`).

::: compare

````carve
- :: term
  : definition

    ```
    code
    ```
after
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>
        <p>definition</p>
        <pre><code>code
</code></pre>
      </dd>
    </dl>
  </li>
</ul>
<p>after</p>
```

````carve
- :: term
  : desc
      ```
      code
      ```
after
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>
        <p>desc</p>
        <pre><code>code
</code></pre>
      </dd>
    </dl>
  </li>
</ul>
<p>after</p>
```

````carve
> - :: term
>   : definition
>
>     ```
>     code
>     ```
after
````

```html
<blockquote>
  <ul>
    <li>
      <dl>
        <dt>term</dt>
        <dd>
          <p>definition</p>
          <pre><code>code
</code></pre>
        </dd>
      </dl>
    </li>
  </ul>
</blockquote>
<p>after</p>
```

:::

The same line below a description or a quote in an item that ends on a code
block. No paragraph is open at the deepest frame, so no surviving frame adopts
the line (`CARVE-P0-009`).

::: compare

````carve
- intro
  :: term
  : definition

    ```
    code
    ```
after
````

```html
<ul>
  <li>intro
    <dl>
      <dt>term</dt>
      <dd>
        <p>definition</p>
        <pre><code>code
</code></pre>
      </dd>
    </dl>
  </li>
</ul>
<p>after</p>
```

````carve
- intro
  > ```
  > code
  > ```
after
````

```html
<ul>
  <li>intro
    <blockquote>
      <pre><code>code
</code></pre>
    </blockquote>
  </li>
</ul>
<p>after</p>
```

:::

The controls. A paragraph at the body's column keeps the description open for
the line below, and a block at the item's own column after a blank is the
item's.

:::: compare

````carve
- :: term
  : definition

    para
after
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>
        <p>definition</p>
        <p>para
after</p>
      </dd>
    </dl>
  </li>
</ul>
```

````carve
- :: term
  : definition

  ```
  code
  ```
after
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>definition</dd>
    </dl>
    <pre><code>code
</code></pre>
  </li>
</ul>
<p>after</p>
```

::::

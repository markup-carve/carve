---
page: edge-lists
---

## A comment in a blank run keeps the run for a nested description list

PART 9 §11 N1a (CARVE-P9-014, carve#4892, carve#4759). The run is counted after comments are erased, at every depth: three blank lines end a description list in an item whether or not a comment sits in the run, and a `: ` line after it has no term above it and is read as a paragraph.

::: compare

````carve
- o
  :: t
  : x



  %% c
  : d
````

```html
<ul>
  <li><p>o</p>
    <dl>
      <dt>t</dt>
      <dd>x</dd>
    </dl>
    <p>: d</p>
  </li>
</ul>
```

:::

An item inside an item hands the whole run to its description list too.

::: compare

````carve
- o
  - p
    :: t
    : x



    : d
````

```html
<ul>
  <li>o
    <ul>
      <li><p>p</p>
        <dl>
          <dt>t</dt>
          <dd>x</dd>
        </dl>
        <p>: d</p>
      </li>
    </ul>
  </li>
</ul>
```

:::

The same run with a comment, before a new term.

::: compare

````carve
- o
  - p
    :: t
    : x


    %% c

    :: u
    : v
````

```html
<ul>
  <li>o
    <ul>
      <li>p
        <dl>
          <dt>t</dt>
          <dd>x</dd>
        </dl>
        <dl>
          <dt>u</dt>
          <dd>v</dd>
        </dl>
      </li>
    </ul>
  </li>
</ul>
```

:::

---
page: edge-lists
---

## A comment line below a nested line block's column stays in its span

A comment-shaped line inside an open `%%%` span is span payload at any column, and an exact-width run there closes the span (PART 0 S1, PART 9 §28, carve#4994). That holds for a line block in a nested item or in a description inside an item exactly as at depth one, whether the line sits at column 0 or between the item's column and the block's. The line after the span then reads the stanza as it stood before it (carve#4956): with no verse it is a document paragraph, with verse it folds. The last case is the control: a line that is not comment-shaped ends the span and the items.

::: compare

```carve
- - ::: |
    %%%
%%%%
    %%%
z
```

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">

        </div>
      </li>
    </ul>
  </li>
</ul>
<p>z</p>
```

:::

::: compare

```carve
- x
  - ::: |
    %%%
%% c
    %%%
z
```

```html
<ul>
  <li>x
    <ul>
      <li>
        <div class="line-block">

        </div>
      </li>
    </ul>
  </li>
</ul>
<p>z</p>
```

:::

::: compare

```carve
- - ::: |
    %%%
   %%%%
    %%%
    b
z
```

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">
          <p>b<br>
z</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- - ::: |
    %%%
  %%%%
    %%%
    b
z
```

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">
          <p>b<br>
z</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- - ::: |
    a
    %%%
%%%%
z
```

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">
          <p>a<br>
z</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- :: t
  : ::: |
    %%%
%%%%
    %%%
z
```

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd>
        <div class="line-block">

        </div>
      </dd>
    </dl>
  </li>
</ul>
<p>z</p>
```

:::

::: compare

```carve
- - ::: |
    %%%
x
    %%%
z
```

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">

        </div>
      </li>
    </ul>
  </li>
</ul>
<p>x</p>
```

:::

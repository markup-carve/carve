## An indented attribute block that wraps across lines is an attribute line

Indentation in front of an attribute block does not change what it is (rule A, PART 0 S3), and the `}` may arrive on a later line (PART 9 §15 A5). A wrapped block at any column interrupts an open paragraph like the one-line form, attaches forward, and the line after it is not lazy (carve#4089). In a list item or a description body it ends the item's paragraph and attaches to nothing there, so it is dropped (A4). A continuation line without the quote prefix of the block's container does not continue it (PART 4).

::: compare

```carve
a
 {.c}
para
```

```html
<p>a</p>
<p class="c">para</p>
```

:::

::: compare

```carve
a
 {.c
 }
para
```

```html
<p>a</p>
<p class="c">para</p>
```

:::

::: compare

```carve
a
{.c
 }
para
```

```html
<p>a</p>
<p class="c">para</p>
```

:::

::: compare

```carve
 {.c
 }
para
```

```html
<p class="c">para</p>
```

:::

::: compare

```carve
- a
   {.c
   }
para
```

```html
<ul>
  <li>a</li>
</ul>
<p>para</p>
```

:::

::: compare

```carve
- a
   {.c
   }
  para
```

```html
<ul>
  <li>a
    <p class="c">para</p>
  </li>
</ul>
```

:::

::: compare

```carve
:: t
: a
   {.c
}
para
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<p>para</p>
```

:::

::: compare

```carve
> a
>  {.c
> }
> para
```

```html
<blockquote>
  <p>a</p>
  <p class="c">para</p>
</blockquote>
```

:::

::: compare

```carve
> a
>  {.c
}
para
```

```html
<blockquote><p>a
{.c
}
para</p></blockquote>
```

:::

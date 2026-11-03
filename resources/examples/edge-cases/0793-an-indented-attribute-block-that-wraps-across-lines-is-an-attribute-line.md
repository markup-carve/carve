## An indented attribute block that wraps across lines is an attribute line

Indentation in front of an attribute block does not prevent it from opening (PART 0 S3), and `}` may arrive later (PART 9 §15 A5). Every continuation must pass the opening `{` column (CARVE-P2-035). These historical examples include closers at or below that column, so those runs become paragraph text. A continuation without the quote prefix also fails to continue the run.

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
<p>a
{.c
}
para</p>
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
<p>{.c
}
para</p>
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
{.c
}
para</li>
</ul>
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
{.c
}
para</li>
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
  <dd>a
{.c
}
para</dd>
</dl>
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
<blockquote><p>a
{.c
}
para</p></blockquote>
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

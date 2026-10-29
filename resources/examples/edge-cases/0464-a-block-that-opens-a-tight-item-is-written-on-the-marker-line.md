## A block that opens a tight item is written on the marker line

The canonical writer keeps a tight item's first block on the marker line and
puts the continuation marker below it (PART 11 §7e).

::: compare

```carve
- > p
+
> z
```

```html
<ul>
  <li>
    <blockquote><p>p</p></blockquote>
    <blockquote><p>z</p></blockquote>
  </li>
</ul>
```

:::

The bare-marker spelling parses to the same item and is rewritten to that form.

::: compare

```carve
- +
> p
+
> z
```

```html
<ul>
  <li>
    <blockquote><p>p</p></blockquote>
    <blockquote><p>z</p></blockquote>
  </li>
</ul>
```

:::

A table below a table stays inside the item in a quote host too.

::: compare

```carve
> - | a |
>   | b |
> +
> | c |
> | d |
```

```html
<blockquote>
  <ul>
    <li>
      <table>
        <tbody>
          <tr><td>a</td></tr>
          <tr><td>b</td></tr>
        </tbody>
      </table>
      <table>
        <tbody>
          <tr><td>c</td></tr>
          <tr><td>d</td></tr>
        </tbody>
      </table>
    </li>
  </ul>
</blockquote>
```

:::

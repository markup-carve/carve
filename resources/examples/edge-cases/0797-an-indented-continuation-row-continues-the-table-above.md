## An indented continuation row continues the table above

Indentation does not change what a line is (rule A, markup-carve/carve#3885), so
a `+` continuation row (PART 9 §5 T6) written past the table's column joins the
row above, as an indented `|` row already continues the table
(markup-carve/carve#4161).

::: compare

```carve
  | h |
  | v |
  + text |
```

```html
<table>
  <tbody>
    <tr><td>h</td></tr>
    <tr><td>v text</td></tr>
  </tbody>
</table>
```

:::

The same holds when only the continuation row is indented, and inside a list
item.

::: compare

```carve
| v |
  + t |

- | a |
    + b |
```

```html
<table>
  <tbody>
    <tr><td>v t</td></tr>
  </tbody>
</table>
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::

A blank line still ends the table, so the indented row after it is a paragraph.

::: compare

```carve
| a |

  + b |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p>+ b |</p>
```

:::

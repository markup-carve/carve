## A definition inside a container is collected at that container's content column

A definition is invisible and active wherever its container puts it. At column 0 that is settled; one container deeper it is the same rule, measured from INSIDE the container: `> - a` puts the item's content column at 2 of the quoted content, so a definition written there belongs to the item.

Every engine lost this in a different way and had to be fixed for it - carve-js#646, carve-php#786, carve-rs#587 - which is what a case pins against.

::: compare

```carve
> - a
>   [r]: /u

see [t][r]
```

```html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
</blockquote>
<p>see <a href="/u">t</a></p>
```

:::

The mirror arrangement - a quote INSIDE an item rather than an item inside a quote - reads the same way: the quote sits at the item's content column, the definition is its content, and the quote renders empty.

::: compare

```carve
- a
  > [r]: /u

see [t][r]
```

```html
<ul>
  <li>a
    <blockquote>

    </blockquote>
  </li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::

An indented `>` that reaches no content column is not a container at all: the line renders as the text it looks like and defines nothing. Without this case the two above can be satisfied by stripping whitespace indiscriminately, which is exactly what three separate fixes did before it was measured.

::: compare

```carve
[x][r] here.

    > [r]: /u
```

```html
<p><a href="/u">x</a> here.</p>
<blockquote>

</blockquote>
```

:::

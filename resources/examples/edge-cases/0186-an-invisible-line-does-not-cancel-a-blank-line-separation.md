## An invisible line does not cancel a blank-line separation

§17 L1 asks whether an item holds a blank-line-separated second paragraph. A line that renders nothing - a comment, a definition, an attribute line - is not a paragraph, which is why it cannot be the second one; the same fact means it cannot stand between the blank line and the paragraph that follows either. Delete the comment below and every implementation renders the item loose, so a construct that outputs nothing may not change that.

::: compare

```carve
- a

  %% n
  text
```

```html
<ul>
  <li><p>a</p>
    <p>text</p>
  </li>
</ul>
```

:::

An invisible line on its own is still not a second paragraph, so the item stays tight.

::: compare

```carve
- a

  %% n
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

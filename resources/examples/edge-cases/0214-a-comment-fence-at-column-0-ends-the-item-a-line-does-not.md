## A comment fence at column 0 ends the item; a `%%` line does not

Both spellings stay invisible wherever they sit (§24 C3). They differ in what they do to the item above them: a flush-left `%%%` fence ends it, so the next line belongs to the document, while a flush-left `%%` line leaves the item open and that line folds in. An INDENTED fence stays with the item either way.

::::: compare

```carve
- a
%%%
c
%%%
b
```

```html
<ul>
  <li>a</li>
</ul>
<p>b</p>
```

:::::

The line form, same columns, different answer:

::: compare

```carve
- a
%% c
b
```

```html
<ul>
  <li>a</li>
</ul>
<p>b</p>
```

:::

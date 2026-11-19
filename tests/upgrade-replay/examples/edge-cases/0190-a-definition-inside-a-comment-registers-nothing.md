## A definition inside a comment registers nothing

A comment's body is opaque, and that covers the lines that render nothing of their own. A link reference or footnote definition written inside `%%%` registers no label, so a reference to it elsewhere stays literal. A definition that registered from inside a comment would be invisible in the output and active in the link table at once - a reference resolving against text the author commented out.

::: compare

```carve
%%%
[r]: /u
%%%
[r][]
```

```html
<p>[r][]</p>
```

:::

## Link reference definition separator must be a space

The same rule applies to link reference definitions: `[label]:` must be followed by a literal space. A tab leaves the line as a paragraph, so the later `[a][]` has no target to resolve.

::: compare

```carve
[a]:	/url

[a][]
```

```html
<p>[a]:	/url</p>
<p>[a][]</p>
```

:::

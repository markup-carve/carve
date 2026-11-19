## Unclaimed openers stay literal

Two forms that were proposed and then not adopted have no meaning in Carve, and
both are pinned here so no engine can quietly start claiming them.

`[>content]` was the proposed sidenote form. It was dismissed, not deferred: a
margin note is footnote content positioned by CSS, so it needs no syntax. The
`[>` opener is unclaimed and the whole thing is literal text.

`{:name:}` was a proposed braced symbol form for intraword use. The brace is
not part of any construct: it merely satisfies the symbol boundary guard, and
the braces themselves stay literal. The name inside is a normal symbol, so with
no `symbols` map configured it falls back to the literal `:name:` and the line
renders exactly as written. See [dismissed syntax](../dismissed-syntax).

::: compare

```carve
[>foo]

{:tada:}
```

```html
<p>[&gt;foo]</p>
<p>{:tada:}</p>
```

:::

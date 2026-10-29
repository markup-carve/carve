## Quote flanking after an escaped character

A backslash-escaped character still flanks as the character it is, so a quote
that follows it decides direction from the literal. `\{` is an opening bracket
and opens the quote; `\<` and `\*` are not, so the quote closes - the same
decision the unescaped character produces. Escaping changes what the character
*is*, not what it flanks like.

Worth pinning because the escape is consumed before the quote is resolved, so an
implementation that loses the literal at that point silently flips the direction.

::: compare

```carve
\{"quoted"\} and \<"q"\> and \*'q'\*

A \{ before a quote still opens it: \{"open"

Unescaped for contrast: {"open"}
```

```html
<p>{“quoted”} and &lt;”q”&gt; and *’q’*</p>
<p>A { before a quote still opens it: {“open”</p>
<p>Unescaped for contrast: {“open”}</p>
```

:::

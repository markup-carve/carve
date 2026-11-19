## An underscore pair in text is escaped where the line would pair it

PART 11 §8a M1b. On the Markdown target a literal `_` is escaped when another
live `_` on the emitted line could close the emphasis it could open. A run that
flanks on both sides can neither open nor close, so `company_id` stays bare, and
so does an underscore no second one can pair with.

Adjacency alone missed this: both underscores of `_y_` are text, neither stands
beside a delimiter, and every reader turned the author's text into emphasis
(markup-carve/carve-js#1716).

::: compare

```carve
/x/_y_ in company_id and a_b_c and a _ b _ c
```

```html
<p><em>x</em>_y_ in company_id and a_b_c and a _ b _ c</p>
```

:::

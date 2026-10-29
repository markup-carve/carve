## An empty brace pair is not a construct

An opener that meets its own closer with nothing between them opened nothing,
and its characters are text. Every forced span and every editorial form carries
the same one-or-more content slot, so `{//}`, `{**}`, `{__}`, `{~~}`, `{^^}`,
`{,,}`, `{==}`, `{++}` and `{##}` all render literally
(markup-carve/carve#1447).

::: compare

```carve
Empty pairs are text: {//} {**} {__} {~~} {^^} {,,} {==} {++} {##}.

A pair that holds something is the construct: {/i/} {*b*} {~s~} {+ins+} {# c #}.
```

```html
<p>Empty pairs are text: {//} {**} {__} {~~} {^^} {,,} {==} {++} {##}.</p>
<p>A pair that holds something is the construct: <em>i</em> <strong>b</strong> <s>s</s> <ins>ins</ins> <span class="critic-comment"> c </span>.</p>
```

:::

The rule was already written twice - the productions spell every content slot
as one-or-more, and the ambiguities guide says `{^^}` is not a superscript -
and carve-js and carve-rs already read it that way. What the empty forms did
was worse than render nothing useful: the author's braces disappeared from the
output while staying in the source, which is the same silent loss the hyphen
flanking rule above refuses.

A fully empty substitution is the one form left alone. Its two halves are
independent, and a half-empty substitution is an ordinary edit - a deletion
with no replacement, or an insertion replacing nothing - so it needs its own
decision.

::: compare

```carve
{~a~>~} deletes, {~~>b~} inserts, and {~~>~} still does both to nothing.
```

```html
<p><del>a</del><ins></ins> deletes, <del></del><ins>b</ins> inserts, and <del></del><ins></ins> still does both to nothing.</p>
```

:::

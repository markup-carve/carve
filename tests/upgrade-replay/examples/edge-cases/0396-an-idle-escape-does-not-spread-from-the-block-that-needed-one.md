## An idle escape does not spread from the block that needed one

The canonical writer escapes a character IF AND ONLY IF omitting the escape
would change the re-parsed document (PART 11 §2). Where it cannot decide an
occurrence exactly it may fall back to the conservative form, and PART 11
§2b bounds how far that fallback reaches: the SMALLEST unit whose minimal form
fails to re-parse, which is the inline run or the block holding it, never the
whole document.

The first paragraph below is indented, so its text is `## H` and not a heading.
Written back at column zero it WOULD be a heading, so that block escalates and
comes back as `\#\# H`. The second paragraph needs nothing: `plain (b) text`
re-parses as itself, and its parentheses stay bare.

Both spellings render the HTML below and re-parse to the same tree, so the
`.fmt` sidecar beside this pair - not the HTML - is what measures the scope.

::: compare

```carve
  ## H

plain (b) text
```

```html
<section id="H">
  <h2>H</h2>
  <p>plain (b) text</p>
</section>
```

:::

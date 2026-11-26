## Autolink display keeps the raw content

An autolink's display text is the raw content between `<` and `>`: a URI
autolink keeps its scheme (`<mailto:a@b>` shows `mailto:a@b`), while an email
autolink (no explicit scheme) shows the address with a `mailto:` href.

::: compare

```carve
<mailto:a@b>
```

```html
<p><a href="mailto:a@b">mailto:a@b</a></p>
```

:::

## A heading id keeps a non-ASCII space

The id is the heading's text with each run of non-alphanumeric ASCII replaced by `-`; non-ASCII characters pass through unchanged. A no-break space in the text is non-ASCII, so it survives into the id rather than becoming a separator - and the id carries the character itself, not an entity. (The marker's own separator must be an ASCII space: `# Title` is a paragraph, not a heading.)

::: compare

```carve
#  Title
```

```html
<section id=" Title">
  <h1>&nbsp;Title</h1>
</section>
```

:::

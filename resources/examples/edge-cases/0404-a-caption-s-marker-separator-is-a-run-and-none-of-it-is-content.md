## A caption's marker separator is a run, and none of it is content

The caret takes `space+` and every one of those spaces is separator, so the
caption below is `cap` and not `<SP><SP>cap`. Two normative clauses settle it
and neither counts engines. PART 2's MARKER SEPARATORS AND PADDING SLOTS
defines a marker separator as what stands between the marker and the content it
introduces, and rules that a writer aligning in a column is writing separator
rather than content; the four slots that clause narrows to exactly one space are
PADDING slots, and the caret is not one of them. PART 11 section 1 names marker
alignment among the spellings `fmt` may normalize while preserving what the
document says, which holds only if the run is not content.

The executable spec read the production literally and published a figcaption
starting with two spaces, where all three engines publish `cap`. Nothing was red:
no corpus document, no optional-corpus case and none of the authored documents
spelled a caption with a second space after the caret, which is why this pair
exists (carve#1575).

The second caption keeps its TAB. `space` is U+0020 only, so the first character
that is not a space begins the caption, exactly as it does after a heading
marker.

::: compare

```carve
> q

^   cap

![a](i.png)
^ 	second
```

```html
<figure>
  <blockquote><p>q</p></blockquote>
  <figcaption>cap</figcaption>
</figure>
<figure>
  <img src="i.png" alt="a">
  <figcaption>	second</figcaption>
</figure>
```

:::

MARKER REQUIRES CONTENT (PART 2) applies after the run as well: a caret, its
separator and nothing but whitespace opens no caption. Both lines below are
ordinary paragraph text with the trailing run dropped, and the blocks above them
keep their own shape - the quote stays a quote and the image paragraph stays a
paragraph, neither promoted to a figure. The executable spec matched an empty
caption here and published `<figcaption></figcaption>` on a figure the author
never wrote, while the comment beside its own heading pattern claimed the
opposite.

::: compare

```carve
> q

^   

![a](i.png)
^ 
```

```html
<blockquote><p>q</p></blockquote>
<p>^</p>
<p><img src="i.png" alt="a">
^</p>
```

:::

## A heading's marker separator is a run, and none of it is content

The hashes take `space+` and every one of those spaces is separator, so the
headings below are `h` and `a b`, not `<SP>h` and `<SP><SP>a b`. This is the
same ruling the caption took one construct over, on the same two normative
clauses and neither of them a nose count. PART 2's MARKER SEPARATORS AND
PADDING SLOTS defines a marker separator as what stands between the marker and
the content it introduces, and rules that a writer aligning in a column is
writing separator rather than content; the four slots that clause narrows to
exactly one space are PADDING slots, and the heading marker is not one of them.
PART 11 section 1 names marker alignment among the spellings `fmt` may
normalize while preserving what the document says, which holds only if the run
is not content.

The executable spec read the production literally and published `<h2><SP>h</h2>`
where all three engines publish `h`. Nothing was red: no corpus document, no
optional-corpus case and none of the authored documents spelled a heading with
a second space after the marker (carve#1581). `84-single-line-headings-5` is a
`#` and two spaces and nothing else, which MARKER REQUIRES CONTENT answers and
which is a different rule.

::: compare

```carve
##  h

###   a b
```

```html
<section id="h">
  <h2>h</h2>
  <section id="a-b">
    <h3>a b</h3>
  </section>
</section>
```

:::

THE ID DOES NOT MOVE WITH THE TEXT, and the pair below is where to see it: the
`<h1>` says `Sec` rather than `<SP>Sec` now, while `#Sec` was the id under both
readings, because slugging drops a leading run either way. What does move is
the CROSSREF's auto-text, which PART 9 section 19 takes from the heading's own
text.

::: compare

```carve
#  Sec

See </#Sec>.
```

```html
<section id="Sec">
  <h1>Sec</h1>
  <p>See <a href="#Sec">Sec</a>.</p>
</section>
```

:::

A TAB IS NOT SEPARATOR. `space` is U+0020 only, so the run ends at the first
character that is not one and that character BEGINS the heading, exactly as it
does after a caret. The third document is its own pair because the pinned
writer cannot write it back: it emits `##<SP>x`, dropping a character its own
parser keeps, so the document is declared in `resources/engine-fmt-drift.txt`
until that is fixed (markup-carve/carve-js#1356).

::: compare

```carve
## 	x
```

```html
<section id="x">
  <h2>	x</h2>
</section>
```

:::

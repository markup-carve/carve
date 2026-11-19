## A footnote continuation survives a blank run

A footnote definition's body is "the def line plus any following lines indented
by at least two columns", and PART 9 §24 C1 measures that floor in columns. What
the clause does not say is that a blank RUN between the def line and an indented
continuation ends the body - and it does not, because a blank run ends no other
indented block in Carve either. A list item, a quote and a container all keep an
indented continuation across one, and a footnote definition is an indented
container like the others (carve#1620).

Ending the body there is worse than it first looks, because ejecting the
continuation RELOCATES it: a note's body renders in the endnotes section at the
foot of the document, while the ejected paragraph lands at document level above
it. The paragraph moves backwards past unrelated blocks, which is not what "the
definition ended here" means.

Two blank lines, then a paragraph continuation - the shape three engines read
three ways until this pinned it:

::: compare

```carve
See[^1].

[^1]: a


    b
```

```html
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a</p>
      <p>b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The same run above a list, so the pin does not rest on the continuation being a
paragraph:

::: compare

```carve
See[^1].

[^1]: a


    - b
```

```html
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a</p>
      <ul>
        <li>b</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Three blank lines, which is the count PART 9 §11 N1a is about. N1a fires only
before a LIST MARKER at the level the run sits in, and the run here is interior
to the definition body, so it neither fires nor is disturbed - the length of the
run is not what decides this (carve#1430).

::: compare

```carve
See[^1].

[^1]: a



    b
```

```html
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a</p>
      <p>b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The run's LENGTH is interior to the body too, and it is measured there rather
than collapsed on the way in. Three blanks between two sibling markers is §11
N1a's boundary, so the body holds two lists rather than one - the same answer the
run would give at the top level, which is the point of not standing one blank in
for the whole run.

::: compare

```carve
See[^1].

[^1]: - a



  - b
```

```html
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>a</li>
      </ul>
      <ul>
        <li>b</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

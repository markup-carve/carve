## MathBlock

:::: compare
````carve
``` math
\int_0^1 x^2 \, dx
```
````
```html
<div class="math display">\[\int_0^1 x^2 \, dx\]</div>
```
::::

## CodeGroup

::::: compare
````carve
::: code-group
``` js [JavaScript]
console.log("hi")
```
``` py [Python]
print("hi")
```
:::
````
```html
<div class="code-group" role="group" aria-label="Code examples">
<input type="radio" name="codegroup-1" id="codegroup-1-tab-1" class="code-group-radio" checked>
<label for="codegroup-1-tab-1" class="code-group-label">JavaScript</label>
<input type="radio" name="codegroup-1" id="codegroup-1-tab-2" class="code-group-radio">
<label for="codegroup-1-tab-2" class="code-group-label">Python</label>
<div class="code-group-panel" role="group" aria-label="JavaScript"><pre><code class="language-js">console.log("hi")
</code></pre>
</div>
<div class="code-group-panel" role="group" aria-label="Python"><pre><code class="language-py">print("hi")
</code></pre>
</div>
</div>
```
:::::

## Wikilinks

:::: compare
```carve
See [[Tiger facts|tigers]].
```
```html
<p>See <a href="tiger-facts" class="wikilink" data-wikilink="Tiger facts">tigers</a>.</p>
```
::::

## HeadingPermalinks

:::: compare
```carve
# Stable heading
```
```html
<section id="Stable-heading">
  <h1>Stable heading <a href="#Stable-heading" class="permalink" aria-label="Permalink">¶</a></h1>
</section>
```
::::

## ExternalLinks

:::: compare
```carve
Read [the guide](https://example.com/guide).
```
```html
<p>Read <a href="https://example.com/guide" target="_blank" rel="noopener noreferrer">the guide</a>.</p>
```
::::

## ColorSwatch

Not enabled on this site, so the output is shown rather than rendered.

::: compare no-render

```carve
Brand color is :color[#3c8772] here.
```

```html
<p>Brand color is <span class="swatch"><span class="swatch-chip" style="background-color:#3c8772"></span> #3c8772</span> here.</p>
```

:::

## HeadingNumbers

Not enabled on this site, so the output is shown rather than rendered.

::: compare no-render

```carve
# Intro

## Setup

## Usage
```

```html
<section id="Intro">
  <h1><span class="section-number">1</span> Intro</h1>
  <section id="Setup">
    <h2><span class="section-number">1.1</span> Setup</h2>
  </section>
  <section id="Usage">
    <h2><span class="section-number">1.2</span> Usage</h2>
  </section>
</section>
```

:::

## HeadingLevelShift

Not enabled on this site, so the output is shown rather than rendered.

::: compare no-render

```carve
# Top

## Under
```

```html
<section id="Top">
  <h2>Top</h2>
  <section id="Under">
    <h3>Under</h3>
  </section>
</section>
```

:::

## TableOfContents

Not enabled on this site, so the output is shown rather than rendered.

::: compare no-render

```carve
# Alpha

# Beta
```

```html
<nav class="toc" aria-label="Table of contents">
<ul>
<li><a href="#Alpha">Alpha</a></li>
<li><a href="#Beta">Beta</a></li>
</ul>
</nav>
<section id="Alpha">
  <h1>Alpha</h1>
</section>
<section id="Beta">
  <h1>Beta</h1>
</section>
```

:::

## Glossary

Not enabled on this site, so the output is shown rather than rendered.

::: compare no-render

```carve
::: glossary
:: API
: Application Programming Interface.
:::

Use the :term[API].
```

```html
<dl class="glossary">
  <dt id="gloss-api">API</dt>
  <dd>Application Programming Interface.</dd>
</dl>
<p>Use the <a href="#gloss-api" class="term">API</a>.</p>
```

:::

## Index

Not enabled on this site, so the output is shown rather than rendered.

::: compare no-render

```carve
Carve:index[markup] is small.

::: index
:::
```

```html
<p>Carve<span id="idx-markup-1" class="index-term"></span> is small.</p>
<ul class="index">
  <li>markup <a href="#idx-markup-1" class="index-backref" aria-label="Back to markup">↩</a></li>
</ul>
```

:::

## TocPlacement

The nested footnotes marker renders its div before the navigation. Its notes
stay at the default document end (CARVE-P9-076).

:::::: compare no-render

```carve
::::: toc "Outer"
::: footnotes
:::
:::::

# H

Text[^a] more.

[^a]: The note.
```

```html
<div class="footnotes">

</div>
<nav class="toc" aria-labelledby="adm-1">
<p class="admonition-title" id="adm-1">Outer</p>
<ul>
<li><a href="#H">H</a></li>
</ul>
</nav>
<section id="H">
  <h1>H</h1>
  <p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> more.</p>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>The note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

## IndexFallback

With no index terms, the extension abstains. Core rendering puts the kind
class before both authored attributes (CARVE-P10-011).

:::::: compare no-render

```carve
{#empty k=v}
::: index
:::
```

```html
<div class="index" id="empty" k="v">

</div>
```

::::::

## IndexAttributes

The extension owns the populated index and appends its wrapper class after
both authored attributes (CARVE-P10-011).

:::::: compare no-render

```carve
Carve:index[markup] is small.

{#terms k=v}
::: index
:::
```

```html
<p>Carve<span id="idx-markup-1" class="index-term"></span> is small.</p>
<ul id="terms" k="v" class="index">
  <li>markup <a href="#idx-markup-1" class="index-backref" aria-label="Back to markup">↩</a></li>
</ul>
```

::::::

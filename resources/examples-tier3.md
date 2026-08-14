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
<div class="code-group">
<input type="radio" name="codegroup-1" id="codegroup-1-tab-1" class="code-group-radio" checked>
<label for="codegroup-1-tab-1" class="code-group-label">JavaScript</label>
<input type="radio" name="codegroup-1" id="codegroup-1-tab-2" class="code-group-radio">
<label for="codegroup-1-tab-2" class="code-group-label">Python</label>
<div class="code-group-panel"><pre><code class="language-js">console.log("hi")
</code></pre>
</div>
<div class="code-group-panel"><pre><code class="language-py">print("hi")
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

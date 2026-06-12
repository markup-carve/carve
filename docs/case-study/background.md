# Background

## Part 1: The Landscape of Lightweight Markup

Before designing something new, we must understand what exists and why.

### 1.1 The Major Players

| Format          | Year | Philosophy                                    |
|-----------------|------|-----------------------------------------------|
| Markdown        | 2004 | "Write like email, get HTML"                  |
| reStructuredText| 2002 | "Explicit is better than implicit"            |
| AsciiDoc        | 2002 | "DocBook power, plain-text simplicity"        |
| Org-mode        | 2003 | "Your life in plain text"                     |
| Textile         | 2002 | "Web writing made easy"                       |
| Creole          | 2007 | "Universal wiki markup"                       |
| Gemtext         | 2019 | "Radical simplicity"                          |
| Djot            | 2022 | "Markdown done right"                         |
| Typst           | 2023 | "LaTeX replacement for the modern era"        |

### 1.2 What Each Teaches Us

#### Markdown
**Strengths**: Ubiquitous, feels natural for basic text
**Weaknesses**: Ambiguous, fragmented (CommonMark, GFM, etc.)
**Lesson**: Simplicity wins adoption, but ambiguity creates chaos.

#### reStructuredText
```rst
This is *emphasis* and **strong emphasis**.

.. note::
   Directives are powerful but verbose.

`Link text <https://example.com>`_
```
**Strengths**: Explicit directives, extensible, great for documentation
**Weaknesses**: Verbose, underscore suffix for links is bizarre
**Lesson**: Explicitness is good, but syntax should feel natural.

#### AsciiDoc
```asciidoc
= Document Title
:author: John Doe
:toc:

== Section

This is *bold* and _italic_.

NOTE: Admonitions are built-in.

[source,python]
----
def hello():
    print("Hello")
----
```
**Strengths**: Document attributes, admonitions, includes, powerful tables
**Weaknesses**: Learning curve, multiple syntaxes for same thing
**Lesson**: Metadata and document structure matter. Built-in admonitions are valuable.

#### Org-mode
```org
* Heading 1
** Heading 2

Regular text with *bold*, /italic/, _underline_, +strikethrough+.

- List item
  - [ ] Checkbox unchecked
  - [X] Checkbox checked

| Name  | Age |
|-------+-----|
| Alice |  30 |

#+BEGIN_SRC python
def hello():
    print("hello")
#+END_SRC
```
**Strengths**: Incredibly powerful, outlining, TODO states, time tracking
**Weaknesses**: Emacs-centric, `#+` syntax is ugly, steep learning curve
**Lesson**: Plain text can be a complete productivity system. Checkboxes and TODO
states are genuinely useful. The `/italic/` convention works!

#### Textile
```textile
This is *strong* and _emphasis_ and -deleted- and +inserted+.

"Link text":http://example.com

!image.jpg!

|_. Header |_. Header |
| Cell     | Cell     |
```
**Strengths**: Intuitive emphasis, simple links, readable
**Weaknesses**: Largely abandoned, some ambiguous cases
**Lesson**: `"text":url` for links is genuinely more readable. The `|_.` for
headers is clever.

#### Creole
```
This is **bold** and //italic//.

[[http://example.com|Link text]]

{{image.jpg|Alt text}}

|= Header |= Header |
| Cell    | Cell    |
```
**Strengths**: Designed for wiki interoperability, clear delimiters
**Weaknesses**: Never achieved widespread adoption
**Lesson**: `//italic//` is visually perfect. `|=` for table headers is elegant.

#### Gemtext (Gemini Protocol)
```
# Heading
## Subheading

Regular text is just text.

=> https://example.com Link text
=> gemini://example.org Another link

* List item
* Another item

> Quote

```preformatted block
code here
```​
```
**Strengths**: Radically simple, one link per line, unambiguous
**Weaknesses**: No inline formatting whatsoever, too minimal for rich documents
**Lesson**: Forcing links onto their own lines eliminates ALL link syntax
ambiguity. Sometimes constraints are features.

#### Typst
```typst
= Heading

This is *strong* and _emphasis_.

#set text(size: 12pt)
#let name = "World"

Hello, #name!

#table(
  columns: 2,
  [Header 1], [Header 2],
  [Cell 1], [Cell 2],
)
```
**Strengths**: Programmable, clean syntax, fast, modern
**Weaknesses**: More like a programming language than markup
**Lesson**: Programmability is powerful. The `#` prefix for commands is clean.
Content in `[]` brackets is intuitive.

### 1.3 Other Notable Ideas

#### CriticMarkup (Editorial Annotations)
```
{++addition++}
{--deletion--}
{~~old~>new~~}
{==highlight==}{>>comment<<}
```
**Lesson**: Track changes in plain text is valuable for collaboration.

#### Fountain (Screenwriting)
```
INT. COFFEE SHOP - DAY

JOHN
(nervous)
I have something to tell you.
```
**Lesson**: Context can be inferred from position and conventions. Minimal markup
for domain-specific formats.

#### YAML Frontmatter (Metadata)
```yaml
---
title: My Document
author: Jane Doe
date: 2024-01-15
tags: [tutorial, beginner]
---
```
**Lesson**: Structured metadata at the start of documents is universally useful.

---

## Part 2: Human Factors Research

### 2.1 How Non-Technical Users Mark Up Text

Observing how people annotate paper documents reveals natural instincts:

| Intent          | Paper Action           | Keyboard Approximation |
|-----------------|------------------------|------------------------|
| Emphasis        | Underline              | `_text_`               |
| Strong emphasis | Circle / Box           | `[text]` or `*text*`   |
| Deletion        | Strikethrough          | `~text~` or `-text-`   |
| Insertion       | Caret + write above    | `^text^`               |
| Comment         | Margin note            | `%% comment`           |
| Reference       | Number in circle       | `[1]` or `(1)`         |
| Quote           | Quote marks            | `"text"` or `> text`   |

### 2.2 What People Get Wrong in Markdown

From teaching Markdown to non-programmers:

1. **Link syntax order** - "Is it `[]()` or `[]()`?" (yes, they ask this)
2. **Nested lists** - Not understanding the indent requirements
3. **Code blocks** - Backtick key location varies by keyboard
4. **Line breaks** - Two spaces at end of line is invisible
5. **Emphasis** - "Do I use one or two asterisks?"
6. **Escaping** - Not knowing why their `*` became italic

### 2.3 The "Ten-Second Rule"

A good syntax should be:
- **Learnable in 10 seconds** for basic use
- **Memorable after 10 days** without use
- **Unambiguous within 10 characters** of context

---


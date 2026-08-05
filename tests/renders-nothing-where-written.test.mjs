/*
 * "Renders nothing where it was written" is a category, named once, here.
 *
 * Four bugs in three days were the same shape: somewhere a list enumerates the
 * kinds that behave this way, a later kind joins the category, and the list is
 * not updated. Nothing fails, because the list IS the check (carve#756):
 *
 *   - PART 12 §4's sibling-overlap exemption listed `footnote` and
 *     `abbreviation_def`, leaving out `link_reference_definition` (carve#738)
 *   - carve-js's `rendersNothing()` listed three of them, leaving out
 *     `link_reference_definition` (markup-carve/carve-js#702)
 *   - carve-rs's profile filter left out BOTH definition kinds
 *     (markup-carve/carve-rs#645)
 *
 * The first and third are literally the same omission, found five days apart in
 * two repositories by two unrelated routes.
 *
 * WHAT THIS FILE ASSERTS is the property the category is NAMED for, which is the
 * one rule every member shares: denying the kind leaves the rendered HTML
 * byte-identical, because the kind renders nothing at the point it was written.
 * That is the rule docs/profiles.md states, and it is exactly the rule the three
 * bugs above broke - each of them made a denial emit something.
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT is the other two rules the issue lists
 * (the §4 span exemption, and being a document child when authored inside a
 * container). They do NOT bind the category uniformly, and writing them as if
 * they did would need per-member exemptions - the very thing that rots:
 *
 *   - `footnote` is hoisted out of a container to the document
 *   - `link_reference_definition` is hoisted in carve-js's current main and NOT
 *     in the build this repo pins, so the rule is mid-flight
 *   - `abbreviation_def` is recognized at document level only, so it never
 *     occurs in a container to be hoisted from - inside a blockquote the line
 *     stays paragraph text
 *   - `comment` stays where it was written, as a child of its container
 *   - `frontmatter` cannot be authored in a container at all
 *
 * Five members, four different answers. Recorded on carve#756 rather than
 * encoded here.
 *
 * THE NEGATIVE CONTROLS are what make the positive assertions mean something. If
 * `carveToHtml` ever stopped honoring profiles, or the comparison were made
 * against the wrong string, every positive case would pass. So five ORDINARY
 * kinds are checked to DIFFER when denied.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml, Profile } from '@markup-carve/carve'

/**
 * The category. ONE list, and the only place a new member is added.
 *
 * `source` places the kind in a document where it renders nothing: an UNUSED
 * definition, so the assertion is about the definition line and not about the
 * endnotes section a referenced footnote legitimately emits.
 */
const RENDERS_NOTHING_WHERE_WRITTEN = {
  comment: 'a\n\n%% hidden\n',
  frontmatter: '---\ntitle: x\n---\n\na\n',
  footnote: 'a\n\n[^x]: note\n',
  abbreviation_def: 'a\n\n*[HTML]: HyperText\n',
  link_reference_definition: 'a\n\n[lbl]: /u\n',
}

/**
 * Kinds that DO render where they are written, for the control below.
 *
 * NOT `paragraph`, which looks like the obvious control and is useless as one:
 * `to_text` degrades a denied BLOCK by wrapping its text in a paragraph, so a
 * denied paragraph renders as a paragraph and the output is identical either
 * way. It would sit here reading as a control while proving nothing - the same
 * shape of dead check this file exists to prevent.
 */
const RENDERS_SOMETHING = {
  heading: '# visible\n',
  code_block: '```\nvisible\n```\n',
  block_quote: '> quoted\n',
  list: '- item\n',
  table: '| a |\n|---|\n| b |\n',
}

const deniedHtml = (source, type) =>
  carveToHtml(source, { profile: Profile.full().denyBlock([type]) })

for (const [type, source] of Object.entries(RENDERS_NOTHING_WHERE_WRITTEN)) {
  test(`denying ${type} leaves the rendered HTML byte-identical`, () => {
    assert.equal(
      deniedHtml(source, type),
      carveToHtml(source),
      `denying ${type} changed the output, so it emits something where it was written`,
    )
  })
}

for (const [type, source] of Object.entries(RENDERS_SOMETHING)) {
  test(`denying ${type} DOES change the output (control)`, () => {
    assert.notEqual(
      deniedHtml(source, type),
      carveToHtml(source),
      `denying ${type} changed nothing, so the positive cases above prove nothing`,
    )
  })
}

test('every member renders nothing on its own, not merely when denied', () => {
  // The stronger reading of the category name, and a second way for a member to
  // be wrong: a kind that emits something unprofiled and the same something
  // when denied would pass the byte-identical case above.
  for (const [type, source] of Object.entries(RENDERS_NOTHING_WHERE_WRITTEN)) {
    const withIt = carveToHtml(source)
    const withoutIt = carveToHtml(
      source
        .split('\n')
        .filter((line) => !/^(%%|\[\^x\]:|\*\[HTML\]:|\[lbl\]:|---|title:)/.test(line))
        .join('\n'),
    )
    assert.equal(
      withIt.replace(/\s+/g, ' ').trim(),
      withoutIt.replace(/\s+/g, ' ').trim(),
      `${type} contributes visible output where it was written`,
    )
  }
})

test('the category is not empty and every entry has a sample', () => {
  // Guards the guard: an empty or malformed table would make every loop above
  // vacuous, which is the failure mode this whole file exists to prevent.
  const entries = Object.entries(RENDERS_NOTHING_WHERE_WRITTEN)
  assert.ok(entries.length >= 5, `expected the five known members, got ${entries.length}`)
  for (const [type, source] of entries) {
    assert.ok(typeof source === 'string' && source.length > 0, `${type} has no sample`)
  }
})

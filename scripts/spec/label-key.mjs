/** Shared lookup key for link-reference and footnote labels (PART 9R). */
export function labelKey(label) {
  return label.replace(/[ \t\n\f\r]+/g, ' ').replace(/^ | $/g, '')
}

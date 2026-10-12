/** Shared lookup key for link-reference and footnote labels (PART 9R R1, R2): space runs only. */
export function labelKey(label) {
  return label.replace(/ +/g, ' ').replace(/^ | $/g, '')
}

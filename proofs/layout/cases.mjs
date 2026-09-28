// Traces are authored interpretations of CARVE-P0-003. The runner's source check
// keeps an edited corpus example from silently retaining an obsolete trace.
const traces = [
  {
    name: 'post-blank-at-content',
    corpus: '143-post-blank-list-continuation-content-column-model-2',
    source: '- one\n\n  > q\n', target: 'q',
    boundary: 'blank', column: 2, modelOwner: true, observedOwner: true,
  },
  {
    name: 'post-blank-past-content',
    corpus: '143-post-blank-list-continuation-content-column-model-3',
    source: '- one\n\n   # h\n', target: 'h',
    boundary: 'blank', column: 3, modelOwner: true, observedOwner: true,
  },
  {
    name: 'post-blank-between-base-and-content',
    corpus: '143-post-blank-list-continuation-content-column-model',
    source: '- one\n\n > q\n', target: '> q',
    boundary: 'blank', column: 1, modelOwner: true, observedOwner: false,
    discrepancy: 'Part 0 assigns the band above base to the frame; corpus 143 assigns it to the document after a blank.',
  },
  {
    name: 'comment-at-base',
    source: '- intro\n%% c\ntail\n', target: 'tail',
    boundary: 'line_comment', column: 0, modelOwner: false, observedOwner: true,
    discrepancy: 'Part 0 clears the continuation claim at the comment; both readers retain the follower in the item.',
  },
  {
    name: 'post-blank-at-base',
    source: '- intro\n\ntail\n', target: 'tail',
    boundary: 'blank', column: 0, modelOwner: false, observedOwner: false,
  },
  {
    name: 'comment-at-content',
    source: '- intro\n  %% c\n  tail\n', target: 'tail',
    boundary: 'line_comment', column: 2, modelOwner: true, observedOwner: true,
  },
]

// This prototype admits one top-level item with this exact marker geometry.
// The runner checks that restriction before comparing either reader.
export const cases = traces.map(trace => ({
  ...trace,
  frame: { kind: 'ListItem', base: 0, content: 2, open: true, paragraph: true },
}))

# Freeze candidate 10 report

Candidate: `eda35624c`. The status commit follows it. CI: pending.

## Part 1: maintainer rulings

| Point | Commit | Clause or row | Case |
|---|---|---|---|
| R1 | 9c38e6508 | three opt-in defaults | CC-1046 |
| R2 | 7f6b8003b | C2-X-023 | CC-906 |
| R3 | 0e3bf8c01 | references placement void | CC-809/810 removed |
| R4 | e5d700b5d | term message | CC-697/992 |
| R5 | 75ec15e9b | C2-W-039 | CC-1047 |
| R6 | f88dc8347 | duplicate-id | CC-997 |
| R7 | 9ad285f54 | C2-B-180 | existing malformed-table cases |
| R8 | 5bdfced68 | U-372/373 | existing line-run cases |
| R9 | 5a464f344 | C2-A-180 | CC-505 |
| R10 | 755e1c4a5 | carried readings | parked |

## Part 2: independent read

| Finding | Commit | Clause or row | Case |
|---|---|---|---|
| 01 | 6eaafdfb0 | C2-X-048 | CC-1048 |
| 02 | f9c0c3c92 | C2-T-005, options | CC-468 to 472 |
| 03 | 446038427 | C2-A-179 | CC-505/1050 |
| 04 | 4a7944da1 | C2-T-015 | CC-1051 |
| 05 | 5fac5a3b0 | unattached-caption | CC-1052 |
| 06 | 51e7229ea | duplicate-reference-url | CC-1053 |
| 07 | 407218c37 | footnote-labels | CC-1054 |
| 08 | 96b298149 | bidi-control | CC-1055 |
| 09 | 19628ccf8 | table-column-overlap | CC-1056 |
| 10 | 5e050a612 | C2-W-138 | CC-649/914/1057 |
| 11 | R4 | term message | CC-697 |
| 12 | 18cfc0307 | setext message | CC-961 |
| 13 | 4d9ff7d6e | region message | CC-1058 |
| 14 | dedd7611a | quote message | CC-1059 |
| 15 | ddc2dd8a0 | row-count message | CC-1060 |
| 16 | R6 | duplicate-id | CC-997 |
| 17 | d2fb99387 | empty-definition message | CC-1061 |
| 18 | b82282547 | definition-location message | CC-1062 |
| 19 | 3c6474004 | comment-span message | CC-1063 |
| 20 | d2817c167 | plus message | CC-715 |

Beyond the twenty: djot-heading-continuation (af2cb335f, CC-1064), djot-plus-bullet (5c911ef95, CC-1065), fence-opener-fallback (eea3f3ebb, CC-1066), fence-title-syntax (7daea672b, CC-1067), github-alert-marker (9a0616f69, CC-1068), profile-construct-degraded (61e576aad, CC-1069), duplicate-id (7bbfc6f63, CC-1070).

## Part 3: engine lane

| Point | Commit | Clause or row | Case |
|---|---|---|---|
| G-H1/F13 | 894ad15f0 | C2-A-035/H-013 | parked |
| G-H2/F14 | b1b28599e | C2-H-177 | Example 34, CC-358 |
| G-H3 | eb82819e1 | C2-H-195 row 19 | existing |
| G-H4/G-H5 | ff1c1c596 / 940e3e809 | U-201 / C2-I-089 | parked |
| F11 | 55edf532d | C2-B-042 | CC-287 |
| F12 | 8d5458a4d | C2-H-147 | Example 81 |
| F15 | d50817d46 | C2-H-165 | CC-005 |

Counts: 1,154 clauses unchanged; 994 to 1,016 cases; 161 to 160 active catalog rows; 266 to 268 source upgrade rows; 654 examples unchanged. Parked: four carried rulings, G-H1/F13, G-H4 and G-H5. The four required local gates pass.

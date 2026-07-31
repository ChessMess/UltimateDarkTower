---
'@udtc/engine': patch
'@udtc/schema': patch
'@udtc/creator': patch
---

Retire "raze"/"razed" as a synonym for "destroy"/"destroyed" throughout comments, schema
`$comment` prose, test descriptions, and one user-visible string in the Building Types dialog
("skulls sit on it; the next one destroys it"). No behavior change — `skullCapacity` and the
destroy rule are unchanged, this only standardizes the wording.

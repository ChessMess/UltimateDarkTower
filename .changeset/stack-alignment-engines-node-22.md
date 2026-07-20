---
'ultimatedarktowerrelay-shared': major
'ultimatedarktowerrelay-client': major
'ultimatedarktowerrelay-core': major
'ultimatedarktowerdisplay': major
'ultimatedarktowerdata': major
'ultimatedarktowerboard': major
'ultimatedarktower': major
---

Raise the declared Node floor to `>=22.13.0`.

These packages previously declared `engines.node: ">=18.0.0"`, which was never verified —
the monorepo's own toolchain requires Node >= 22.13 (pnpm 11.9 loads `node:sqlite`) and CI
only ever exercised Node 22 and 24. The claim is now aligned with what is actually built and
tested.

`engines` is advisory by default: npm emits an `EBADENGINE` warning rather than failing the
install unless the consumer has set `engine-strict`. Node 18 reached end of life, and the
compiled output itself is unchanged by this release.

Also corrects `packages/board`'s `three` peer range, which was `^0.170.0` — on a `0.x` line
that resolves to `>=0.170.0 <0.171.0` and could not be satisfied by the `three` version the
package is actually built and tested against. It now matches `packages/display` at
`>=0.185.0`.

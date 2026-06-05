# Troubleshooting

> Scaffold stub.

**`Cannot find module 'ultimatedarktower'` / `ultimatedarktowerdisplay`.** The siblings are
`file:` devDependencies — check them out next to this repo and build them (`npm run build`) so
their `dist/` exists, then `npm install`.

**Two `three` instances / weird 3D behavior.** The host must dedupe `three`. The board declares
the **same** `three` peer range as Display and never bundles it; ensure your app resolves a single
copy (npm `overrides` if needed).

**3D board renders nothing.** Expected in the scaffold — `Board3DPlugin.onModelLoaded` is a
placeholder until Display's `anchorToWorld` + UDT's `BOARD_ANCHORS` ship.

**`npm ci` fails in CI.** Commit `package-lock.json`, and make sure CI checks out the sibling
repos (see `.github/workflows/ci.yml`).

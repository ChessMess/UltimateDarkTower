# UltimateDarkTowerSeed — Seed Decoder

An interactive browser tool for decoding and reverse-engineering **Return to Dark Tower**
game seeds. It decodes the base-34, two-section seed format, compares variant seeds against a
baseline, and renders a per-character bit map to help analyze which characters encode which
setup fields.

**🔗 Live demo: <https://chessmess.github.io/UltimateDarkTowerSeed/>**

This is a single-page app (SPA) built with [Vite](https://vitejs.dev/). It runs entirely in the
browser — no server, no network. Its only runtime dependency is
[`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) (UDT), which provides the
seed-format core (`seed.decodeSeed`, `seed.validateSeed`, `seed.compareSeedsRaw`,
`seed.dumpSeedChars` and the related types under the `seed` namespace, as of UDT v5.0.0).

## Getting started

Requires Node.js >= 18.

```bash
npm install
npm run dev     # starts the dev server on http://localhost:3002
```

No install is needed just to try it — open the [live demo](https://chessmess.github.io/UltimateDarkTowerSeed/).
Run it locally only if you want to develop or modify the tool.

## Using the decoder

Seeds are 12 characters shown as `XXXX-XXXX-XXXX`; the dashes are cosmetic and stripped
automatically, and all characters are lowercase. Try the documented baseline `AA9A-AAGS-W634`.

1. **Create a baseline session.** Under **New Baseline**, paste a seed and record the matching game
   configuration (Source, Difficulty, Expansions, Player Count, Adversary, Ally, and the three foe
   tiers) from the companion app, then click **Create Baseline Session**. The seed is validated as
   you type.
2. **Read the decode.** The **Bit Map** shows all 12 characters with their base-34 values; hover any
   cell for its section (setup vs. RNG) and the field it maps to. The **Baseline Configuration**
   panel echoes the config you recorded for the session.
3. **Add variants to compare.** Change exactly **one** setting in the companion app, enter the new
   seed under **Add Variant**, and pick which field changed. Each variant is compared against the
   baseline and reports how many characters differ; click **Compare** to see the per-character diff
   on the bit map.
4. **Map fields.** Use **Auto-Suggest Mapping** to infer which character indices a field occupies
   from the variants you've collected, or add mappings manually under **Field Mappings**. Mapped
   characters are colored by confidence on the bit map.
5. **Log game events (optional).** After starting a game, record post-start observations (foe
   spawns, dungeons, quests, battles) under **Game Events** to help correlate the RNG-section
   characters (6–11).
6. **Export your work.** **Copy as LLM Prompt** produces a structured analysis prompt of everything
   collected; **Export JSON** / **Import JSON** save and restore the full session state. Sessions
   also persist in the browser's local storage between visits.

> **Note:** the Baseline Configuration panel reflects the values you record in the dropdowns, which
> is metadata kept alongside the seed — it is not re-derived from the decode. The decoded setup
> values are what the Bit Map shows per character.

## Scripts

| Script               | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Vite dev server on port **3002**             |
| `npm run build`      | Production build to `dist/`                  |
| `npm run preview`    | Preview the production build                 |
| `npm run type-check` | Type-check with `tsc --noEmit`               |
| `npm run lint`       | ESLint over `src/`                           |
| `npm run format`     | Format with Prettier                         |
| `npm run clean`      | Remove `dist/`                               |

## Seed format

The reverse-engineered seed format — setup section (chars 0–5, bitwise-encoded) and RNG section
(chars 6–11, base-34 little-endian) — is documented in [SEED_FORMAT.md](SEED_FORMAT.md). The
original design notes are in [plan-seedDecoder.md](plan-seedDecoder.md), and
[seed_func.cs](seed_func.cs) is the C# reference implementation the format was derived from.

Bit-level analysis artifacts live in [`scripts/`](scripts/) (`analyze_bits.py`) and
[`output/`](output/) (CSV stats).

## Deployment

The app deploys to GitHub Pages via
[`.github/workflows/deploy-client.yml`](.github/workflows/deploy-client.yml) on push to `main`.
The build uses `--base=/UltimateDarkTowerSeed/` so assets resolve under the project Pages URL.
Enable GitHub Pages (Settings → Pages → Source: GitHub Actions) for the repo.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the version history.

## License

MIT — see [LICENSE](LICENSE).

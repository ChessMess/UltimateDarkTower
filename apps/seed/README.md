# UltimateDarkTowerSeed — Seed Decoder

An interactive browser tool for decoding and reverse-engineering **Return to Dark Tower**
game seeds. It decodes the base-34, two-section seed format, compares variant seeds against a
baseline, and renders a per-character bit map to help analyze which characters encode which
setup fields.

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

Paste a seed (e.g. the documented baseline `AA9A-AAGS-W634`), create a session, and add variant
seeds to compare. Dashes are cosmetic and stripped automatically.

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

## License

MIT — see [LICENSE](LICENSE).

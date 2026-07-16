# Saving and loading scenarios

The Creator keeps a **scenario library** in your browser, and can **export** a scenario as a single
self-contained `.json` file. The two do different jobs, and the difference matters — see
[Durability](#durability-read-this-one) below.

## Save vs Export

|            | Save                        | Export                                       |
| ---------- | --------------------------- | -------------------------------------------- |
| Goes to    | this browser (IndexedDB)    | a `.json` file you choose where to put       |
| Works when | **always** — errors and all | only when the scenario **validates**         |
| For        | work in progress            | sharing, backup, and loading into the Player |

**Save is never blocked by validation errors.** A half-finished scenario is exactly the thing that
needs saving. Export is gated on validation because it produces the artifact the Player consumes —
an invalid scenario isn't playable, so there's nothing useful to hand over.

**Autosave** runs ~800 ms after you stop editing, but only once a scenario has been saved at least
once — the first save is when you name it. Until then, nothing is persisted.

## The scenario library

**Scenarios…** in the toolbar opens the library: Open, Rename, Duplicate, Delete. Each row shows
when it was last touched, how much art it carries, whether it validates, and when it was last
exported.

Titles are **not** unique. Scenarios are identified internally, so two called "Draft" are two
different scenarios.

## Export → Import creates a NEW scenario

An exported file carries no scenario identity — the schema doesn't allow one (`meta` is
`additionalProperties: false` and has no `id` field). So importing a file always creates a **new**
library entry rather than updating the one it came from, and the first Save after an Import asks for
a name.

This is deliberate: a file is a **copy**. If you export, mail it to someone, and they send back an
edited version, importing it gives you both — the original and theirs — not a silent overwrite.

## Durability (read this one)

**Browser storage is not permanent.** Safari's tracking prevention drops IndexedDB after about seven
days without a visit. Chrome can evict it when the disk is under pressure. Clearing site data wipes
it. None of that is a bug — it's how browsers treat storage a site hasn't earned.

The Creator asks the browser for persistent storage the first time you save, which exempts it from
eviction where the browser agrees. Not every browser agrees, and it never asks twice.

**So: an exported file is the only copy that is actually yours.** The library flags any scenario
that has never been exported, and warns you before deleting one. If a scenario matters, export it.

If a save ever fails, the toolbar shows **⚠ Save failed — export now**. That means storage is full
or restricted. Export immediately; don't keep editing and hope.

## Images and export size

Images are embedded in the scenario as compressed WebP data URLs, so one file always carries
everything it needs — there is no folder of assets to keep alongside it.

The asset manager meters total image size against a **~50 MB budget**, which is about **export
size**: base64 needs no JSON escaping, so those bytes land in the `.json` roughly 1:1 (~50 MB of
budget ≈ a 50 MB file ≈ ~37 MB of actual artwork). Nothing enforces the budget — it's there so you
can see how large the thing you share is getting.

Per-image caps on upload: card art 250 KB, dungeon maps 400 KB, board art 1.5 MB.

## Opening a scenario in the Player

**Open in Player** hands the current scenario straight to the Player with no file round-trip. It
works because both apps are served from the same origin.

**In local development they are not** — the Creator runs on `localhost:5173` and the Player on
`:5174`, which are different origins and therefore have separate storage. Run `pnpm preview:site` to
serve both from one origin the way they're deployed. If the handoff can't find the scenario, the
Player offers the file-import path instead.

## Where things live

- Library: IndexedDB database `udt-scenarios` (stores: `meta`, `docs`, `images`)
- Code: [`packages/scenario-store`](../../packages/scenario-store) — `split.ts` (separating image
  payloads from structure), `scenarioDb.ts` (the storage layer)

Images are stored apart from the document so that autosave writes kilobytes instead of megabytes;
the document you edit, export, and import always has them inline.

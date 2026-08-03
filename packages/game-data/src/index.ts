/**
 * ultimatedarktowerdata — Return to Dark Tower reference data. Zero runtime dependencies,
 * no Bluetooth. Split out of `ultimatedarktower` in v6 (see CHANGELOG): the driver never
 * read this data, but every consumer of it had to load a Node-only BLE stack to get it.
 *
 * Everything is exported flat. Through v2 there was also a `gameContent` sub-namespace, and
 * the reason it existed is worth recording so nobody rebuilds it:
 *
 * It held a second copy of four datasets the flat rosters already covered — heroes, foes,
 * adversaries and companions — each keyed by display name with no `id`, and each strictly
 * poorer than its flat counterpart. Those duplicates were what collided (`Hero`, `HEROES`,
 * `Foe`, `FOES`, `Adversary`), and the namespace was the workaround for the collision. None
 * of them had a single consumer.
 *
 * v3 removed the duplicates instead: the hero gameplay sheet (banner action, virtues) merged
 * into `HEROES`, and the foe/adversary/companion copies were dropped in favour of `FOES`,
 * `ADVERSARY_ROSTER` and `COMPANION_CARDS`. With the collisions gone the namespace had
 * nothing left to protect, so its last member — the kingdom virtues — is now flat in
 * `virtues.ts`. **Two records of one entity is the thing to avoid here, not a name clash.**
 *
 * The card datasets below (`FOE_CARDS`, `MONUMENT_CARDS`, `COMPANION_CARDS`, `TREASURES`,
 * ...) are the printed card faces for entities the rosters above identify. They are keyed by
 * the same ids as those rosters — one entity, two layers, joinable — which is precisely what
 * the old namespace could not do. Provenance is in `docs/spreadsheet-import.md`.
 */
export * from './heroes';
export * from './monuments';
export * from './foes';
export * from './boxInventory';
export * from './board';
export * from './seed';
export * from './constants';
export * from './virtues';

// Card faces and reference data imported from the RtDT research spreadsheets — see
// `docs/spreadsheet-import.md` for provenance and `docs/open-questions.md` for the gaps.
export * from './advantages';
export * from './dungeons';
export * from './caravans';
export * from './foeCards';
export * from './monumentCards';
export * from './companionCards';
export * from './treasures';
export * from './potionsAndGear';
export * from './corruptions';
export * from './questItems';
export * from './quests';
export * from './spells';
export * from './nations';

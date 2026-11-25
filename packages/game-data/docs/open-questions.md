# Open questions in the card data

Gaps in the datasets imported from the RtDT research spreadsheets — see
[`spreadsheet-import.md`](./spreadsheet-import.md) for how the data was gathered and why
these are flagged rather than guessed at.

Rows affected carry `needsReview: true` and a `sourceNote` where the gap is structural.
Everything the source author could answer has been answered and folded in; these need
another play, a card photo, or a word from the designers.

## Caravans

1. **`Heavy Lancers`** — still waiting on it to reappear to confirm it is an East caravan
   room. `route: 'east'` is a best guess.
2. **`Armament Wagon`** — its un-upgraded (initial) text is still unseen; it has only ever
   been drawn with Berat recruited, who auto-upgrades rooms.

## Companions

3. **Grigor** may have an alternate event for the no-foes-on-board case — unconfirmed, needs
   a game with an early Grigor and a clear board.

## Potions & gear

4. Two Expeditions gear cards are still **unnamed** (`name: ''`, ids `unnamed-gear-1` and
   `unnamed-gear-3`). One is expected to grant `+1 Humanoid Advantage`, completing the
   six-advantage gear set. (Gilded Alembic's effect and Aqua Vitae came from the rulebook.)
   The rulebook's component photo shows one more gear card whose name and text aren't
   legible at that size — likely one of these two.

## Board locations

5. **14 of the 60 locations have no dungeon identified.** An active count, not a closed set —
   the source author was at 46/60 on 24 July 2026, which is what this data holds. He suspects
   the real total may be 56 rather than 60; his theory that Sanctuary locations are
   dungeon-free was disproven (two of the four now have one).

   Missing: Archmont, Azkol's Bane, Broken Lands, Greater Tombstones, Green Bridge, Irontops,
   Muted Forest, Pearl of the North, Radiant Mountains, Sands of Madness, The Throne,
   Utar's Barrows, Weeping Waters, Yellowpike.

## Quest items

6. **`Amulet of Annihilation`** and **`Orb of Pure Snow`** are the only two quest items with
   no recorded source. The same gap was raised on BGG in June 2026 and does not appear to
   have been answered.

## Names not verified against the physical cards

Two names where the research spreadsheet and `boxInventory.ts` disagreed and neither source
is authoritative. Both kept the `boxInventory` spelling; a look at the actual cards settles it.

7. **`Blessed Scepters`** — the spreadsheet reads `Blessed Sceptres`. American spelling was
   taken as more likely for a US-published game.
8. **`Scroll of Burning Sands`** — the spreadsheet reads `Scroll of the Burning Sands`, which
   would match the other scrolls (`Scroll of the Great Serpent`, `Scroll of Twilight Shadow`,
   `Scroll of Forged Friendship`).
9. **`Consecrate Arkartus`** — both independent transcriptions read **`Akartus`**, but the
   board location is `Arkartus` in `BOARD_LOCATIONS`. The quest was renamed so its text
   resolves against a real location, but two sources agreeing on `Akartus` is worth checking:
   either both transcribers elided the same `r`, or the board location itself is misspelled.

## Heroes & virtues

10. Three **Expeditions heroes' banner actions** haven't been transcribed, so `bannerAction`
    is absent on them. The rulebook prints only the Grizzled Mariner's verbatim; it
    paraphrases the rest (Tinkerer: gain a gear card from the market; Druid: change the
    terrain of your space until the end of turn; Ascetic: remove a skull up to N spaces away,
    N = your virtue count). Needs the hero boards. Their virtues — and the Expeditions `ALTERNATE_VIRTUES` /
    `ALTERNATE_CHAMPIONS` pools — came from a transcribed "Hero Virtues and Champions" reference
    sheet (Nov 2026), not printed cards; typos (`champiuon`, a stray `+If`) were corrected on
    import. Check all of it against the printed cards.

## For the designers

- Why does **Isa the Exile** have only one trait when every other foe and adversary has two?
  (Justin Jacobson is active in the BGG thread and would know.)
- What does the half-black vs half-grey **virtue tile colouring** signify? Recorded on the
  physical components but not imported — it appeared only in the redundant `bannersAndVirtues`
  sheet, so nothing in this package carries it.

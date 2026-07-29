---
'ultimatedarktowerdigital': minor
---

Gear, treasures, quest items, and companions on the player board are now
dropdowns of the base game's actual card names (from `ultimatedarktowerdata`'s
box inventory) instead of free text. A card already on the board drops out of
its own dropdown, enforcing "one of each" for gear and uniqueness for
count-1 treasure/companion cards; quest items allow duplicates since the box
ships 4 Amulets Of Hope. The stored shape is unchanged (`string[]`), so
sessions saved while these fields were free text still load and render.

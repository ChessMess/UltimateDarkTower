---
'ultimatedarktowerrelay-electron': patch
---

Build the macOS `.dmg` with the system's `hdiutil` (a `postMake` hook) instead of `@electron-forge/maker-dmg`, removing the unpatchable `appdmg` → `image-size` dependency chain. The DMG is now a plain drag-to-Applications image with no styled background or custom volume icon.

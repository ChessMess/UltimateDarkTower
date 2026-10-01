---
'ultimatedarktowerrelay-electron': patch
---

Upgrade to electron-forge 8, which drops the unpatched `extract-zip` from the build toolchain. Fix the packaged app crashing at launch with `Cannot find module 'ultimatedarktower'`: the packaging hook now resolves runtime dependencies Node-style instead of only from the workspace root, and fails the build if a required one is missing. The `publish` script is now `release`, matching forge 8's renamed command.

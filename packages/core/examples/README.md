# Examples

Three example apps shipped with the library. Each one shows a different slice of what you can do with UltimateDarkTower.

| Example                                | Runtime                 | Demonstrates                                              |
| -------------------------------------- | ----------------------- | --------------------------------------------------------- |
| **[Controller](controller/README.md)** | Browser (Web Bluetooth) | Full command surface, BLE diagnostics tab, tower emulator |
| **[Game](game/README.md)**             | Browser (Web Bluetooth) | A complete playable game on top of the library            |
| **[Node CLI](node/README.md)**         | Node.js                 | Minimal command-line driver for the Node adapter          |

For a feature-by-feature breakdown of each example and how to run them, see [docs/EXAMPLES.md](../docs/EXAMPLES.md).

Building all examples for distribution:

```bash
npm run build:examples
```

This bundles each example into `dist/examples/` for the live demo on GitHub Pages.

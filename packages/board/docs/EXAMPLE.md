# Example App

> Scaffold stub. Source: [`example/`](../example).

```bash
npm run dev:example        # serve locally
npm run build:example      # output to example/dist (GitHub Pages artifact)
```

The scaffold demo renders the **headless** board + text readout (zero 3D deps). The 3D path
(`TowerRenderView` + `Board3DPlugin`) is wired but commented out in
[`example/src/main.ts`](../example/src/main.ts) until you supply a tower `modelUrl` and Display's
`anchorToWorld` ships. When you enable it, mirror Display's example Vite config (alias
`ultimatedarktower` to its CJS build + `optimizeDeps.include`).

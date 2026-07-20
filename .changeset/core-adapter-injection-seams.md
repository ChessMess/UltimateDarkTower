---
'ultimatedarktower': minor
---

Add optional dependency-injection parameters to `NodeBluetoothAdapter` and
`BluetoothAdapterFactory.create`.

- `new NodeBluetoothAdapter(nobleImpl?)` — supply a stand-in for the
  `@stoprocent/noble` singleton. A new exported `NobleLike` type describes the
  subset the adapter uses.
- `BluetoothAdapterFactory.create(platform, overrides?)` — supply adapter
  constructors instead of the lazily-required ones. A new exported
  `AdapterConstructorOverrides` type describes the shape.

Both parameters are optional and default to the existing lazy `require()`, so
runtime behaviour is unchanged: production callers construct these exactly as
before, and the Node BLE stack is still never pulled into a browser bundle.

The motivation is testability. Both call sites use a guarded synchronous
`require()` to keep `create()` sync and avoid loading native BLE in browsers.
That is a runtime call, which module mockers operating on the ESM graph cannot
intercept — so injection is now the supported seam for substituting them.

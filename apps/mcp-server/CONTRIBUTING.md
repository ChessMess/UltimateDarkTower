# Contributing to mcp-server-return-to-dark-tower

Thanks for your interest in contributing! This is a hobby project, so keep things fun and low-friction.

## Reporting Issues

Open a [GitHub Issue](../../issues) with:

- Your OS and Node.js version
- Tower firmware version (if applicable)
- Steps to reproduce
- Expected vs. actual behavior
- Any relevant logs (run with `DEBUG=* node dist/index.js` for verbose output)

## Submitting Changes

1. Fork the repo
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes
4. Run `npm run lint` and `npm run build` to verify
5. Commit with a descriptive message
6. Open a Pull Request against `main`

## Code Style

- TypeScript with `strict: true`
- ESLint + Prettier enforced (run `npm run lint`)
- Use the existing patterns in `src/tools/` for adding new MCP tools

## BLE Testing

Most functionality requires a physical Return to Dark Tower tower connected via Bluetooth. If you don't have hardware access, focus on non-BLE changes (game content, schemas, documentation) and note in your PR that BLE testing wasn't possible.

## Questions?

Open an issue — happy to help.

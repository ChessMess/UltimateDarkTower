# Code Quality Review

Run a comprehensive code quality review of this project. Follow each phase in order and report findings at the end.

## Phase 1: Automated Checks

Run the following commands and capture their output. Do not stop on failure — run all of them and collect results:

1. **TypeScript type check:** `npm run typecheck`
2. **ESLint:** `npm run lint`
3. **Tests:** `npm run test`
4. **Build:** `npm run build`

## Phase 2: Manual Code Review

Read all source files in `src/` and `tests/` and evaluate each of the following areas:

### Correctness
- Logic errors, off-by-one mistakes, unhandled edge cases
- Null/undefined access risks not caught by strict mode
- Incorrect or missing type narrowing

### API Design
- Are public exports in `index.ts` intentional and minimal?
- Do interfaces in `types.ts` expose only what consumers need?
- Are method signatures consistent (parameter order, naming, return types)?

### Code Clarity
- Unclear variable or function names
- Functions that do too many things (should be split)
- Dead code, unused imports, or commented-out blocks

### DOM & Rendering
- Missing cleanup of created elements or event listeners
- Potential memory leaks from retained references
- Inefficient DOM manipulation (repeated reflows, unnecessary re-renders)

### Test Quality
- Are critical code paths covered?
- Do tests assert behavior or just "not throwing"?
- Are there missing edge-case tests (empty state, null inputs, boundary values)?
- Do mocks accurately represent the real dependencies?

### Security & Safety
- XSS risks from unescaped user/game-state content inserted into DOM
- Prototype pollution or injection vectors
- Unsafe use of `innerHTML` vs `textContent`

### Package & Build
- Are `peerDependencies`, `exports`, and `files` fields correct?
- Does the build produce valid ESM and CJS output?
- Are dev-only dependencies leaking into the published package?

## Phase 3: Report

Produce a summary with these sections:

```
## Automated Results
| Check      | Status | Notes |
|------------|--------|-------|
| typecheck  | ...    | ...   |
| lint       | ...    | ...   |
| tests      | ...    | ...   |
| build      | ...    | ...   |

## Issues Found
List each issue with:
- **File:line** — description of the issue
- **Severity**: error / warning / nit
- **Suggested fix** (one-liner or code snippet)

## Positive Observations
Note things done well — patterns worth keeping.

## Recommendations
Ranked list of improvements by impact, with effort estimates (small/medium/large).
```

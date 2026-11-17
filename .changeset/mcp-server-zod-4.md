---
'mcp-server-return-to-dark-tower': patch
---

Move to `zod` 4 (fixes GHSA-mrhx-c7xc-m3w5, which has no patched 3.x release). Tool schemas sent to MCP clients change slightly: repeated enums are inlined instead of using `$ref`, and `additionalProperties: false` is no longer advertised. Unknown keys are still stripped and invalid input is still rejected. Validation error messages now read "Invalid input: expected boolean, received object".

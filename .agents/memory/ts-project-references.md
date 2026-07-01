---
name: TS project references need composite
description: Why typecheck fails with TS6306 when an artifact references a workspace lib
---

In this pnpm monorepo, an artifact's `tsconfig.json` uses `references` to point at
workspace libraries under `lib/*`. TypeScript project references require every
referenced project to be a composite project.

**Rule:** any `lib/*` package listed in an artifact's `references` must set
`"composite": true` in its `tsconfig.json` (typically alongside
`"declarationMap": true` and `"emitDeclarationOnly": true`, matching
`lib/api-client-react/tsconfig.json`).

**Why:** without it, `tsc --noEmit` fails with `error TS6306: Referenced project ...
must have setting "composite": true`. Hit when adding `lib/object-storage-web` as a
reference for image uploads.

**How to apply:** when you add a `lib/*` reference to an artifact and typecheck
throws TS6306, add `composite: true` to that lib's tsconfig rather than removing the
reference.

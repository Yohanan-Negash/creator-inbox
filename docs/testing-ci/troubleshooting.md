# Testing + CI Troubleshooting

## `Could not find the "_generated" directory` in convex-test

- **Symptom**: tests fail during Convex harness init.
- **Cause**: `convexTest` cannot discover modules root automatically from test location.
- **Fix**: pass `import.meta.glob("../convex/**/*.ts")` modules into `convexTest(schema, modules)`.

## `import.meta.glob` type errors

- **Symptom**: TypeScript says `glob` does not exist on `ImportMeta`.
- **Cause**: Vite client types not loaded.
- **Fix**: include `vite/client` in `tsconfig.json` `compilerOptions.types` and keep `vite` as dev dependency.

## Tests pass locally but fail in CI

- **Symptom**: CI failures with dependency/version mismatch.
- **Cause**: lockfile drift or non-frozen install behavior.
- **Fix**: run install via `pnpm install --frozen-lockfile` in CI and commit lockfile updates.

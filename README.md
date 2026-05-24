# Codex Blog

Backend-first blog platform built as a TypeScript monorepo with Clean Architecture boundaries.

## Workspace

-   `apps/api` composes the HTTP API and runtime adapters.
-   `apps/web` is reserved for the future frontend boundary.
-   `packages/domain` contains pure business concepts.
-   `packages/application` contains use cases and application ports.
-   `packages/infrastructure` contains Prisma and infrastructure adapters.
-   `packages/contracts` contains shared API schemas and DTO contracts.
-   `packages/config` contains typed runtime configuration.
-   `packages/testing` contains shared test utilities.

## Commands

Install dependencies:

```sh
pnpm install
```

Run local development tasks:

```sh
pnpm dev
```

Build all packages and apps:

```sh
pnpm build
```

Run lint checks:

```sh
pnpm lint
```

Run TypeScript checks:

```sh
pnpm typecheck
```

Run tests:

```sh
pnpm test
```

Generate Prisma client:

```sh
pnpm db:generate
```

Create and apply a development migration:

```sh
pnpm db:migrate:dev
```

Apply existing migrations in deployed environments:

```sh
pnpm db:migrate:deploy
```

## Notes

-   Public API routes are versioned under `/v1`.
-   `GET /v1/health` and `GET /v1/readiness` are available for runtime probes.
-   Media metadata assets are available under `/v1/media` and can be referenced from publishing image blocks via optional `assetId`.
-   Environment variables must be accessed through typed config.
-   Keep business rules in domain or application code and cover branching behavior with unit tests.

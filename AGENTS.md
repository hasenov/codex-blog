# Codex Blog Repository Contract

## Mission

- Build a modern backend-first blog platform with clean architecture and a future-ready frontend boundary.
- Optimize for maintainable, testable, explicit code over short-term speed.

## Non-Negotiables

- TypeScript only.
- `any` is forbidden.
- Clean Architecture boundaries are mandatory.
- SOLID and DRY apply to design decisions, naming, and dependency flow.
- Every business rule must have unit tests.
- Controllers stay thin; use cases and domain models own behavior.

## Architectural Boundaries

- `packages/domain` contains pure business concepts only.
- `packages/application` orchestrates use cases and depends only on `domain`.
- `packages/infrastructure` implements ports and depends on `application` and `domain`.
- `apps/*` compose runtime adapters and may depend on every package, but never hold business logic.
- Domain and application code must not import `express`, `prisma`, database drivers, or transport-specific types.

## Boundary Rules

- Use DTOs and mappers at every boundary crossing.
- Do not leak Prisma models outside infrastructure.
- Do not leak HTTP request or response objects outside controllers and middleware.
- Prefer value objects for ids, slugs, email, and constrained state.

## Testing Rules

- Add unit tests for every domain method, policy, and use case with branching behavior.
- Add integration tests for auth, publishing lifecycle, comment moderation, and permission boundaries.
- Add API tests for validation, guards, and error serialization when endpoints change.

## Runtime and Config

- Environment access goes through typed config only.
- Logging must be structured and include correlation ids where available.
- Public APIs are versioned under `/v1`.
- Backward compatibility matters for contracts once released.

## Coding Standards

- Use **4 spaces** for indentation (not tabs, not 2 spaces).
- Maintain 4-space indentation across all file types (.ts, .json, .md, etc.).

## Persistence and Migrations

- Prisma is the source of truth for relational persistence.
- Schema changes require a migration and updated repository mappings.
- Soft delete is preferred where historical traceability matters.

## Pull Request Checklist

- Business logic covered by unit tests.
- Types, lint, and test suites pass.
- Contracts and docs updated when behavior changes.
- No boundary violations between layers.
- No accidental `any`, implicit side effects, or hidden coupling.

## Workflow & Git
- **Atomic Commits:** Commit after every logically completed task (e.g., after creating a Use Case or fixing a bug).
- **Conventional Commits:** Use `feat:`, `fix:`, `refactor:`, `test:`, `chore:` prefixes for commit messages.
- **Push Policy:** Push changes to the remote repository (`origin`) after every successful task completion or at the end of a session.
- **Branching:** Work in feature branches (e.g., `feat/identity-auth`) and merge to `main` only after verification.
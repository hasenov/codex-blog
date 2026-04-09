# Blog Platform Backend Foundation

## Summary

Собираем `backend-first` monorepo на `Turborepo` с жесткой ставкой на `TypeScript`, `Clean Architecture`, `SOLID`, `DRY`, отсутствие `any`, unit-тесты на всю бизнес-логику и готовность к будущему `Next.js` frontend без переработки домена.  
Продукт в v1: современная blog-platform, а не legacy CMS. Основа: публикации, rich-content, SEO, ревизии, scheduled publishing, полноформатные аккаунты пользователей, комментарии с модерацией, JWT + refresh auth, REST API, Prisma + PostgreSQL, pnpm, расширяемая модульная архитектура.

## Implementation Changes

- Инициализировать `Turborepo` с разделением на `apps/*` и `packages/*`.
- Заложить минимальную структуру:
    - `apps/api`: Express API, composition root, REST controllers, middleware, OpenAPI-ready слой.
    - `apps/web`: placeholder под будущий `Next.js` frontend без реализации UI.
    - `packages/domain`: чистые сущности, value objects, domain services, domain errors, repository contracts.
    - `packages/application`: use cases, DTO, command/query handlers, policy checks, transaction ports.
    - `packages/infrastructure`: Prisma repositories, auth adapters, crypto, token service, clock/id providers, event publishing adapters.
    - `packages/contracts`: Zod-схемы запросов/ответов, shared API types, pagination/filter contracts.
    - `packages/config`: typed env/config loading, feature flags, app config factory.
    - `packages/testing`: test factories, mocks, shared test helpers.
- Архитектурное правило: зависимости только внутрь. `domain` не знает ни про Express, ни про Prisma, ни про PostgreSQL.
- Ввести модульное разбиение backend по bounded contexts:
    - `identity`: users, sessions, roles, permissions, email verification/password reset ready.
    - `publishing`: posts, post revisions, slugs, publication lifecycle, scheduled publish, SEO metadata.
    - `taxonomy`: tags, categories, content classification.
    - `engagement`: comments, moderation status, threaded replies depth-limited.
    - `media`: только backend-ready интерфейсы и metadata модель; бинарное хранилище можно подключить позже.
- Контент поста хранить как `rich-content JSON` с валидируемой схемой блоков через `Zod`; при этом сразу выделить слой renderer-independent DTO, чтобы фронт потом мог интерпретировать контент без привязки к backend.
- Workflow публикации для v1:
    - `draft -> scheduled -> published -> archived`
    - ревизии обязательны
    - publish/unpublish/schedule через отдельные use cases
    - soft delete для постов и комментариев
- Роли v1:
    - `admin`, `editor`, `author`, `reader`
    - readers имеют аккаунты и могут комментировать
    - authors создают/редактируют свои черновики
    - editors/admin управляют публикацией и модерацией
- Auth/security:
    - access token + refresh token
    - server-side хранение refresh sessions с revoke/rotation
    - password hashing через battle-tested library
    - audit-ready security events для логина, refresh, logout, revoke
    - rate limiting, input validation, secure headers, centralized error mapping
- Persistence:
    - Prisma schema с явными enum/status моделями
    - миграции через Prisma
    - запрет протаскивать Prisma types в domain/application
- Observability:
    - structured logging
    - health/readiness endpoints
    - request correlation id
    - базовые metrics/tracing hooks ready, even if full stack подключим позже

## Public APIs / Interfaces

- REST namespace `v1`.
- Auth:
    - `POST /auth/register`
    - `POST /auth/login`
    - `POST /auth/refresh`
    - `POST /auth/logout`
    - `POST /auth/password/forgot`
    - `POST /auth/password/reset`
    - `GET /auth/me`
- Posts:
    - `GET /posts`
    - `GET /posts/:slug`
    - `POST /posts`
    - `PATCH /posts/:id`
    - `POST /posts/:id/publish`
    - `POST /posts/:id/schedule`
    - `POST /posts/:id/unpublish`
    - `GET /posts/:id/revisions`
    - `POST /posts/:id/revisions/:revisionId/restore`
- Taxonomy:
    - `GET/POST/PATCH/DELETE /categories`
    - `GET/POST/PATCH/DELETE /tags`
- Comments:
    - `GET /posts/:slug/comments`
    - `POST /posts/:slug/comments`
    - `PATCH /comments/:id`
    - `POST /comments/:id/moderate`
    - `DELETE /comments/:id`
- Admin/user management:
    - `GET /users`
    - `GET /users/:id`
    - `PATCH /users/:id/role`
    - `PATCH /users/:id/status`
- Базовые shared contracts:
    - cursor pagination
    - filter/sort DTO
    - id/slug/status value objects
    - problem-details style error response
    - Zod-first request/response validation with inferred TS types

## Test Plan

- Unit tests обязательны для каждого use case, policy, domain service, value object и mapper.
- Repository contract tests: общий набор тестов для каждой инфраструктурной реализации репозитория.
- Integration tests для:
    - auth flow
    - post lifecycle
    - revision restore
    - scheduled publish
    - comment moderation
    - permission boundaries
- API tests:
    - request validation
    - auth guards
    - error serialization
    - pagination/filter semantics
- Quality gates:
    - `strict` TypeScript
    - `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
    - ESLint with no-`any`, import boundaries, layering rules
    - coverage gates на critical business logic
    - CI pipeline: typecheck, lint, unit, integration

## Assumptions

- Single-tenant platform в v1.
- Single-language content в v1, но модели не должны мешать добавить i18n позже.
- Frontend не реализуем сейчас, только резервируем место и контракты под `Next.js`.
- Comments в v1 есть, reactions/likes пока не входят.
- Workflow без обязательного review stage, но с ревизиями и scheduled publishing.
- Media storage проектируем через интерфейсы и metadata, фактический provider можно подключить отдельным этапом.

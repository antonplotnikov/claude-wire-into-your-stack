---
name: add-api-route
description: Implement a new HTTP API endpoint in the course-api Express app, either a new resource router or a new method/path on an existing resource, including validation, 400/404 errors, store helpers, tests, and docs/api.md. Use when the user asks to add, create, or implement an API route or endpoint. Do NOT use for refactoring or renaming existing routes, fixing bugs in existing handlers, or documentation-only edits.
---

# Adding an API route

This repo is a small Express 4 app (CommonJS). Follow the patterns below so new
code looks like the existing `routes/users.js` and `routes/health.js`.

## Layout

- `server.js` builds the app, runs `app.use(express.json())`, mounts each router
  under its base path, and exports `app`. It only calls `listen` when run directly.
- `routes/<resource>.js` holds one router per resource. It starts with
  `const router = express.Router();` and ends with `module.exports = router;`.
- `db/store.js` is the only place that holds data. Routes call its helpers and
  never keep state of their own.
- `tests/<resource>.test.js` holds the tests. `docs/api.md` is the API reference.

## Steps for a new resource

1. Create `routes/<resource>.js`, following the shape of `routes/users.js`.
2. Mount it in `server.js`: `const <resource>Router = require('./routes/<resource>');` at the top,
   then `app.use('/<resource>', <resource>Router);` next to the existing `/health` and `/users` lines.
3. Add the data helpers to `db/store.js` and export them. Tests reach the seed
   data through `store.reset()`, so any new collection must also be reset in `seed()`.
4. Add `tests/<resource>.test.js` (see below).
5. Document each endpoint in `docs/api.md`.

## Route conventions

- Put a one-line comment above each handler in the form
  `// GET /users/:id — fetch one user, or 404 if it doesn't exist.`
- Read path params with `Number(req.params.id)` and pass the result to a store helper.
- Read the body with `const { name, email } = req.body;`.
- Validate in the route, before calling the store:
  - missing required fields → `400` with `{ "error": "name and email are required" }`
  - a record that does not exist → `404` with `{ "error": "User not found" }`
- Success codes: `201` for a create (returns the created record), `200` for a read or update.
- Use `return res.status(...).json(...)` in handlers that have an early exit, and `res.json(...)` otherwise.
- Every error response uses the `{ "error": "message" }` shape. Do not add other keys.

Known gap: the current `:id` handlers do not check whether `Number(req.params.id)`
is `NaN` before the lookup. Do not copy that gap. Validate the id in new routes, and
return `400` for a malformed id.

## Store helpers

- Each helper is a plain function that returns the record or `undefined`
  (`getUser`, `updateUser`). The route decides which status to return.
- Create helpers assign `id` from `nextId` and push to the array.
- `store.js` has no delete helper yet. Add one with the same style if a route needs it.

## Tests

- Use Node's built-in runner with `node:test`, `node:assert`, and `supertest`.
- Import the app with `require('../server')`, not by starting a server.
- Start every file with `test.beforeEach(() => store.reset());`.
- Test names follow `METHOD /path does something`, for example
  `PUT /users/:id returns 404 for a missing user`.
- Cover at least the success status and body, plus each error status the route can return.
- Each test uses `async`, `await request(app).<method>(path).send(body)`, and
  `assert.equal` on `res.status` and `res.body`.

## Commands

- `npm test` runs `node --test`.
- `npm run lint` runs ESLint on `server.js routes db tests`. Unused vars are warnings,
  except parameters named `req`, `res`, or `next`.
- `npm run dev` starts the API on port 3000 (or `PORT`).

## Before you finish

- Tests and lint pass.
- `docs/api.md` describes every new or changed endpoint, including its status codes.
- Only the files this change needs are modified. Do not commit unless asked.

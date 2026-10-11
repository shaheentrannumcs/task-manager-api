# Task Manager API

A RESTful API for managing personal tasks, built with **Node.js** and **Express**. Users register, sign in with JWT and manage their own tasks, with filtering, search, pagination and stats.

## Features

- JWT authentication (register, login, `/me`) with bcrypt password hashing
- Full CRUD for tasks, each scoped to the signed-in user
- Filter by status or priority, full-text search, sorting and pagination
- Stats endpoint with counts by status and priority, plus overdue tasks
- Input validation with field-level error messages
- Centralised error handling and consistent JSON errors
- Security headers (Helmet), CORS and request logging
- Integration tests with `node:test` and Supertest

## Tech

Node.js · Express 5 · JSON Web Tokens · bcrypt · Helmet · Supertest

## Getting started

```bash
npm install
cp .env.example .env     # set JWT_SECRET
npm run dev              # http://localhost:3000
npm test
```

## API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | Health check |
| POST | `/api/auth/register` | – | Create an account → `{ user, token }` |
| POST | `/api/auth/login` | – | Sign in → `{ user, token }` |
| GET | `/api/auth/me` | ✔ | Current user |
| GET | `/api/tasks` | ✔ | List tasks (see query params) |
| GET | `/api/tasks/stats` | ✔ | Task statistics |
| POST | `/api/tasks` | ✔ | Create a task |
| GET | `/api/tasks/:id` | ✔ | Get one task |
| PATCH | `/api/tasks/:id` | ✔ | Update a task |
| DELETE | `/api/tasks/:id` | ✔ | Delete a task |

**List query params:** `status` (`todo` · `in_progress` · `done`), `priority` (`low` · `medium` · `high`), `search`, `sort` (`createdAt`, `dueDate`, `priority`, `title`; prefix `-` for descending), `page`, `limit` (max 50).

**Task body:**

```json
{
  "title": "Prepare sprint demo",
  "description": "Slides + live walkthrough",
  "status": "in_progress",
  "priority": "high",
  "dueDate": "2026-11-05"
}
```

### Example

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Shaheen","email":"me@example.com","password":"secret123"}' | jq -r .token)

curl -X POST localhost:3000/api/tasks -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Learn Docker","priority":"high"}'

curl "localhost:3000/api/tasks?status=todo&sort=-priority" -H "Authorization: Bearer $TOKEN"
```

## Project structure

```
src/
  app.js              # Express app factory (used by server and tests)
  server.js           # entry point
  config.js           # env config
  routes/             # auth + task routers
  middleware/         # JWT auth, error handling
  store/memoryStore.js# data layer (in-memory, repository-style)
  validation.js       # request validation
test/                 # integration tests
```

## Roadmap

- Swap the in-memory store for PostgreSQL (the store interface is already repository-shaped)
- Refresh tokens
- OpenAPI/Swagger docs

# Healthcare Appointment Manager

Healthcare Appointment Manager is a production-oriented full-stack assignment for managing appointments, doctor availability, leave, AI visit summaries, notifications, email delivery records, Google Calendar synchronization, background jobs, and medication reminders.

The project is intentionally structured like a handoff-ready engineering codebase rather than a demo. It uses strict TypeScript, layered backend modules, Prisma-backed relational data modeling, centralized validation/error handling, and role-based access control.

## Features

- Patient registration and JWT login with refresh-token rotation.
- Role-based access control for `ADMIN`, `DOCTOR`, and `PATIENT`.
- Admin doctor and patient management.
- Transaction-safe appointment booking, rescheduling, cancellation, and status updates.
- Doctor availability and leave management.
- AI pre-visit and post-visit summaries stored in `LLMSummary`.
- Email delivery attempts persisted in `EmailLog`.
- In-app notifications persisted in `Notification`.
- Google Calendar account connection and appointment event synchronization.
- Durable background job records for AI summaries, email delivery, reminders, and calendar sync.
- Medication reminder creation, scheduling, and status updates.
- Swagger/OpenAPI documentation served by the API.

## Architecture

The backend follows a feature-based layered architecture:

```text
routes -> controllers -> services -> repositories -> Prisma/PostgreSQL
```

Supporting layers provide:

- authentication and authorization middleware;
- Zod request validation;
- centralized `ApplicationError` handling;
- Prisma client configuration;
- Winston logging;
- durable job metadata;
- provider abstractions for replaceable integrations such as calendar sync.

The frontend is a Vite + React + TypeScript application. The shared package contains cross-workspace types/constants.

## Tech Stack

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS

Backend:

- Node.js
- Express
- TypeScript
- Zod
- Winston

Database and infrastructure:

- PostgreSQL
- Prisma ORM
- Redis
- BullMQ dependency foundation

Integrations:

- OpenAI-compatible chat completion endpoint via native `fetch`
- SMTP configuration tracked through email logs
- Google Calendar API via provider abstraction

## Folder Structure

```text
client/                 React frontend
server/
  prisma/               Prisma schema and migrations
  src/
    ai/                 LLM summary generation
    appointments/       Appointment booking lifecycle
    auth/               JWT auth and refresh tokens
    availability/       Doctor availability
    calendar/           Google Calendar provider integration
    common/             API response, pagination, validation helpers
    config/             Environment, Prisma, Redis, logger
    docs/               OpenAPI document and Swagger UI route
    doctors/            Admin doctor management
    email/              Email delivery attempt logging
    jobs/               Durable background job records
    leave/              Doctor leave management
    middleware/         Request context, errors, not-found
    notifications/      Notification persistence service
    patients/           Admin patient management
    reminders/          Medication reminders
shared/                 Shared TypeScript exports
docs/                   Architecture and database design notes
docker/                 Dockerfiles and nginx config
```

## Installation

Prerequisites:

- Node.js 20.19 or newer
- pnpm via Corepack
- PostgreSQL
- Redis

Install dependencies:

```bash
corepack enable
pnpm install
```

## Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Important variables:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `REDIS_URL`: Redis connection string.
- `JWT_SECRET`: access-token signing secret, at least 32 characters.
- `JWT_REFRESH_SECRET`: refresh-token signing secret, at least 32 characters.
- `OPENAI_API_KEY`: optional key for AI summaries.
- `OPENAI_MODEL`: model used for summary generation.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`: email delivery configuration.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: Google OAuth configuration.
- `CLIENT_ORIGIN`: allowed CORS origin for the frontend.
- `VITE_API_URL`: frontend API base URL.

## Database Setup

Generate Prisma Client:

```bash
pnpm --filter @healthcare/server run prisma:generate
```

Run migrations:

```bash
pnpm --filter @healthcare/server run prisma:migrate
```

Seed development data:

```bash
pnpm --filter @healthcare/server run prisma:seed
```

The seed script is idempotent and creates development users, doctors, availability, leave records, and patients.

## Running Locally

Start the full workspace in development mode:

```bash
pnpm run dev
```

Build all packages:

```bash
pnpm run build
```

Run quality checks:

```bash
pnpm run lint
pnpm run typecheck
```

## API Documentation

After starting the server, open:

- Swagger UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/docs/openapi.json`

The API uses a consistent response shape:

```json
{
  "success": true,
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "requestId": "..."
  }
}
```

Protected endpoints require:

```http
Authorization: Bearer <access-token>
```

## Key Design Decisions

### Transaction Safety

Appointment booking and rescheduling use Prisma transactions and the database uniqueness constraint on doctor/start time. The service validates:

- doctor existence and active status;
- patient existence and active status;
- appointment chronology;
- future start time;
- doctor leave conflicts;
- doctor availability boundaries;
- existing slot conflicts.

This makes double-booking prevention a database-backed invariant rather than only an application-level check.

### AI Integration Strategy

AI prompts live outside controllers. Services read symptom submissions or visit/prescription context, call the configured model, and persist outputs in `LLMSummary`. Failures are gracefully recorded as failed summaries so appointment workflows do not collapse when the AI provider is unavailable.

### Email and Notifications

Email delivery attempts are persisted to `EmailLog`; in-app notifications are persisted to `Notification`. Appointment workflows trigger these services as side effects and log failures without rolling back successful appointment transactions.

### Background Job Processing

The `BackgroundJob` model is used as a durable job ledger for AI summaries, email delivery, appointment reminders, calendar synchronization, medication reminders, retries, and operational status tracking. The implementation keeps job state transitions explicit and stores attempts, schedule time, and last error metadata.

### Google Calendar

Calendar integration uses a provider abstraction. The current implementation is Google-specific, but appointment services depend on a calendar service rather than Google API details. OAuth tokens are encrypted before persistence and are never returned in API responses.

### Security

- JWT payloads contain only user id and role.
- Passwords are hashed with bcrypt.
- Refresh tokens are persisted and rotated.
- Password hashes and OAuth tokens are never exposed.
- Zod validates every request body/query/params object used by routes.
- Role-based authorization is centralized and reusable.
- Helmet, CORS, request ids, and centralized error responses are configured globally.

## Future Improvements

- Move background job execution to dedicated worker processes.
- Add automated integration tests for appointment concurrency and leave conflicts.
- Add calendar token refresh support.
- Add retry workers for failed email/calendar jobs.
- Add frontend screens for admin, doctor, patient, and reminder workflows.
- Add deployment-specific observability dashboards.

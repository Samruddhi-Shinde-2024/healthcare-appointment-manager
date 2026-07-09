# Healthcare Appointment Manager

## Project Objective

This repository contains a production-quality Healthcare Appointment & Follow-up Manager built as a software engineering assignment.

The objective is to build maintainable, scalable, secure, and production-ready software—not a prototype or demo.

---

## Tech Stack (Must Not Change)

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

Backend

- Node.js
- Express
- TypeScript

Database

- PostgreSQL
- Prisma ORM

Caching & Queue

- Redis
- BullMQ

Authentication

- JWT
- Role-Based Access Control (Admin, Doctor, Patient)

AI

- OpenAI API for:
  - Pre-visit symptom summary
  - Post-visit patient-friendly summary

Notifications

- Nodemailer
- Google Calendar API

Deployment

- Frontend: Vercel
- Backend: Render
- Database: Neon PostgreSQL
- Redis: Upstash

---

## Architecture Rules

Do NOT replace or redesign the approved architecture.

Do NOT introduce:

- Spring Boot
- Java
- NestJS
- MongoDB
- Firebase
- Supabase
- Next.js

Follow the approved system architecture and database design documents in the `docs/` directory.

---

## Engineering Principles

Always follow:

- SOLID Principles
- Clean Architecture
- Repository Pattern
- Dependency Injection where appropriate
- Feature-based modular structure
- Separation of concerns
- DRY
- KISS

---

## Code Generation Rules

Every generated file must:

- Compile successfully
- Contain no TODOs
- Contain no placeholder implementations
- Use strict TypeScript typing
- Include proper validation
- Include comprehensive error handling
- Follow existing project structure
- Match the approved database schema
- Be production-ready

Never generate pseudo-code.

Never omit required files.

If multiple files are needed, generate all of them.

---

## Database Rules

Always use:

- Prisma ORM
- PostgreSQL

Never change:

- Table names
- Relationships
- Enums
- Booking state model
- Idempotency model
- Audit fields

Never generate SQL that conflicts with the approved schema.

---

## API Rules

Every endpoint must include:

- Validation
- Authentication
- Authorization
- Error handling
- Correct HTTP status codes
- Consistent response format

Never invent APIs that were not requested.

---

## Quality Standards

Assume this project will undergo a professional code review.

Prioritize:

- Readability
- Maintainability
- Scalability
- Security
- Performance
- Reliability

Generate code comparable to what a senior software engineer would submit for production.

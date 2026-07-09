If your goal is to get shortlisted at Unthinkable Solutions, don't build an assignment that simply works. Build one that demonstrates engineering maturity.

After carefully reviewing your assignment requirements, there are several places where almost every student will build a CRUD application, while an experienced engineer will think in terms of distributed systems, concurrency, reliability, failure recovery, and extensibility. The assignment explicitly emphasizes double-booking prevention, leave management, LLM failure handling, background jobs, Google Calendar, notifications, and documentation.

Proposed Tech Stack

Rather than the easiest stack, I'd choose something that is modern but still realistic.

Frontend
React 19
TypeScript
Vite
TailwindCSS
React Router
TanStack Query
React Hook Form
Zod
Axios
Framer Motion (minimal)
Shadcn UI
Backend
Node.js
Express
TypeScript
Prisma ORM
PostgreSQL
Redis
BullMQ
JWT Authentication
Bcrypt
Zod Validation
Winston Logger
Nodemailer / SendGrid
Google Calendar API
OpenAI API
Infrastructure
PostgreSQL
Redis
Docker
Render / Railway
Vercel
GitHub Actions

1. High Level Architecture
   +-------------------+
   | React Frontend |
   +---------+---------+
   |
   HTTPS REST
   |
   +--------v--------+
   | Express API |
   +--------+--------+
   |
   \------------------------------------------
   | | | | |
   | | | | |
   Auth Appointment LLM Notification Calendar
   Module Module Module Module Module
   | | | | |
   \------------------------------------------
   |
   Prisma ORM
   |
   PostgreSQL Database
   |
   \--------------------
   | |
   Redis BullMQ
   | |
   \--------------------
   |
   Background Workers
   |
   -----------------------------------------
   | | |
   Medication Email Retry Calendar Sync
   Reminder
2. Complete Folder Structure
   healthcare-platform/

│
├── client/
│
│ ├── public/
│ ├── src/
│ │
│ ├── api/
│ ├── assets/
│ ├── components/
│ │ ├── common/
│ │ ├── forms/
│ │ ├── layouts/
│ │ ├── tables/
│ │ ├── cards/
│ │ └── calendar/
│ │
│ ├── features/
│ │ ├── auth/
│ │ ├── appointments/
│ │ ├── doctors/
│ │ ├── admin/
│ │ ├── patient/
│ │ └── notifications/
│ │
│ ├── hooks/
│ ├── pages/
│ ├── routes/
│ ├── services/
│ ├── context/
│ ├── utils/
│ ├── constants/
│ ├── types/
│ └── main.tsx
│
├── server/
│
│ ├── prisma/
│ │ schema.prisma
│ │
│ ├── src/
│ │
│ ├── config/
│ ├── controllers/
│ ├── services/
│ ├── repositories/
│ ├── middleware/
│ ├── routes/
│ ├── validators/
│ ├── jobs/
│ ├── workers/
│ ├── integrations/
│ │ google/
│ │ llm/
│ │ email/
│ │
│ ├── events/
│ ├── utils/
│ ├── constants/
│ ├── interfaces/
│ ├── types/
│ ├── logger/
│ ├── app.ts
│ └── server.ts
│
├── docs/
│
├── docker/
│
├── .github/
│
├── docker-compose.yml
├── README.md
└── .env.example 3. Frontend Architecture

Feature-based architecture.

Pages

↓

Feature

↓

Components

↓

React Query

↓

API Layer

↓

Backend

Each feature owns:

UI
API hooks
validation
types
state

No massive component folders.

4. Backend Architecture

Use Layered Clean Architecture

Routes

↓

Controllers

↓

Services

↓

Repositories

↓

Database

Supporting layers

Middleware

Validators

Logger

Queue

External Integrations

Benefits

testable
maintainable
interview-friendly 5. Database Design

Tables

Users

Doctors

Patients

Appointments

Symptoms

LLMSummaries

DoctorLeaves

Notifications

MedicationSchedules

ReminderLogs

CalendarEvents

EmailLogs

RefreshTokens

Relationships

User

1

1

Patient

User

1

1

Doctor

Doctor

1

Many Appointments

Patient

1

Many Appointments

Appointment

1

1 Symptoms

Appointment

1

1 Prescription

Appointment

1

Many Notifications 6. ER Diagram (Mermaid) 7. API List
Authentication
POST /auth/register

POST /auth/login

POST /auth/logout

POST /auth/refresh
Doctors
GET /doctors

GET /doctors/:id

GET /doctors/:id/slots
Appointment
POST /appointments

PUT /appointments/:id

DELETE /appointments/:id

GET /appointments/me
Symptoms
POST /appointments/:id/symptoms
LLM
POST /appointments/:id/pre-summary

POST /appointments/:id/post-summary
Admin
POST /doctor

PUT /doctor

POST /leave

DELETE /leave
Calendar
POST /calendar/connect

DELETE /calendar/disconnect 8. Authentication Flow
Register

↓

Hash Password

↓

Store User

↓

Login

↓

JWT Access Token

↓

Refresh Token

↓

Protected APIs

↓

Middleware

↓

Role Verification 9. Appointment Booking Flow
Search Doctor

↓

Select Slot

↓

Acquire Redis Lock

↓

Check Availability

↓

Create Slot Hold

↓

Submit Symptoms

↓

LLM Summary

↓

Confirm Booking

↓

Commit Transaction

↓

Queue Notifications

↓

Calendar Sync

↓

Return Success 10. Double Booking Prevention Strategy ⭐

This is where you can outperform almost every student.

Use three layers of protection:

Layer 1

Redis Distributed Lock

doctor_42_slot_10AM

Only one request can process the slot at a time.

Layer 2

Database Transaction

BEGIN

Verify slot

Insert Appointment

COMMIT
Layer 3

Unique Constraint

UNIQUE

doctor_id

appointment_date

start_time

Even if Redis fails, the database guarantees no duplicates.

This defense-in-depth strategy directly addresses the assignment's requirement for safe simultaneous booking handling.

11. Slot Hold Strategy

When patient clicks

Book Now

Create

SlotHold

expiry = now + 5 min

Redis TTL automatically expires.

If payment/confirmation isn't completed:

Hold deleted

↓

Slot becomes available

No manual cleanup needed.

12. Doctor Leave Handling

When admin marks leave

Create Leave

↓

Find Future Appointments

↓

Update Appointment Status

↓

Queue Emails

↓

Delete Calendar Events

↓

Notify Patients

No hard deletes.

Status becomes

CancelledByClinic 13. Notification System

Event-driven.

AppointmentCreated

↓

Notification Queue

↓

Email

↓

Calendar

↓

Reminder

↓

In-App Notification

Every notification has retries and audit logs.

14. Medication Reminder System

Doctor writes

Paracetamol

3/day

5 days

Generate

15 reminder jobs

BullMQ executes reminders at scheduled times.

Reminder history is persisted to avoid duplicates.

15. Google Calendar Sync Flow
    OAuth Login

↓

Access Token

↓

Create Calendar Event

↓

Store Event ID

↓

Update Appointment

↓

Update Calendar

↓

Delete Appointment

↓

Delete Calendar Event 16. Email Flow
Booking Created

↓

Queue Email

↓

Worker

↓

SMTP

↓

Success?

↓

Yes → Log Success

↓

No → Retry

↓

Still Failed?

↓

Dead Letter Queue 17. LLM Integration Flow
Symptoms

↓

Prompt Builder

↓

OpenAI

↓

Response Validator

↓

Store Summary

↓

Return to Doctor

If AI fails

Fallback

↓

"No summary available"

↓

Booking still succeeds

This satisfies the requirement that LLM failures must not break the system.

18. Background Job Architecture

Queues

Email Queue

Reminder Queue

Calendar Queue

Retry Queue

Cleanup Queue

Workers consume queues independently.

19. Logging Strategy

Use Winston.

Log Levels

INFO

WARN

ERROR

DEBUG

Include

request ID
user ID
appointment ID
execution time
IP address 20. Error Handling Strategy

Global Error Middleware

ValidationError

↓

400

AuthenticationError

↓

401

Forbidden

↓

403

NotFound

↓

404

Conflict

↓

409

Internal

↓

500

Never expose stack traces.

21. Security Practices
    JWT + Refresh Tokens
    Password hashing (bcrypt)
    Helmet
    CORS
    Rate limiting
    Zod validation
    SQL injection protection via Prisma
    XSS protection
    CSRF protection (if cookies are used)
    Secure HTTP-only cookies for refresh tokens
    Environment secrets only
    Input sanitization
    Audit logging
22. Deployment Architecture
    React

↓

Vercel

↓

HTTPS

↓

Express

↓

Render

↓

PostgreSQL

↓

Neon

↓

Redis

↓

Upstash

Workers deployed separately from the API.

23. Environment Variables
    DATABASE_URL

JWT_SECRET

JWT_REFRESH_SECRET

REDIS_URL

OPENAI_API_KEY

SENDGRID_API_KEY

GOOGLE_CLIENT_ID

GOOGLE_CLIENT_SECRET

GOOGLE_REDIRECT_URI

APP_URL

NODE_ENV

PORT

LOG_LEVEL 24. Git Branch Strategy
main

develop

feature/auth

feature/booking

feature/calendar

feature/llm

feature/email

bugfix/calendar

hotfix/login 25. Git Commit Strategy

Follow Conventional Commits.

feat: implement appointment booking

feat: add google calendar sync

fix: prevent duplicate slot booking

refactor: extract notification service

docs: add deployment guide

test: add booking concurrency tests

chore: configure docker compose 26. Professional README Structure

# Healthcare Appointment & Follow-up Manager

## Overview

## Features

## Architecture

## Tech Stack

## Folder Structure

## Prerequisites

## Installation

## Environment Variables

## Database Setup

## Prisma Migrations

## Running Locally

## Docker Setup

## API Documentation

## Authentication

## Booking Workflow

## Double Booking Prevention

## Slot Hold Mechanism

## Doctor Leave Handling

## LLM Prompt Design

## Google Calendar Setup

## Email Service Configuration

## Background Jobs

## Deployment

## Screenshots

## Future Enhancements

## License

What will make this submission stand out

Beyond meeting the assignment requirements, I'd add a few production-grade touches that interviewers notice immediately:

Optimistic concurrency with Redis locks + database constraints for booking safety.
Idempotency keys on appointment creation to protect against duplicate client retries.
Outbox/event-driven notification pattern so emails and calendar sync remain reliable even if external services fail.
Correlation IDs in logs to trace a request across API, background jobs, email, and calendar operations.
Feature-based frontend architecture and repository-service backend architecture for maintainability.
Dead-letter queue for failed background jobs with retry policies and audit logs.
Comprehensive documentation that explains why architectural decisions were made, not just how.

This architecture not only satisfies every requirement in the assignment—including role-based authentication, concurrency-safe booking, leave handling, LLM integration, notifications, Google Calendar sync, background jobs, and documentation—but also demonstrates the kind of production thinking that reviewers often look for in strong engineering candidates.

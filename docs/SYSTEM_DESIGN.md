# System Design – Healthcare Appointment Manager

## Overview

The Healthcare Appointment Manager is designed as a modular, production-oriented full-stack application that supports patients, doctors, and administrators. The backend follows a layered architecture (Routes → Controllers → Services → Repositories → Prisma/PostgreSQL), while the frontend is built with React, TypeScript, and Vite. The system emphasizes data consistency, security, maintainability, and scalability.

---

## 1. Double-Booking Prevention

The system prevents double-booking using a combination of application-level validation and database transactions.

Before creating or rescheduling an appointment, the backend validates:

- Doctor availability schedule
- Existing active appointments
- Doctor leave records
- Appointment time boundaries
- Appointment duration

Booking and rescheduling operations execute inside Prisma database transactions to ensure atomicity. Slot conflicts are checked before committing the transaction, preventing multiple patients from reserving the same appointment slot even under concurrent requests.

---

## 2. Doctor Leave Conflict Handling

Doctors can define leave periods through the availability management module.

Whenever a patient attempts to book or reschedule an appointment, the system verifies that the selected date and time do not overlap with any active leave record.

If the requested slot falls within a doctor's leave period, the booking request is rejected with an appropriate validation error. This ensures appointments cannot be scheduled while a doctor is unavailable.

---

## 3. Slot Hold Mechanism

The current implementation validates slot availability immediately before confirming the appointment instead of temporarily reserving slots.

A database transaction ensures that the selected slot remains available throughout the booking operation, eliminating race conditions during concurrent requests.

For larger-scale production deployments, this mechanism can be extended using Redis-based temporary slot locking with automatic expiration. This would allow temporary reservation of appointment slots during the booking flow while preventing abandoned reservations from blocking future bookings.

---

## 4. Notification Failure Handling

Notification delivery is intentionally separated from the core appointment transaction.

Appointment booking succeeds independently of external services such as email providers, AI services, or calendar integrations.

The system records:

- Email delivery attempts in the **EmailLog** table
- In-app notifications in the **Notification** table
- Background processing status in the **BackgroundJob** table

If any external integration fails (SMTP, OpenAI, or Google Calendar), the appointment itself remains successfully created while the failure is logged for monitoring and future retry mechanisms.

This approach improves reliability by ensuring that temporary third-party outages do not affect critical healthcare workflows.

---

## Scalability Considerations

The application is designed with extensibility in mind.

Key architectural decisions include:

- Layered architecture separating business logic from persistence.
- Feature-based module organization for maintainability.
- Prisma ORM for type-safe database access.
- Redis-backed background jobs for asynchronous processing.
- Provider abstractions for external integrations (Google Calendar, AI services, Email).
- Stateless JWT authentication suitable for horizontal scaling.
- Role-based authorization for administrators, doctors, and patients.

Future improvements include dedicated BullMQ worker processes, Redis-based slot locking, automated retry strategies, monitoring dashboards, and real-time notifications using WebSockets.

---

## Architecture Summary

```text
                React + Vite Frontend
                        │
                 REST API (Express)
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
 Authentication   Appointment Service   Admin Module
      │                 │                 │
      └─────────────────┼─────────────────┘
                        │
                 Prisma ORM Repository
                        │
                  PostgreSQL Database
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
    OpenAI          Google Calendar      SMTP
      │                 │                 │
      └──────────── Background Jobs ─────┘
                        │
                      Redis
```

---

## Design Goals

The system was designed to:

- Prevent inconsistent appointment scheduling.
- Maintain transactional integrity.
- Separate business logic from infrastructure concerns.
- Handle failures gracefully without affecting critical workflows.
- Support future scalability through modular services and background processing.
- Provide secure access using JWT authentication and role-based authorization.
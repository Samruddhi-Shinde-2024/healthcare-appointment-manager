# Database Schema

The database schema is implemented using Prisma ORM.

Schema Definition

server/prisma/schema.prisma

Main entities:

- User
- PatientProfile
- DoctorProfile
- Appointment
- DoctorAvailability
- DoctorLeave
- Prescription
- LLMSummary
- Notification
- EmailLog
- MedicationReminder
- BackgroundJob

Relationships are defined in:

server/prisma/schema.prisma

Prisma migrations are located in:

server/prisma/migrations/
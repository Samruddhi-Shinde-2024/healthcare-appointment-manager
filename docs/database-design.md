1. Database Philosophy

The database is designed using PostgreSQL with Prisma ORM following a normalized relational model that prioritizes:

Data consistency
ACID compliance
Referential integrity
High concurrency handling
Maintainability
Extensibility
Production readiness

The assignment involves multiple business workflows such as appointment booking, doctor leave management, AI-generated summaries, reminders, notifications, calendar synchronization, and email delivery. Instead of storing unrelated information in large tables, each business capability is modeled as an independent entity with clear ownership and relationships.

The design intentionally avoids unnecessary complexity such as event sourcing, CQRS, or microservice-specific database patterns because they do not provide proportional value for the project. Instead, the focus is on a clean relational model that is easy to understand, implement, and explain during interviews while satisfying the assignment requirements.

2. Entity List

The database contains the following major entities:

Entity Purpose
User Authentication and common profile information
PatientProfile Patient-specific details
DoctorProfile Doctor-specific details
AdminProfile Administrator details
DoctorSpecialization Master list of specializations
DoctorAvailability Weekly working schedule
DoctorLeave Leave management
Appointment Appointment lifecycle
AppointmentIdempotency Duplicate booking prevention
SymptomSubmission Patient symptom form
LLMSummary AI-generated summaries
Prescription Doctor prescription
MedicationReminder Reminder scheduling
Notification In-app notifications
EmailLog Email delivery tracking
CalendarEvent Google Calendar synchronization
AuditLog (optional but recommended) Critical activity history 3. Why Each Entity Exists
User

Acts as the central identity table.

Contains:

login credentials
email
authentication
role

This prevents duplication across patients, doctors, and admins.

PatientProfile

Stores only patient-specific information such as:

date of birth
gender
emergency contact
medical notes (basic)

Separating patient data from authentication follows normalization principles.

DoctorProfile

Stores:

specialization
experience
consultation fee
slot duration
bio

Doctor-specific attributes do not belong in the User table.

AdminProfile

Contains administrator-specific metadata.

Future permissions can be added without affecting doctors or patients.

DoctorSpecialization

Acts as a lookup table.

Examples:

Cardiologist
Dentist
Dermatologist
Neurologist

Avoids repeated specialization names.

DoctorAvailability

Defines recurring weekly schedules.

Example:

Monday

09:00–12:00

14:00–18:00

The appointment engine generates valid slots from these schedules.

DoctorLeave

Stores temporary unavailability.

Examples:

Vacation

Medical leave

Conference

Training

Existing appointments are checked against leave records so affected patients can be notified, matching the assignment requirements.

Appointment

Core business entity.

Stores:

patient
doctor
appointment date
booking status
timestamps

Every booking-related workflow references this table.

AppointmentIdempotency

Stores:

Idempotency Key
Request hash
Appointment reference

Prevents duplicate appointments caused by repeated client requests or retries.

SymptomSubmission

Stores the patient's symptom form before confirmation.

LLM consumes this data to generate the doctor's pre-visit summary.

Keeping raw symptoms separate preserves original user input.

LLMSummary

Stores AI outputs.

Supports two summary types:

Pre-visit
Post-visit

Separating generated content from source data allows regeneration if prompts change.

Prescription

Stores structured clinical information:

medicines
dosage
duration
doctor notes

Independent of AI summaries.

MedicationReminder

Represents scheduled reminders generated from prescriptions.

Background jobs read only this table.

Notification

Tracks system notifications.

Examples:

booking confirmed
cancellation
doctor on leave
reminder

Supports future notification channels.

EmailLog

Tracks outgoing email lifecycle.

Examples:

pending
sent
failed
retry count

Useful for retry jobs and operational monitoring.

CalendarEvent

Maintains synchronization between appointments and Google Calendar.

Stores:

provider event ID
synchronization status
timestamps

Supports update/delete during rescheduling.

AuditLog (Optional)

Stores critical administrative actions.

Examples:

appointment cancelled
doctor updated
leave approved

Useful for traceability without auditing every minor update.

4. Relationships
   Core Relationship Flow
   User
   ├── PatientProfile
   ├── DoctorProfile
   └── AdminProfile

DoctorProfile
├── DoctorAvailability
├── DoctorLeave
└── Appointment

PatientProfile
└── Appointment

Appointment
├── SymptomSubmission
├── LLMSummary
├── Prescription
├── Notification
├── CalendarEvent
├── EmailLog
└── AppointmentIdempotency

Prescription
└── MedicationReminder 5. One-to-One Relationships
Relationship Reason
User → PatientProfile One identity per patient
User → DoctorProfile One identity per doctor
User → AdminProfile One identity per admin
Appointment → SymptomSubmission One symptom form per appointment
Appointment → Prescription One consultation outcome
Appointment → AppointmentIdempotency One successful booking per idempotency key
Appointment → CalendarEvent One calendar event for the appointment (containing attendee information) 6. One-to-Many Relationships
Parent Child
DoctorProfile DoctorAvailability
DoctorProfile DoctorLeave
DoctorProfile Appointment
PatientProfile Appointment
Appointment Notification
Appointment EmailLog
Appointment LLMSummary
Prescription MedicationReminder 7. Many-to-Many Relationships

The design intentionally minimizes many-to-many relationships.

Doctor ↔ Specialization

For this assignment, a doctor is assumed to have one primary specialization.

Relationship:

Specialization
│
│
▼
Many Doctors

If future requirements allow multiple specializations, a junction table (DoctorSpecializationMapping) can be introduced without changing existing business logic.

8. Normalization Decisions

The schema targets Third Normal Form (3NF).

First Normal Form (1NF)
No repeating groups
Atomic values only
Second Normal Form (2NF)
Every non-key attribute depends on the entire primary key
Third Normal Form (3NF)
No transitive dependencies
Profile data separated from authentication
Lookup values stored separately
AI summaries separated from appointments
Notifications separated from appointments
Email history separated from business entities

This minimizes redundancy while keeping queries straightforward.

9. Booking State Model

Appointments follow a controlled lifecycle:

AVAILABLE
│
▼
HELD
│
▼
CONFIRMED
├────────► CANCELLED
├────────► NO_SHOW
├────────► COMPLETED
└────────► EXPIRED
AVAILABLE: Slot can be booked (derived from schedule rather than persisted per slot in most implementations).
HELD: Temporarily reserved while booking completes.
CONFIRMED: Booking finalized.
COMPLETED: Consultation finished.
CANCELLED: Cancelled by patient/admin/doctor.
EXPIRED: Hold expired or booking window elapsed.
NO_SHOW: Patient did not attend.

State transitions should be validated in the service layer to prevent invalid transitions.

10. Idempotency Strategy

Each appointment creation request includes an Idempotency-Key.

The system stores:

idempotency key
requesting user
request fingerprint/hash
resulting appointment

If the same request is received again with the same key and payload, the existing appointment is returned instead of creating a duplicate.

Keys should have an expiration policy (for example, 24 hours) to avoid indefinite storage.

11. Audit Strategy

Every major business table includes:

created_at
updated_at
created_by
updated_by

These fields provide accountability and simplify troubleshooting.

For high-value actions (such as leave creation, appointment cancellation, or profile changes), an optional AuditLog can capture before/after context without overcomplicating the schema.

12. Doctor Availability Model

Availability is modeled as recurring weekly schedules, not individual slots.

Each record defines:

doctor
day of week
start time
end time
slot duration
active flag

Advantages:

avoids storing millions of future slots
supports schedule updates easily
generates candidate slots dynamically 13. Leave Management Model

DoctorLeave contains:

doctor
leave date or date range
reason
status (e.g., ACTIVE, CANCELLED)

When a leave overlaps confirmed appointments:

affected appointments are identified,
notifications are generated,
email jobs are queued,
calendar events are updated or cancelled. 14. Notification Model

Notifications represent user-facing events independent of delivery mechanism.

Typical fields include:

recipient
related appointment (optional)
notification type
status (PENDING, SENT, READ, FAILED)
channel (EMAIL, IN_APP)

Separating notifications from email allows future SMS or push support without redesign.

15. Medication Reminder Model

Reminders are generated from prescriptions rather than entered manually.

Each reminder includes:

prescription reference
patient
scheduled time
status
retry count (if delivery fails)

A scheduled background job processes only pending reminders.

16. Calendar Model

CalendarEvent stores synchronization metadata rather than appointment data itself.

Typical information:

appointment reference
provider (Google Calendar)
external event ID
sync status
last synchronized timestamp

This isolates third-party integration details from core booking data.

17. LLM Summary Model

The system stores AI-generated summaries separately from raw medical input.

Supported summary types:

Pre-visit summary
urgency level
chief complaint
suggested questions
Post-visit summary
patient-friendly explanation
medication schedule
follow-up guidance

Storing generated output separately preserves the original symptom form and clinical notes, enabling regeneration if prompts improve.

18. Email Logging Model

EmailLog records the delivery lifecycle.

Typical states:

PENDING
SENT
FAILED

Additional metadata:

recipient
template type
sent timestamp
failure reason
retry count

This supports reliable retries and operational visibility.

19. Data Integrity Rules

Key integrity constraints include:

Email must be unique per user.
Doctor and patient references are mandatory for appointments.
Appointment end time must be after start time.
Leave periods must have valid date ranges.
Status values should use enums rather than free text.
Foreign keys should enforce referential integrity.
Idempotency keys should be unique within the context of the requesting user.
Calendar event identifiers should be unique for a given provider.
Reminder records must reference an existing prescription.
Cascade rules should be used carefully; business data such as appointments should generally be preserved rather than automatically deleted. 20. Indexing Strategy

Indexes should target the most common query patterns.

Authentication
email (unique)
Doctor Search
specialization
active status
Appointment Booking
doctor + appointment date
patient + appointment date
appointment status
doctor + start time
Leave Management
doctor + leave date
Reminders
scheduled time
status
Notifications
recipient + status
Email Retry
status
next retry time (if implemented)
Calendar Synchronization
external event ID
sync status
Idempotency
user + idempotency key (unique) 21. Transaction Strategy

Critical workflows should execute within database transactions.

Examples:

appointment creation
appointment cancellation
doctor leave processing
rescheduling

A booking transaction should:

validate doctor availability,
verify no overlapping confirmed/held appointment exists,
create or confirm the appointment,
store the idempotency record,
commit atomically.

External operations such as email sending, calendar synchronization, and LLM calls should occur after the transaction commits, with failures handled through retry mechanisms so they do not roll back successful bookings.

22. Double-Booking Prevention

Double-booking is prevented through a combination of:

database transactions,
row-level locking (or equivalent transactional locking strategy),
idempotency keys,
validation against existing HELD and CONFIRMED appointments,
uniqueness constraints where appropriate on doctor/time combinations.

A typical flow is:

Start transaction.
Lock the relevant doctor/time window.
Verify no conflicting appointment exists.
Create the appointment in the HELD or CONFIRMED state (depending on the booking flow).
Store the idempotency record.
Commit.
Trigger asynchronous integrations (email, calendar, LLM).

This approach satisfies the assignment's requirement to handle simultaneous booking attempts safely.

23. Scalability Considerations

The schema is designed to scale without unnecessary complexity.

Key considerations include:

Separate profile tables reduce sparse columns.
Lookup tables eliminate duplicated reference data.
Frequently queried columns are indexed.
Background processing is isolated through reminder, notification, and email log tables.
Third-party integration metadata is isolated from core business entities.
AI-generated content is stored independently from source records.
Availability is modeled as recurring schedules rather than pre-generating large numbers of slots.
The normalized design minimizes update anomalies while remaining straightforward to query.

This provides a solid foundation for the Node.js + Express + TypeScript + Prisma + PostgreSQL stack while remaining maintainable, performant, and aligned with the assignment's focus on booking reliability, notification handling, AI integration, and clean database design.

export const USER_ROLES = ['ADMIN', 'DOCTOR', 'PATIENT'] as const;

export type UserRole = (typeof USER_ROLES)[number];

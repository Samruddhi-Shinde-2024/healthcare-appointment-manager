import { UserRole, type UserRole as PrismaUserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { idParamsSchema, validateRequest } from '../common/validation.js';
import { prisma } from '../config/prisma.js';
import { BackgroundJobsRepository } from '../jobs/repository.js';
import { BackgroundJobsService } from '../jobs/service.js';
import { MedicationRemindersController } from './controller.js';
import { MedicationRemindersRepository } from './repository.js';
import { MedicationRemindersService } from './service.js';
import {
  createMedicationRemindersSchema,
  medicationReminderListQuerySchema,
  updateMedicationReminderStatusSchema,
} from './validation.js';

const medicationRemindersRepository = new MedicationRemindersRepository(prisma);
const backgroundJobsRepository = new BackgroundJobsRepository(prisma);
const backgroundJobsService = new BackgroundJobsService(backgroundJobsRepository);
const medicationRemindersService = new MedicationRemindersService(
  medicationRemindersRepository,
  backgroundJobsService,
);
const medicationRemindersController = new MedicationRemindersController(medicationRemindersService);
const reminderRoles: PrismaUserRole[] = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT];

export const medicationRemindersRouter: ExpressRouter = Router();

medicationRemindersRouter.use(authenticate(), authorize(...reminderRoles));
medicationRemindersRouter.post(
  '/',
  validateRequest({ body: createMedicationRemindersSchema }),
  medicationRemindersController.create,
);
medicationRemindersRouter.get(
  '/',
  validateRequest({ query: medicationReminderListQuerySchema }),
  medicationRemindersController.list,
);
medicationRemindersRouter.patch(
  '/:id/status',
  validateRequest({ params: idParamsSchema, body: updateMedicationReminderStatusSchema }),
  medicationRemindersController.updateStatus,
);
